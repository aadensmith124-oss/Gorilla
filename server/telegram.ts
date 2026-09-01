import { Bot, Context, InlineKeyboard } from "grammy";
import { pool } from "./db.js";
import { log } from "./logger.js";
import { CLAIM_LIMIT_PER_WINDOW, getClaimAccess, remainingClaimSlots } from "./reward-claim-policy.js";
import { MAX_LICENSE_FILE_BYTES, parseLicenseKeyFile } from "./license-key-file.js";
import {
  TELEGRAM_GROUP_ID,
  TELEGRAM_JOIN_URL,
  TELEGRAM_REFERRAL_CREDIT_CENTS,
  creditReferral,
  ensureTelegramReferralSchema,
  formatCredit,
  linkTelegramChat,
} from "./telegram-referrals.js";

const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID     = TELEGRAM_GROUP_ID;
const GROUP_INVITE = TELEGRAM_JOIN_URL;
const TELEGRAM_ADMIN_IDS = new Set(
  (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean),
);
const NAME_KEYWORD = "gorillacc.lol";
const BROADCAST_MAX_CHARS = 1_000;
const BROADCAST_MAX_RECIPIENTS = 500;
const BROADCAST_COOLDOWN_MS = 60_000;
let lastBroadcastAt = 0;

const MD = { parse_mode: "Markdown" as const };

function getMatch(ctx: Context): string {
  return (typeof ctx.match === "string" ? ctx.match : ctx.match?.[0] ?? "").trim();
}

function hasKeyword(ctx: Context): boolean {
  const first = ctx.from?.first_name ?? "";
  const last  = ctx.from?.last_name  ?? "";
  return `${first} ${last}`.toLowerCase().includes(NAME_KEYWORD);
}

async function adminByChatId(chatId: string) {
  return TELEGRAM_ADMIN_IDS.has(chatId)
    ? { id: null, username: "Telegram admin" }
    : null;
}

async function registerTelegramMember(chatId: string, username: string | null) {
  const result = await pool.query(
    `INSERT INTO telegram_chat_members (chat_id, telegram_username)
     VALUES ($1, $2)
     ON CONFLICT (chat_id) DO NOTHING
     RETURNING chat_id`,
    [chatId, username],
  );
  await pool.query(
    "UPDATE telegram_chat_members SET telegram_username = $1 WHERE chat_id = $2",
    [username, chatId],
  );
  return result.rows.length === 1;
}

function getStartReferrer(ctx: Context) {
  const text = String((ctx.message as any)?.text ?? "");
  const match = text.match(/^\/start(?:@\w+)?\s+(ref_\d+)$/i);
  const referrer = match?.[1]?.slice(4) ?? "";
  return /^\d+$/.test(referrer) ? referrer : null;
}

async function rememberIncomingMember(ctx: Context) {
  const chatId = String(ctx.from?.id ?? ctx.chat?.id ?? "");
  if (!chatId) return;
  const pendingReferrer = getStartReferrer(ctx);
  await pool.query(
    `INSERT INTO telegram_chat_members
      (chat_id, telegram_username, pending_referrer_chat_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (chat_id) DO UPDATE
       SET telegram_username = EXCLUDED.telegram_username,
           pending_referrer_chat_id =
             COALESCE(telegram_chat_members.pending_referrer_chat_id,
                      EXCLUDED.pending_referrer_chat_id)`,
    [chatId, ctx.from?.username ?? null, pendingReferrer],
  );
}

async function takePendingReferrer(chatId: string) {
  const result = await pool.query(
    `WITH pending AS (
       SELECT pending_referrer_chat_id
         FROM telegram_chat_members
        WHERE chat_id = $1 AND pending_referrer_chat_id IS NOT NULL
        FOR UPDATE
     )
     UPDATE telegram_chat_members
        SET pending_referrer_chat_id = NULL
       FROM pending
      WHERE telegram_chat_members.chat_id = $1
      RETURNING pending.pending_referrer_chat_id AS referrer_chat_id`,
    [chatId],
  );
  return result.rows[0]?.referrer_chat_id ?? null;
}

async function confirmReferral(referrerChatId: string, referredChatId: string, bot: Bot) {
  if (!referrerChatId || referrerChatId === referredChatId) return false;
  const referrer = await pool.query(
    "SELECT chat_id FROM telegram_chat_members WHERE chat_id = $1 LIMIT 1",
    [referrerChatId],
  );
  if (!referrer.rows[0]) return false;

  const referral = await pool.query(
    `INSERT INTO telegram_chat_referrals (referrer_chat_id, referred_chat_id)
     VALUES ($1, $2)
     ON CONFLICT (referred_chat_id) DO NOTHING
     RETURNING id`,
    [referrerChatId, referredChatId],
  );
  if (!referral.rows[0]) return false;

  await pool.query(
    `INSERT INTO telegram_chat_referral_bonuses (referrer_chat_id, referral_id)
     VALUES ($1, $2)
     ON CONFLICT (referral_id) DO NOTHING`,
    [referrerChatId, referral.rows[0].id],
  );
  const reward = await creditReferral(Number(referral.rows[0].id), referrerChatId);
  bot.api.sendMessage(
    referrerChatId,
    reward.linked
      ? `🎉 Referral confirmed! ${formatCredit(reward.amountCents || TELEGRAM_REFERRAL_CREDIT_CENTS)} store credit was added to your account.`
      : `🎉 Referral confirmed! You earned ${formatCredit(TELEGRAM_REFERRAL_CREDIT_CENTS)} store credit. Link your store account with /link to receive it automatically.`,
    MD,
  ).catch(() => {});
  return true;
}

async function broadcastMessage(ctx: Context, bot: Bot) {
  const chatId = String(ctx.from?.id ?? ctx.chat?.id ?? "");
  const admin = await adminByChatId(chatId);
  if (!admin) {
    await ctx.reply("❌ This command is restricted to authorized bot administrators.", MD);
    return;
  }

  const message = getMatch(ctx);
  if (!message) {
    await ctx.reply(`Usage: \`/broadcast your announcement\`\n\nMaximum ${BROADCAST_MAX_CHARS} characters.`, MD);
    return;
  }
  if (message.length > BROADCAST_MAX_CHARS) {
    await ctx.reply(`❌ Announcement is too long. Keep it under ${BROADCAST_MAX_CHARS} characters.`, MD);
    return;
  }
  if (Date.now() - lastBroadcastAt < BROADCAST_COOLDOWN_MS) {
    await ctx.reply("⏳ Please wait one minute between broadcasts.", MD);
    return;
  }

  const recipients = await pool.query(
    `SELECT chat_id AS telegram_chat_id
     FROM telegram_chat_members
     WHERE chat_id <> $1
     ORDER BY id
     LIMIT $2`,
    [chatId, BROADCAST_MAX_RECIPIENTS],
  );
  if (recipients.rows.length === 0) {
    await ctx.reply("No linked Telegram recipients were found.", MD);
    return;
  }

  lastBroadcastAt = Date.now();
  let delivered = 0;
  for (const recipient of recipients.rows) {
    try {
      await bot.api.sendMessage(
        recipient.telegram_chat_id,
        `📢 Announcement from GorillaCC\n\n${message}`,
      );
      delivered++;
    } catch (error: any) {
      console.error("[telegram] broadcast delivery failed:", error?.message ?? error);
    }
    // Stay below Telegram's sustained broadcast rate limit.
    await new Promise(resolve => setTimeout(resolve, 40));
  }

  await ctx.reply(
    `✅ Broadcast finished.\nDelivered: ${delivered}/${recipients.rows.length}`,
    MD,
  );
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_license_drops (
      id BIGSERIAL PRIMARY KEY,
      license_key TEXT NOT NULL UNIQUE,
      created_by INTEGER REFERENCES users(id),
      created_by_chat_id TEXT,
      claimed_by INTEGER REFERENCES users(id),
      claimed_chat_id TEXT,
      claimed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE telegram_license_drops
    ADD COLUMN IF NOT EXISTS claimed_chat_id TEXT
  `);
  await pool.query(`
    ALTER TABLE telegram_license_drops
    ALTER COLUMN created_by DROP NOT NULL
  `);
  await pool.query(`
    ALTER TABLE telegram_license_drops
    ADD COLUMN IF NOT EXISTS created_by_chat_id TEXT
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS telegram_license_drops_available_idx
    ON telegram_license_drops (id) WHERE claimed_by IS NULL
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_license_claims (
      id BIGSERIAL PRIMARY KEY,
      chat_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      drop_id BIGINT NOT NULL UNIQUE REFERENCES telegram_license_drops(id),
      claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE telegram_license_claims
    ADD COLUMN IF NOT EXISTS chat_id TEXT
  `);
  await pool.query(`
    ALTER TABLE telegram_license_claims
    ALTER COLUMN user_id DROP NOT NULL
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS telegram_license_claims_user_hour_idx
    ON telegram_license_claims (user_id, claimed_at)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS telegram_license_claims_chat_hour_idx
    ON telegram_license_claims (chat_id, claimed_at)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_members (
      chat_id TEXT PRIMARY KEY,
      telegram_username TEXT,
      name_active BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE telegram_chat_members
    ADD COLUMN IF NOT EXISTS name_active BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_referrals (
      id BIGSERIAL PRIMARY KEY,
      referrer_chat_id TEXT NOT NULL,
      referred_chat_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_referral_bonuses (
      id BIGSERIAL PRIMARY KEY,
      referrer_chat_id TEXT NOT NULL,
      referral_id BIGINT NOT NULL UNIQUE REFERENCES telegram_chat_referrals(id),
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE telegram_license_claims
    ADD COLUMN IF NOT EXISTS chat_referral_bonus_id BIGINT REFERENCES telegram_chat_referral_bonuses(id)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_suspensions (
      chat_id TEXT PRIMARY KEY,
      suspended_until TIMESTAMPTZ NOT NULL
    )
  `);
  await ensureTelegramReferralSchema();
}

function botKeyboard() {
  return new InlineKeyboard()
    .text("🎁 Claim a drop", "claim_reward")
    .text("👤 Drop status", "account_status")
    .row()
    .url("📣 Join our group", GROUP_INVITE)
    .row()
    .text("✅ Check membership", "check_join");
}

function joinGateKeyboard() {
  return new InlineKeyboard()
    .url("📣 Join GorillaCC", GROUP_INVITE)
    .row()
    .text("✅ I joined — check", "check_join");
}

async function isGroupMember(ctx: Context) {
  if (!GROUP_ID || !ctx.from?.id) return true;
  const member = await ctx.api.getChatMember(GROUP_ID, ctx.from.id);
  return ["creator", "administrator", "member", "restricted"].includes(member.status);
}

async function sendJoinGate(ctx: Context) {
  await ctx.reply(
    "🔒 Join the GorillaCC group first, then tap the check button to unlock the bot.",
    { reply_markup: joinGateKeyboard() },
  );
}

async function storeLicenseKeys(keys: string[], adminId: number | null, adminChatId: string) {
  const result = await pool.query(
    `INSERT INTO telegram_license_drops (license_key, created_by, created_by_chat_id)
     SELECT DISTINCT drop_value, $2::integer, $3::text
     FROM unnest($1::text[]) AS input(drop_value)
     ON CONFLICT (license_key) DO NOTHING
     RETURNING id`,
    [keys, adminId, adminChatId],
  );
  return { added: result.rowCount ?? 0, skipped: keys.length - (result.rowCount ?? 0) };
}

async function uploadLicenseFile(ctx: Context, bot: Bot) {
  const chatId = String(ctx.from?.id ?? ctx.chat?.id ?? "");
  const admin = await adminByChatId(chatId);
  if (!admin) {
    await ctx.reply("❌ Only authorized bot administrators can upload drops.", MD);
    return;
  }

  const document = (ctx.message as any)?.document;
  const fileName = String(document?.file_name ?? "").toLowerCase();
  if (!document || !(/\.(txt|csv)$/).test(fileName)) {
    await ctx.reply("❌ Upload a .txt or .csv file with one drop per line.", MD);
    return;
  }
  if (Number(document.file_size ?? 0) > MAX_LICENSE_FILE_BYTES) {
    await ctx.reply("❌ Drop files must be 5 MB or smaller.", MD);
    return;
  }

  try {
    const file = await bot.api.getFile(document.file_id);
    if (!file.file_path) throw new Error("Telegram did not provide a file path");
    const download = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`);
    if (!download.ok) throw new Error("Could not download the uploaded file");
    const keys = parseLicenseKeyFile(await download.text());
    const result = await storeLicenseKeys(keys, admin.id, chatId);
    await ctx.reply(
      `✅ Drop queue updated.\n\nAdded: *${result.added}*\nSkipped duplicates: *${result.skipped}*\n\nUsers can claim one queued drop with /claim.`,
      MD,
    );
  } catch (error: any) {
    console.error("[telegram] drop upload failed:", error?.message ?? error);
    await ctx.reply(`❌ Upload failed: ${error?.message ?? "Invalid drop file"}`);
  }
}

async function claimLicenseKey(chatId: string, userId: number | null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize each chat's claims so rapid taps cannot bypass the 24-hour limit.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`license-claim:${chatId}`]);
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM telegram_license_claims
        WHERE chat_id = $1
         AND claimed_at >= NOW() - INTERVAL '24 hours'`,
      [chatId],
    );
    const used = Number(countResult.rows[0]?.count ?? 0);
    const bonusCountResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM telegram_chat_referral_bonuses
       WHERE referrer_chat_id = $1 AND used_at IS NULL`,
      [chatId],
    );
    const bonusCount = Number(bonusCountResult.rows[0]?.count ?? 0);
    const allowance = CLAIM_LIMIT_PER_WINDOW + bonusCount;
    if (used >= allowance) {
      await client.query("COMMIT");
      return { ok: false as const, reason: "limit" as const, used, remaining: 0 };
    }

    const drop = await client.query(
      `SELECT id, license_key
       FROM telegram_license_drops
       WHERE claimed_by IS NULL AND claimed_chat_id IS NULL
       ORDER BY id
       FOR UPDATE SKIP LOCKED
       LIMIT 1`,
    );
    if (!drop.rows[0]) {
      await client.query("COMMIT");
      return { ok: false as const, reason: "empty" as const, used, remaining: Math.max(0, allowance - used) };
    }
    let referralBonusId: number | null = null;
    if (used >= CLAIM_LIMIT_PER_WINDOW) {
      const bonus = await client.query(
        `SELECT id
          FROM telegram_chat_referral_bonuses
          WHERE referrer_chat_id = $1 AND used_at IS NULL
         ORDER BY id
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
        [chatId],
      );
      if (!bonus.rows[0]) {
        await client.query("COMMIT");
        return { ok: false as const, reason: "limit" as const, used, remaining: 0 };
      }
      referralBonusId = bonus.rows[0].id;
      await client.query(
        "UPDATE telegram_chat_referral_bonuses SET used_at = NOW() WHERE id = $1",
        [referralBonusId],
      );
    }
    await client.query(
      "UPDATE telegram_license_drops SET claimed_by = $1, claimed_chat_id = $2, claimed_at = NOW() WHERE id = $3",
      [userId, chatId, drop.rows[0].id],
    );
    await client.query(
      `INSERT INTO telegram_license_claims (chat_id, user_id, drop_id, chat_referral_bonus_id)
       VALUES ($1, $2, $3, $4)`,
      [chatId, userId, drop.rows[0].id, referralBonusId],
    );
    await client.query("COMMIT");
    return {
      ok: true as const,
      licenseKey: drop.rows[0].license_key,
      used: used + 1,
      remaining: Math.max(0, allowance - used - 1),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function claimsInLast24Hours(chatId: string) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM telegram_license_claims
     WHERE chat_id = $1
       AND claimed_at >= NOW() - INTERVAL '24 hours'`,
    [chatId],
  );
  const used = Number(result.rows[0]?.count ?? 0);
  const bonusResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM telegram_chat_referral_bonuses
     WHERE referrer_chat_id = $1 AND used_at IS NULL`,
    [chatId],
  );
  const allowance = CLAIM_LIMIT_PER_WINDOW + Number(bonusResult.rows[0]?.count ?? 0);
  return { used, remaining: Math.max(0, allowance - used), allowance };
}

async function sendStatus(ctx: Context) {
  const chatId = String(ctx.from?.id ?? ctx.chat?.id ?? "");
  const nameOk = hasKeyword(ctx);
  const claims = await claimsInLast24Hours(chatId);
  const stock = await pool.query(
    "SELECT COUNT(*)::int AS count FROM telegram_license_drops WHERE claimed_by IS NULL AND claimed_chat_id IS NULL",
  );
  const availableDrops = Number(stock.rows[0]?.count ?? 0);
  const suspension = await pool.query(
    "SELECT suspended_until FROM telegram_suspensions WHERE chat_id = $1 AND suspended_until > NOW()",
    [chatId],
  );
  const suspendedUntil = suspension.rows[0]?.suspended_until
    ? new Date(suspension.rows[0].suspended_until).toISOString().replace(".000Z", " UTC")
    : null;
  const access = getClaimAccess({
    hasRequiredName: nameOk,
    suspendedUntil: suspension.rows[0]?.suspended_until
      ? new Date(suspension.rows[0].suspended_until)
      : null,
  });
  const accessLine = access.allowed
    ? "✅ Active — your display name includes the required keyword"
    : access.reason === "suspended"
      ? `⛔ Suspended until *${suspendedUntil}*`
      : `⚠️ Add *${NAME_KEYWORD}* to your first or last name`;

  await ctx.reply(
    `👤 *Your GorillaCC Drops Status*\n\n` +
    `Access: ${accessLine}\n` +
    `🎁 Claims in the last 24 hours: *${claims.used}/${claims.allowance} used*\n` +
    `Claims remaining: *${claims.remaining}*\n` +
    `Drops currently available: *${availableDrops}*`,
    { ...MD, reply_markup: botKeyboard() },
  );
}

async function sendClaim(ctx: Context) {
  const chatId = String(ctx.from?.id ?? ctx.chat?.id ?? "");
  const suspension = await pool.query(
    "SELECT suspended_until FROM telegram_suspensions WHERE chat_id = $1 AND suspended_until > NOW()",
    [chatId],
  );
  const access = getClaimAccess({
    hasRequiredName: hasKeyword(ctx),
    suspendedUntil: suspension.rows[0]?.suspended_until
      ? new Date(suspension.rows[0].suspended_until)
      : null,
  });
  if (!access.allowed && access.reason === "suspended") {
    const until = new Date(suspension.rows[0].suspended_until).toISOString().replace(".000Z", " UTC");
    await ctx.reply(
      `⛔ *Access suspended*\n\nYour claim access is suspended until *${until}* because *${NAME_KEYWORD}* was removed from your name.`,
      { ...MD, reply_markup: botKeyboard() },
    );
    return;
  }
  if (!access.allowed && access.reason === "inactive_name") {
    await ctx.reply(
      `⚠️ Access is inactive.\n\nAdd *${NAME_KEYWORD}* to your Telegram first or last name, then try /claim again.`,
      { ...MD, reply_markup: botKeyboard() },
    );
    return;
  }
  const result = await claimLicenseKey(chatId, null);
  if (!result.ok) {
    if (result.reason === "empty") {
      await ctx.reply(
        "📭 There are no drops available right now. Please check back later.",
        { ...MD, reply_markup: botKeyboard() },
      );
      return;
    }
    await ctx.reply(
      `⏳ Your 24-hour claim allowance is used.\n\n` +
      `Claims remaining: *0/${CLAIM_LIMIT_PER_WINDOW}*\n` +
      `Try again after 24 hours.`,
      { ...MD, reply_markup: botKeyboard() },
    );
    return;
  }

  await ctx.reply(
    `🎁 Your drop:\n\n${result.licenseKey}\n\n` +
    `Claims remaining in the last 24 hours: ${result.remaining}`,
    { reply_markup: botKeyboard() },
  );
}

/** Keep drop claim eligibility in sync with the required display name. */
async function handleNameCheck(ctx: Context): Promise<void> {
  const chatId = String(ctx.from?.id ?? ctx.chat?.id ?? "");
  if (!chatId) return;

  const nowHas  = hasKeyword(ctx);
  const member = await pool.query(
    `INSERT INTO telegram_chat_members (chat_id, telegram_username, name_active)
     VALUES ($1, $2, $3)
     ON CONFLICT (chat_id) DO UPDATE SET telegram_username = EXCLUDED.telegram_username
     RETURNING name_active`,
    [chatId, ctx.from?.username ?? null, nowHas],
  );
  const hadBefore = member.rows[0]?.name_active === true;

  // ── State changed: added keyword ──────────────────────────────────────────
  if (nowHas && !hadBefore) {
    await pool.query(
      "UPDATE telegram_chat_members SET name_active = TRUE WHERE chat_id = $1",
      [chatId]
    );
    await ctx.reply(
      `✅ Name change detected — you can now claim queued drops.\n\n` +
      `Keep *${NAME_KEYWORD}* in your Telegram name to keep claim access active.`,
      MD
    );
    return;
  }

  // ── State changed: removed keyword ───────────────────────────────────────
  if (!nowHas && hadBefore) {
    await pool.query(
      "UPDATE telegram_chat_members SET name_active = FALSE WHERE chat_id = $1",
      [chatId]
    );
    await pool.query(
      `INSERT INTO telegram_suspensions (chat_id, suspended_until)
       VALUES ($1, NOW() + INTERVAL '3 days')
       ON CONFLICT (chat_id) DO UPDATE SET suspended_until = EXCLUDED.suspended_until`,
      [chatId],
    );
    await ctx.reply(
      `⚠️ Name change detected — you removed *${NAME_KEYWORD}* from your name.\n\n` +
      `Access is suspended for 3 days. Add it back after the suspension ends to use claims again.`,
      MD
    );
    return;
  }

}

function createTelegramBot() {
  if (!BOT_TOKEN) {
    return null;
  }

  const bot = new Bot(BOT_TOKEN);
  bot.api.setMyCommands([
    { command: "start", description: "Open the drops menu" },
    { command: "claim", description: "Claim one queued drop per 24 hours" },
    { command: "status", description: "View access and claim status" },
    { command: "ref", description: "Get your referral link" },
    { command: "broadcast", description: "Send an admin announcement" },
    { command: "help", description: "Show bot help" },
  ]).catch((err: any) => console.error("[telegram] command menu setup failed:", err?.message ?? err));

  // Ensure schema before any handler can read or write drop/referral data.
  const schemaReady = ensureSchema().catch(err => {
    console.error("[telegram] schema migration failed:", err?.message)
  });

  bot.use(async (_ctx, next) => {
    await schemaReady;
    return next();
  });

  bot.use(async (ctx, next) => {
    await rememberIncomingMember(ctx);
    return next();
  });

  /* ── Group-membership gate ─────────────────────────────────────────────── */
  bot.use(async (ctx, next) => {
    if (!GROUP_ID) return next();

    const userId = ctx.from?.id;
    if (!userId) return next();
    if (ctx.callbackQuery?.data === "check_join") return next();

    try {
      if (!(await isGroupMember(ctx))) {
        await sendJoinGate(ctx);
        return;
      }
    } catch (err: any) {
      console.error("[telegram] membership check failed:", err?.message ?? err);
      await sendJoinGate(ctx);
      return;
    }

    return next();
  });

  /* ── Name-change detection middleware (runs after gate, before commands) ── */
  bot.use(async (ctx, next) => {
    // Run name check silently (don't block the command)
    handleNameCheck(ctx).catch(err =>
      console.error("[telegram] name check error:", err?.message)
    );
    return next();
  });

  /* ── /start ───────────────────────────────────────────────────────────── */
  bot.command("start", async (ctx: Context) => {
    const chatId = String(ctx.chat!.id);
    await registerTelegramMember(chatId, ctx.from?.username ?? null);
    const referrerChatId = await takePendingReferrer(chatId);
    if (referrerChatId) {
      await confirmReferral(referrerChatId, chatId, bot);
    }

    await ctx.reply(
      `👋 Welcome to the *GorillaCC* drops bot!\n\n` +
      `*How to get started:*\n` +
      `1. Add *${NAME_KEYWORD}* to your Telegram display name\n` +
      `2. Use /claim when drops are available\n` +
      `3. Use /ref to invite a friend for ${formatCredit(TELEGRAM_REFERRAL_CREDIT_CENTS)} store credit`,
      { ...MD, reply_markup: botKeyboard() }
    );
  });

  /* ── /claim ────────────────────────────────────────────────────────────── */
  bot.command("claim", async (ctx: Context) => {
    await sendClaim(ctx);
  });

  /* ── /status ───────────────────────────────────────────────────────────── */
  bot.command("status", async (ctx: Context) => {
    await sendStatus(ctx);
  });

  /* ── Inline button callbacks ────────────────────────────────────────────── */
  bot.callbackQuery("claim_reward", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendClaim(ctx);
  });

  bot.callbackQuery("account_status", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendStatus(ctx);
  });

  bot.callbackQuery("check_join", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (GROUP_ID) {
      try {
        if (!(await isGroupMember(ctx))) {
          await sendJoinGate(ctx);
          return;
        }
      } catch {
        await sendJoinGate(ctx);
        return;
      }
    }
    await ctx.reply("✅ Membership confirmed. Send /start to open the bot menu.", {
      ...MD,
      reply_markup: botKeyboard(),
    });
  });

  /* ── Admin drop file upload ─────────────────────────────────────────────── */
  bot.on("message:document", async (ctx) => {
    await uploadLicenseFile(ctx, bot);
  });

  /* ── /broadcast MESSAGE (admin only) ───────────────────────────────────── */
  bot.command("broadcast", async (ctx: Context) => {
    await broadcastMessage(ctx, bot);
  });

  /* ── /ref ─────────────────────────────────────────────────────────────── */
  bot.command("ref", async (ctx: Context) => {
    const chatId = String(ctx.chat!.id);
    await registerTelegramMember(chatId, ctx.from?.username ?? null);
    const botInfo = await bot.api.getMe();
    const refLink = `https://t.me/${botInfo.username}?start=ref_${chatId}`;
    await ctx.reply(
      `🔗 Your referral link:\n${refLink}\n\n` +
      `When a new user joins the group and starts the bot through this link, you receive ${formatCredit(TELEGRAM_REFERRAL_CREDIT_CENTS)} store credit.\n\n` +
      `Link your store account with /link TOKEN so rewards are added automatically.`,
    );
  });

  bot.command("link", async (ctx: Context) => {
    const chatId = String(ctx.chat!.id);
    await registerTelegramMember(chatId, ctx.from?.username ?? null);
    const token = getMatch(ctx);
    if (!token) {
      await ctx.reply(
        "Usage: /link TOKEN\n\nGenerate a one-time token from your store account's Telegram Rewards panel.",
        MD,
      );
      return;
    }
    const result = await linkTelegramChat(chatId, token, ctx.from?.username ?? null);
    if (!result.ok) {
      const message = result.reason === "account_already_linked"
        ? "That store account is already linked to a different Telegram account."
        : result.reason === "chat_already_linked"
          ? "This Telegram account is already linked to a different store account."
          : "That link token is invalid or expired. Generate a new one from the store.";
      await ctx.reply(`❌ ${message}`, MD);
      return;
    }
    await ctx.reply(
      result.amountCents > 0
        ? `✅ Store account linked. ${formatCredit(result.amountCents)} in pending referral credit was added to your balance.`
        : "✅ Store account linked. Future referral rewards will be added automatically.",
      { ...MD, reply_markup: botKeyboard() },
    );
  });

  bot.command("balance", async (ctx: Context) => {
    const link = await pool.query(
      `SELECT u.balance
         FROM telegram_store_links l
         JOIN users u ON u.id = l.user_id
        WHERE l.chat_id = $1`,
      [String(ctx.chat!.id)],
    );
    if (!link.rows[0]) {
      await ctx.reply(
        "Your Telegram account is not linked yet. Generate a token in the store's Telegram Rewards panel, then use /link TOKEN.",
        MD,
      );
      return;
    }
    await ctx.reply(`💳 Store balance: ${formatCredit(Number(link.rows[0].balance))}`, MD);
  });

  /* ── /help ────────────────────────────────────────────────────────────── */
  bot.command("help", async (ctx: Context) => {
    await ctx.reply(
      `*GorillaCC Drops Bot*\n\n` +
      `/claim — Get one queued drop per 24 hours\n` +
      `/status — View access and claim status\n` +
      `/ref — Get a referral link for store credit\n` +
      `/link TOKEN — Link your store account for automatic credit\n` +
      `/balance — View your store balance\n` +
      `/broadcast message — Admin-only announcement to bot users\n` +
      `/help — Show this message\n\n` +
      `💡 Add *${NAME_KEYWORD}* to your Telegram name to activate drop claims.\n\n` +
      `Admins: upload a .txt or .csv file directly to this bot. Each non-empty line becomes one queued drop.`,
      { ...MD, reply_markup: botKeyboard() }
    );
  });

  bot.catch((err) => {
    console.error("[telegram] error:", err.message);
  });

  return bot;
}

export function startTelegramBot() {
  const bot = createTelegramBot();
  if (!bot) {
    log("TELEGRAM_BOT_TOKEN not set — bot disabled", "telegram");
    return null;
  }

  // Start long polling — wrapped so a bad token doesn't crash the server.
  log("Starting Telegram bot (long polling)", "telegram");
  bot.start({
    onStart: () => log("Telegram bot started (long polling)", "telegram"),
  }).catch((err: any) => {
    console.error("[telegram] bot failed to start:", err?.message ?? err);
  });

  return bot;
}
