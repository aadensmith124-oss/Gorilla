import { Bot, Context } from "grammy";
import { pool } from "./db";
import { log } from "./index";

const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID     = process.env.Telegram_group_id;
const GROUP_INVITE = "https://t.me/+L4RV2JFJNz45ZGYx";
const DAILY_REWARD_CENTS  = 200; // $2.00
const REFERRAL_BONUS_CENTS = 100; // $1.00
const NAME_KEYWORD = "unitedcards.cc";

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
    await ctx.reply(
      `⚠️ Name change detected — you removed *${NAME_KEYWORD}* from your name.\n\n` +
      `Add it back to start receiving *${fmt(DAILY_REWARD_CENTS)}/day* again.`,
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
     VALUES ($1, $2, 'telegram_name_reward', 'Daily unitedcards.cc name reward', NOW())`,
    [user.id, DAILY_REWARD_CENTS]
  );
}

export function startTelegramBot() {
  if (!BOT_TOKEN) {
    log("TELEGRAM_BOT_TOKEN not set — bot disabled", "telegram");
    return null;
  }

  const bot = new Bot(BOT_TOKEN);

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
        MD
      );
    } else {
      await ctx.reply(
        `👋 Welcome to the *unitedcards* rewards bot!\n\n` +
        `*How to get started:*\n` +
        `1. Send: \`/link your@email.com\`\n` +
        `2. Add *${NAME_KEYWORD}* to your Telegram display name\n` +
        `3. Earn *${fmt(DAILY_REWARD_CENTS)}/day* automatically — no commands needed! 🎁`,
        MD
      );
    }
  });

  /* ── /link EMAIL ──────────────────────────────────────────────────────── */
  bot.command("link", async (ctx: Context) => {
    const chatId = String(ctx.chat!.id);
    const email  = getMatch(ctx).toLowerCase();

    if (!email || !email.includes("@")) {
      await ctx.reply(
        "❌ Usage: `/link your@email.com`\n\nSend the email you used to sign up on unitedcards.cc",
        MD
      );
      return;
    }

    const userRes = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1 LIMIT 1",
      [email]
    );
    if (!userRes.rows[0]) {
      await ctx.reply(
        "❌ No account found with that email. Make sure it matches what you used to sign up.",
        MD
      );
      return;
    }

    const userId = userRes.rows[0].id;

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

    const tgHandle = ctx.from?.username ?? "";
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

  /* ── /balance ─────────────────────────────────────────────────────────── */
  bot.command("balance", async (ctx: Context) => {
    const user = await userByChatId(String(ctx.chat!.id));
    if (!user) {
      await ctx.reply("❌ No linked account. Send: `/link your@email.com`", MD);
      return;
    }
    const nameOk = hasKeyword(ctx);
    await ctx.reply(
      `💰 Balance: *${fmt(user.balance)}*\n\n` +
      (nameOk
        ? `✅ Earning *${fmt(DAILY_REWARD_CENTS)}/day* automatically`
        : `⚠️ Add *${NAME_KEYWORD}* to your name to earn *${fmt(DAILY_REWARD_CENTS)}/day*`),
      MD
    );
  });

  /* ── /ref ─────────────────────────────────────────────────────────────── */
  bot.command("ref", async (ctx: Context) => {
    const user = await userByChatId(String(ctx.chat!.id));
    if (!user) {
      await ctx.reply("❌ No linked account. Send: `/link your@email.com`", MD);
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
      `/link email — Link your store account\n` +
      `/balance — Check your store balance\n` +
      `/ref — Get your referral link (+${fmt(REFERRAL_BONUS_CENTS)} per friend)\n` +
      `/help — Show this message\n\n` +
      `💡 Add *${NAME_KEYWORD}* to your Telegram name to earn *${fmt(DAILY_REWARD_CENTS)}/day* automatically — no commands needed!`,
      MD
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
