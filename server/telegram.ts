import { Bot, Context } from "grammy";
import { pool } from "./db";
import { log } from "./index";

const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID     = process.env.Telegram_group_id;   // must be a numeric chat ID
const GROUP_INVITE = "https://t.me/+9_iBYCRURfgwNGUx";
const DAILY_REWARD_CENTS = 25;   // $0.25
const REFERRAL_BONUS_CENTS = 10; // $0.10
const NAME_KEYWORD = "foodplug.lol";

const MD = { parse_mode: "Markdown" as const };

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function isToday(date: Date | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
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

async function userByChatId(chatId: string) {
  const r = await pool.query(
    "SELECT * FROM users WHERE telegram_chat_id = $1 LIMIT 1",
    [chatId]
  );
  return r.rows[0] ?? null;
}

export function startTelegramBot() {
  if (!BOT_TOKEN) {
    log("TELEGRAM_BOT_TOKEN not set — bot disabled", "telegram");
    return null;
  }

  const bot = new Bot(BOT_TOKEN);

  /* ── Group-membership gate (runs before every command) ── */
  bot.use(async (ctx, next) => {
    if (!GROUP_ID) return next(); // no group configured — open access

    const userId = ctx.from?.id;
    if (!userId) return next();

    try {
      const member = await ctx.api.getChatMember(GROUP_ID, userId);
      const allowed = ["creator", "administrator", "member", "restricted"].includes(member.status);
      if (!allowed) {
        await ctx.reply(
          `🔒 You must join the foodplug group before using bot commands.\n\n👉 ${GROUP_INVITE}`,
          MD
        );
        return;
      }
    } catch (err: any) {
      console.error("[telegram] membership check failed:", err?.message ?? err);
      // Fail closed — block access if check can't be performed
      await ctx.reply(
        `🔒 You must join the foodplug group before using bot commands.\n\n👉 ${GROUP_INVITE}`,
        MD
      );
      return;
    }

    return next();
  });

  /* ── /start [ref_USERID] ── */
  bot.command("start", async (ctx: Context) => {
    const chatId = String(ctx.chat!.id);
    const param  = getMatch(ctx);

    // Record referral before checking linked status
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
      await ctx.reply(
        `👋 Welcome back, *${user.username}*!\n\n` +
        `💰 Balance: *${fmt(user.balance)}*\n\n` +
        `Use /claim to collect your daily *$1.00* (requires *${NAME_KEYWORD}* in your Telegram name).\n` +
        `Use /ref to share your referral link and earn *${fmt(REFERRAL_BONUS_CENTS)}* per friend.`,
        MD
      );
    } else {
      await ctx.reply(
        `👋 Welcome to the *foodplug* rewards bot!\n\n` +
        `*How to link your account:*\n` +
        `Send: \`/link your@email.com\`\n\n` +
        `Once linked, add *${NAME_KEYWORD}* to your Telegram name and use /claim to earn *$1.00 every day!* 🎁`,
        MD
      );
    }
  });

  /* ── /link EMAIL ── */
  bot.command("link", async (ctx: Context) => {
    const chatId = String(ctx.chat!.id);
    const email  = getMatch(ctx).toLowerCase();

    if (!email || !email.includes("@")) {
      await ctx.reply(
        "❌ Usage: `/link your@email.com`\n\nSend the email you used to sign up on foodplug.lol",
        MD
      );
      return;
    }

    // Look up user by email or username
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

    // Prevent linking this Telegram to a different account
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

    // Link
    const tgHandle = ctx.from?.username ?? "";
    await pool.query(
      "UPDATE users SET telegram_chat_id = $1, telegram_username = $2 WHERE id = $3",
      [chatId, tgHandle, userId]
    );

    // Handle pending referral bonus
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
        // Notify referrer
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
      `Now add *${NAME_KEYWORD}* to your Telegram display name, then use /claim to earn *$1.00 every day!* 🎁\n\n` +
      `Use /ref to share your referral link and earn *${fmt(REFERRAL_BONUS_CENTS)}* per friend.`,
      MD
    );
  });

  /* ── /claim ── */
  bot.command("claim", async (ctx: Context) => {
    const chatId = String(ctx.chat!.id);
    const user = await userByChatId(chatId);

    if (!user) {
      await ctx.reply(
        "❌ Your Telegram is not linked yet.\n\nSend: `/link your@email.com`",
        MD
      );
      return;
    }

    // Check name contains the keyword
    const firstName = ctx.from?.first_name ?? "";
    const lastName  = ctx.from?.last_name  ?? "";
    const fullName  = `${firstName} ${lastName}`.toLowerCase();

    if (!fullName.includes(NAME_KEYWORD)) {
      await ctx.reply(
        `❌ Your Telegram name doesn't contain *${NAME_KEYWORD}*.\n\n` +
        `Add it to your first or last name in Telegram settings, then try /claim again.`,
        MD
      );
      return;
    }

    // Cooldown: once per calendar day
    if (isToday(user.last_telegram_name_reward)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hoursLeft = Math.ceil((tomorrow.getTime() - Date.now()) / 3_600_000);
      await ctx.reply(
        `⏳ Already claimed today! Come back in ~*${hoursLeft}h* for your next *$1.00*. 🔥`,
        MD
      );
      return;
    }

    // Award $1
    await pool.query(
      "UPDATE users SET balance = balance + $1, last_telegram_name_reward = NOW() WHERE id = $2",
      [DAILY_REWARD_CENTS, user.id]
    );
    await pool.query(
      `INSERT INTO transactions (user_id, amount, type, description, created_at)
       VALUES ($1, $2, 'telegram_name_reward', 'Daily foodplug.lol name reward', NOW())`,
      [user.id, DAILY_REWARD_CENTS]
    );

    const newBalance = user.balance + DAILY_REWARD_CENTS;
    await ctx.reply(
      `🎉 *+${fmt(DAILY_REWARD_CENTS)}* added to your balance!\n\n` +
      `💰 New balance: *${fmt(newBalance)}*\n\n` +
      `Come back tomorrow for another *$1.00!* 🔥`,
      MD
    );
  });

  /* ── /balance ── */
  bot.command("balance", async (ctx: Context) => {
    const user = await userByChatId(String(ctx.chat!.id));
    if (!user) {
      await ctx.reply("❌ No linked account. Send: `/link your@email.com`", MD);
      return;
    }
    await ctx.reply(`💰 Balance: *${fmt(user.balance)}*`, MD);
  });

  /* ── /ref ── */
  bot.command("ref", async (ctx: Context) => {
    const user = await userByChatId(String(ctx.chat!.id));
    if (!user) {
      await ctx.reply("❌ No linked account. Send: `/link your@email.com`", MD);
      return;
    }
    const botInfo = await bot.api.getMe();
    const refLink = `https://t.me/${botInfo.username}?start=ref_${user.id}`;
    await ctx.reply(
      `🔗 *Your referral link:*\n${refLink}\n\n` +
      `Share it with friends — you earn *${fmt(REFERRAL_BONUS_CENTS)}* store credit every time someone links their account through your link!`,
      MD
    );
  });

  /* ── /help ── */
  bot.command("help", async (ctx: Context) => {
    await ctx.reply(
      `*foodplug Rewards Bot*\n\n` +
      `/link email — Link your store account\n` +
      `/claim — Claim your daily *$1.00* (need *${NAME_KEYWORD}* in your name)\n` +
      `/balance — Check your store balance\n` +
      `/ref — Get your referral link (+${fmt(REFERRAL_BONUS_CENTS)} per friend)\n` +
      `/help — Show this message`,
      MD
    );
  });

  // Start long polling
  bot.start({
    onStart: () => log("Telegram bot started (long polling)", "telegram"),
  });

  bot.catch((err) => {
    console.error("[telegram] error:", err.message);
  });

  return bot;
}
