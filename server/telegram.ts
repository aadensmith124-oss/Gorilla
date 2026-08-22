import { Bot, Context, InlineKeyboard } from "grammy";
import { pool } from "./db";
import { log } from "./index";
import { randomBytes } from "crypto";

const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID     = process.env.Telegram_group_id;
const GROUP_INVITE = "https://t.me/+L4RV2JFJNz45ZGYx";
const SITE_URL     = process.env.SITE_URL || "https://unitedcards.lol";
// The bot shares a container with the Express server, so it reaches it over
// localhost. Derive the port from PORT (the same value index.ts listens on),
// with LOCAL_API_URL as an optional full-URL override.
const LOCAL_API    = process.env.LOCAL_API_URL || `http://localhost:${process.env.PORT || "5000"}`;
const DAILY_REWARD_CENTS  = 200; // $2.00
const REFERRAL_BONUS_CENTS = 100; // $1.00
const NAME_KEYWORD = "unitedcards.lol";
const CLAIM_REWARD_CENTS = 100; // $1.00 store credit code
const CLAIM_LIMIT_PER_HOUR = 1;

const MD = { parse_mode: "Markdown" as const };

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function isToday(date: Date | null | undefined): boolean {
  if (!date) return false;
  const d   = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth()    &&
    d.getDate()     === now.getDate()
  );
}

function getMatch(ctx: Context): string {
  return (typeof ctx.match === "string" ? ctx.match : ctx.match?.[0] ?? "").trim();
}

function hasKeyword(ctx: Context): boolean {
  const first = ctx.from?.first_name ?? "";
  const last  = ctx.from?.last_name  ?? "";
  return `${first} ${last}`.toLowerCase().includes(NAME_KEYWORD);
}

async function userByChatId(chatId: string) {
  const r = await pool.query(
    "SELECT * FROM users WHERE telegram_chat_id = $1 LIMIT 1",
    [chatId]
  );
  return r.rows[0] ?? null;
}

/** Ensure the telegram_name_active column exists */
async function ensureSchema() {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS telegram_name_active BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_claims (
      id BIGSERIAL PRIMARY KEY,
      chat_id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      code TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE telegram_claims
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS telegram_claims_chat_hour_idx
    ON telegram_claims (chat_id, created_at)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_suspensions (
      chat_id TEXT PRIMARY KEY,
      suspended_until TIMESTAMPTZ NOT NULL
    )
  `);
}

function botKeyboard() {
  return new InlineKeyboard()
    .text("🎁 Claim a reward code", "claim_reward")
    .text("👤 Account status", "account_status")
    .row()
    .url("📣 Join our channel", GROUP_INVITE);
}

async function claimRewardCode(chatId: string, userId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize claims for this chat so two rapid taps cannot bypass the limit.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [chatId]);
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM telegram_claims
       WHERE chat_id = $1 AND created_at >= date_trunc('hour', NOW())`,
      [chatId],
    );
    const used = Number(countResult.rows[0]?.count ?? 0);
    if (used >= CLAIM_LIMIT_PER_HOUR) {
      await client.query("COMMIT");
      return { ok: false as const, used, remaining: 0 };
    }

    const code = `GIFT-${randomBytes(9).toString("hex").toUpperCase()}`;
    await client.query(
      "INSERT INTO redeem_codes (code, amount) VALUES ($1, $2)",
      [code, CLAIM_REWARD_CENTS],
    );
    await client.query(
      "INSERT INTO telegram_claims (chat_id, user_id, code) VALUES ($1, $2, $3)",
      [chatId, userId, code],
    );
    await client.query("COMMIT");
    return { ok: true as const, code, used: used + 1, remaining: CLAIM_LIMIT_PER_HOUR - used - 1 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function claimsThisHour(chatId: string) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM telegram_claims
     WHERE chat_id = $1 AND created_at >= date_trunc('hour', NOW())`,
    [chatId],
  );
  const used = Number(result.rows[0]?.count ?? 0);
  return { used, remaining: Math.max(0, CLAIM_LIMIT_PER_HOUR - used) };
}

async function sendStatus(ctx: Context) {
  const chatId = String(ctx.from?.id ?? ctx.chat?.id ?? "");
  const user = await userByChatId(chatId);
  const nameOk = hasKeyword(ctx);
  const claims = await claimsThisHour(chatId);
  const suspension = await pool.query(
    "SELECT suspended_until FROM telegram_suspensions WHERE chat_id = $1 AND suspended_until > NOW()",
    [chatId],
  );
  const suspendedUntil = suspension.rows[0]?.suspended_until
    ? new Date(suspension.rows[0].suspended_until).toISOString().replace(".000Z", " UTC")
    : null;
  const accountLine = user
    ? `✅ Linked as *${user.username}*`
    : "⚪ No store account linked";
  const accessLine = suspendedUntil
    ? `⛔ Suspended until *${suspendedUntil}*`
    : nameOk
      ? "✅ Active — your display name includes the required keyword"
      : `⚠️ Add *${NAME_KEYWORD}* to your first or last name`;

  await ctx.reply(
    `👤 *Your Unitedcards Rewards Status*\n\n` +
    `Access: ${accessLine}\n` +
    `${accountLine}\n\n` +
    `🎁 Claims this UTC hour: *${claims.used}/${CLAIM_LIMIT_PER_HOUR} used*\n` +
    `Claims remaining: *${claims.remaining}*\n` +
    `Reward value: *${fmt(CLAIM_REWARD_CENTS)} store credit*`,
    { ...MD, reply_markup: botKeyboard() },
  );
}

async function sendClaim(ctx: Context) {
  const chatId = String(ctx.from?.id ?? ctx.chat?.id ?? "");
  const suspension = await pool.query(
    "SELECT suspended_until FROM telegram_suspensions WHERE chat_id = $1 AND suspended_until > NOW()",
    [chatId],
  );
  if (suspension.rows[0]?.suspended_until) {
    const until = new Date(suspension.rows[0].suspended_until).toISOString().replace(".000Z", " UTC");
    await ctx.reply(
      `⛔ *Access suspended*\n\nYour claim access is suspended until *${until}* because *${NAME_KEYWORD}* was removed from your name.`,
      { ...MD, reply_markup: botKeyboard() },
    );
    return;
  }
  if (!hasKeyword(ctx)) {
    await ctx.reply(
      `⚠️ Access is inactive.\n\nAdd *${NAME_KEYWORD}* to your Telegram first or last name, then try /claim again.`,
      { ...MD, reply_markup: botKeyboard() },
    );
    return;
  }

  const user = await userByChatId(chatId);
  if (!user) {
    await ctx.reply(
      "🔗 Link your store account before claiming a reward. Generate a link token from your profile, then send `/link YOUR_TOKEN`.",
      { ...MD, reply_markup: botKeyboard() },
    );
    return;
  }

  const result = await claimRewardCode(chatId, user.id);
  if (!result.ok) {
    await ctx.reply(
      `⏳ This UTC hour's allowance is used.\n\n` +
      `Claims remaining: *0/${CLAIM_LIMIT_PER_HOUR}*\n` +
      `Try again at the start of the next UTC hour.`,
      { ...MD, reply_markup: botKeyboard() },
    );
    return;
  }

  await ctx.reply(
    `🎁 *Reward code issued!*\n\n` +
    `Your code:\n\`${result.code}\`\n\n` +
    `Value: *${fmt(CLAIM_REWARD_CENTS)} store credit*\n` +
    `Redeem it on ${SITE_URL}/redeem.\n\n` +
    `Claims remaining this UTC hour: *${result.remaining}*`,
    { ...MD, reply_markup: botKeyboard() },
  );
}

/**
 * Check if the user's name state changed and handle:
 *  - new keyword detected  → alert + auto-award if new day
 *  - keyword removed       → alert
 *  - keyword present, new day → silent auto-award
 * Returns the (possibly-updated) user row, or null if not linked.
 */
async function handleNameCheck(ctx: Context, bot: Bot): Promise<void> {
  const chatId = String(ctx.from?.id ?? ctx.chat?.id ?? "");
  if (!chatId) return;

  const user = await userByChatId(chatId);
  if (!user) return; // not linked — skip silently

  const nowHas  = hasKeyword(ctx);
  const hadBefore = !!user.telegram_name_active;

  // ── State changed: added keyword ──────────────────────────────────────────
  if (nowHas && !hadBefore) {
    await pool.query(
      "UPDATE users SET telegram_name_active = TRUE WHERE id = $1",
      [user.id]
    );
    await ctx.reply(
      `✅ Name change detected — you're now receiving *${fmt(DAILY_REWARD_CENTS)}* a day!\n\n` +
      `Keep *${NAME_KEYWORD}* in your Telegram name to keep earning every day. 🔥`,
      MD
    );
    // Award today's reward immediately since they just added it
    if (!isToday(user.last_telegram_name_reward)) {
      await awardDaily(user);
    }
    return;
  }

  // ── State changed: removed keyword ───────────────────────────────────────
  if (!nowHas && hadBefore) {
    await pool.query(
      "UPDATE users SET telegram_name_active = FALSE WHERE id = $1",
      [user.id]
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

  // ── No state change, name active, new day → silent auto-award ────────────
  if (nowHas && !isToday(user.last_telegram_name_reward)) {
    await awardDaily(user);
    const updated = await userByChatId(chatId);
    await ctx.reply(
      `💰 *+${fmt(DAILY_REWARD_CENTS)}* daily reward added!\n\nBalance: *${fmt(updated?.balance ?? 0)}*`,
      MD
    );
  }
}

async function awardDaily(user: any) {
  await pool.query(
    "UPDATE users SET balance = balance + $1, last_telegram_name_reward = NOW() WHERE id = $2",
    [DAILY_REWARD_CENTS, user.id]
  );
  await pool.query(
    `INSERT INTO transactions (user_id, amount, type, description, created_at)
     VALUES ($1, $2, 'telegram_name_reward', 'Daily unitedcards.lol name reward', NOW())`,
    [user.id, DAILY_REWARD_CENTS]
  );
}

export function startTelegramBot() {
  if (!BOT_TOKEN) {
    log("TELEGRAM_BOT_TOKEN not set — bot disabled", "telegram");
    return null;
  }

  const bot = new Bot(BOT_TOKEN);
  bot.api.setMyCommands([
    { command: "start", description: "Open the rewards menu" },
    { command: "claim", description: "Claim one store reward code per UTC hour" },
    { command: "status", description: "View access and claim status" },
    { command: "balance", description: "Check linked store balance" },
    { command: "link", description: "Link your store account" },
    { command: "ref", description: "Get your referral link" },
    { command: "help", description: "Show bot help" },
  ]).catch((err: any) => console.error("[telegram] command menu setup failed:", err?.message ?? err));

  // Ensure schema on startup
  ensureSchema().catch(err =>
    console.error("[telegram] schema migration failed:", err?.message)
  );

  /* ── Group-membership gate ─────────────────────────────────────────────── */
  bot.use(async (ctx, next) => {
    if (!GROUP_ID) return next();

    const userId = ctx.from?.id;
    if (!userId) return next();

    try {
      const member = await ctx.api.getChatMember(GROUP_ID, userId);
      const allowed = ["creator", "administrator", "member", "restricted"].includes(member.status);
      if (!allowed) {
        await ctx.reply(`🔒 You must join the unitedcards group before using bot commands.\n\n👉 ${GROUP_INVITE}`);
        return;
      }
    } catch (err: any) {
      console.error("[telegram] membership check failed:", err?.message ?? err);
      await ctx.reply(`🔒 You must join the unitedcards group before using bot commands.\n\n👉 ${GROUP_INVITE}`);
      return;
    }

    return next();
  });

  /* ── Name-change detection middleware (runs after gate, before commands) ── */
  bot.use(async (ctx, next) => {
    // Run name check silently (don't block the command)
    handleNameCheck(ctx, bot).catch(err =>
      console.error("[telegram] name check error:", err?.message)
    );
    return next();
  });

  /* ── /start [ref_USERID] ──────────────────────────────────────────────── */
  bot.command("start", async (ctx: Context) => {
    const chatId = String(ctx.chat!.id);
    const param  = getMatch(ctx);

    if (param.startsWith("ref_")) {
      const referrerUserId = parseInt(param.slice(4), 10);
      if (!isNaN(referrerUserId)) {
        const existing = await userByChatId(chatId);
        if (!existing) {
          await pool.query(
            `INSERT INTO telegram_referral_pending (chat_id, referrer_user_id)
             VALUES ($1, $2) ON CONFLICT (chat_id) DO UPDATE SET referrer_user_id = $2`,
            [chatId, referrerUserId]
          );
        }
      }
    }

    const user = await userByChatId(chatId);
    if (user) {
      const nameOk = hasKeyword(ctx);
      await ctx.reply(
        `👋 Welcome back, *${user.username}*!\n\n` +
        `💰 Balance: *${fmt(user.balance)}*\n\n` +
        (nameOk
          ? `✅ *${NAME_KEYWORD}* is in your name — you're earning *${fmt(DAILY_REWARD_CENTS)}/day* automatically!`
          : `➡️ Add *${NAME_KEYWORD}* to your Telegram name to earn *${fmt(DAILY_REWARD_CENTS)}/day* automatically.`),
        { ...MD, reply_markup: botKeyboard() }
      );
    } else {
      await ctx.reply(
        `👋 Welcome to the *unitedcards* rewards bot!\n\n` +
        `*How to get started:*\n` +
        `1. Go to your profile on *unitedcards.lol* → Telegram section\n` +
        `2. Copy your link token and send: \`/link YOUR_TOKEN\`\n` +
        `3. Add *${NAME_KEYWORD}* to your Telegram display name\n` +
        `4. Earn *${fmt(DAILY_REWARD_CENTS)}/day* automatically — no commands needed! 🎁\n\n` +
        `Use /claim for a store reward code.`,
        { ...MD, reply_markup: botKeyboard() }
      );
    }
  });

  /* ── /link TOKEN ──────────────────────────────────────────────────────── */
  bot.command("link", async (ctx: Context) => {
    const chatId = String(ctx.chat!.id);
    const token  = getMatch(ctx).trim();

    if (!token) {
      await ctx.reply(
        "❌ Usage: `/link YOUR_TOKEN`\n\nGet your token from your profile page on unitedcards.lol → Telegram section.",
        MD
      );
      return;
    }

    // Redeem the token via the bot's own local server (see LOCAL_API above).
    let siteUser: { userId: number; username: string; telegramChatId: string | null } | null = null;
    try {
      const r = await fetch(`${LOCAL_API}/api/telegram/link-token/${encodeURIComponent(token)}`);
      if (r.status === 404) {
        await ctx.reply("❌ Invalid or expired token. Generate a new one from your profile page.", MD);
        return;
      }
      if (!r.ok) throw new Error(`site API ${r.status}`);
      siteUser = await r.json() as any;
    } catch (err: any) {
      console.error("[telegram] link-token lookup failed:", err?.message);
      await ctx.reply("❌ Could not reach the site. Please try again in a moment.", MD);
      return;
    }

    if (!siteUser) return;
    const userId = siteUser.userId;

    const already = await pool.query(
      "SELECT id FROM users WHERE telegram_chat_id = $1 LIMIT 1",
      [chatId]
    );
    if (already.rows.length > 0 && already.rows[0].id !== userId) {
      await ctx.reply(
        "❌ This Telegram account is already linked to a different store account.",
        MD
      );
      return;
    }

    const tgHandle  = ctx.from?.username ?? "";
    const nameActive = hasKeyword(ctx);

    await pool.query(
      "UPDATE users SET telegram_chat_id = $1, telegram_username = $2, telegram_name_active = $3 WHERE id = $4",
      [chatId, tgHandle, nameActive, userId]
    );

    // Handle pending referral
    const refRes = await pool.query(
      "SELECT * FROM telegram_referral_pending WHERE chat_id = $1 LIMIT 1",
      [chatId]
    );
    if (refRes.rows.length > 0) {
      const referrerId = refRes.rows[0].referrer_user_id;
      if (referrerId !== userId) {
        await pool.query(
          "UPDATE users SET balance = balance + $1 WHERE id = $2",
          [REFERRAL_BONUS_CENTS, referrerId]
        );
        await pool.query(
          `INSERT INTO transactions (user_id, amount, type, description, created_at)
           VALUES ($1, $2, 'referral_bonus', 'Telegram referral bonus', NOW())`,
          [referrerId, REFERRAL_BONUS_CENTS]
        );
        await pool.query(
          "UPDATE users SET telegram_referred_by = $1 WHERE id = $2",
          [referrerId, userId]
        );
        const refUser = await pool.query(
          "SELECT telegram_chat_id FROM users WHERE id = $1",
          [referrerId]
        );
        if (refUser.rows[0]?.telegram_chat_id) {
          bot.api.sendMessage(
            refUser.rows[0].telegram_chat_id,
            `🎉 Someone joined using your referral link! You earned *${fmt(REFERRAL_BONUS_CENTS)}* store credit!`,
            MD
          ).catch(() => {});
        }
        await pool.query(
          "DELETE FROM telegram_referral_pending WHERE chat_id = $1",
          [chatId]
        );
      }
    }

    const updated = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = updated.rows[0];

    await ctx.reply(
      `✅ Account linked! Welcome, *${user.username}*!\n\n` +
      `💰 Balance: *${fmt(user.balance)}*\n\n` +
      (nameActive
        ? `✅ *${NAME_KEYWORD}* detected in your name — you're already earning *${fmt(DAILY_REWARD_CENTS)}/day*! 🎁`
        : `➡️ Add *${NAME_KEYWORD}* to your Telegram display name to earn *${fmt(DAILY_REWARD_CENTS)}/day* automatically!\n\nUse /ref to share your referral link and earn *${fmt(REFERRAL_BONUS_CENTS)}* per friend.`),
      MD
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

  /* ── /balance ─────────────────────────────────────────────────────────── */
  bot.command("balance", async (ctx: Context) => {
    const user = await userByChatId(String(ctx.chat!.id));
    if (!user) {
      await ctx.reply("❌ No linked account. Get your token from unitedcards.lol → profile → Telegram section, then send: `/link YOUR_TOKEN`", MD);
      return;
    }
    const nameOk = hasKeyword(ctx);
    await ctx.reply(
      `💰 Balance: *${fmt(user.balance)}*\n\n` +
      (nameOk
        ? `✅ Earning *${fmt(DAILY_REWARD_CENTS)}/day* automatically`
        : `⚠️ Add *${NAME_KEYWORD}* to your name to earn *${fmt(DAILY_REWARD_CENTS)}/day*`),
      { ...MD, reply_markup: botKeyboard() }
    );
  });

  /* ── /ref ─────────────────────────────────────────────────────────────── */
  bot.command("ref", async (ctx: Context) => {
    const user = await userByChatId(String(ctx.chat!.id));
    if (!user) {
      await ctx.reply("❌ No linked account. Get your token from unitedcards.lol → profile → Telegram section, then send: `/link YOUR_TOKEN`", MD);
      return;
    }
    const botInfo = await bot.api.getMe();
    const refLink = `https://t.me/${botInfo.username}?start=ref_${user.id}`;
    await ctx.reply(
      `🔗 Your referral link:\n${refLink}\n\nShare it with friends — you earn ${fmt(REFERRAL_BONUS_CENTS)} store credit every time someone links their account through your link!`
    );
  });

  /* ── /help ────────────────────────────────────────────────────────────── */
  bot.command("help", async (ctx: Context) => {
    await ctx.reply(
      `*unitedcards Rewards Bot*\n\n` +
      `/link token — Link your store account (get token from unitedcards.lol profile)\n` +
      `/balance — Check your store balance\n` +
      `/claim — Get one store reward code per UTC hour\n` +
      `/status — View access and claim status\n` +
      `/ref — Get your referral link (+${fmt(REFERRAL_BONUS_CENTS)} per friend)\n` +
      `/help — Show this message\n\n` +
      `💡 Add *${NAME_KEYWORD}* to your Telegram name to earn *${fmt(DAILY_REWARD_CENTS)}/day* automatically — no commands needed!`,
      { ...MD, reply_markup: botKeyboard() }
    );
  });

  bot.catch((err) => {
    console.error("[telegram] error:", err.message);
  });

  // Start long polling — wrapped so a bad token doesn't crash the server
  bot.start({
    onStart: () => log("Telegram bot started (long polling)", "telegram"),
  }).catch((err: any) => {
    console.error("[telegram] bot failed to start:", err?.message ?? err);
  });

  return bot;
}
