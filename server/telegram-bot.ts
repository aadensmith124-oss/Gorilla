import { db } from "./db";
import { users, orders, referralUsages } from "@shared/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { storage } from "./storage";
import { answerPreCheckoutQuery } from "./telegram";

type User = typeof users.$inferSelect;

const TG = (token: string) => `https://api.telegram.org/bot${token}`;

function escMd(text: string): string {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, c => `\\${c}`);
}

async function send(
  token: string,
  chatId: string | number,
  text: string,
  extra: Record<string, unknown> = {}
) {
  try {
    const res = await fetch(`${TG(token)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "MarkdownV2", ...extra }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) {
      console.warn("[TelegramBot] sendMessage error:", data.description, "| text:", text.slice(0, 60));
    }
  } catch (e) {
    console.warn("[TelegramBot] sendMessage failed:", e);
  }
}

async function sendPlain(token: string, chatId: string | number, text: string) {
  try {
    await fetch(`${TG(token)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch { /* fire-and-forget */ }
}

async function isMember(token: string, channelId: string, userId: number): Promise<boolean> {
  try {
    const res = await fetch(`${TG(token)}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channelId, user_id: userId }),
    });
    const data = await res.json() as { ok: boolean; result?: { status: string } };
    if (!data.ok) return false;
    return ["member", "administrator", "creator"].includes(data.result?.status ?? "");
  } catch { return false; }
}

function displayName(from: TelegramUser): string {
  return `${from.first_name ?? ""} ${from.last_name ?? ""}`.trim();
}

function hasTag(name: string, tag: string): boolean {
  if (!tag.trim()) return true;
  return name.toLowerCase().includes(tag.toLowerCase());
}

async function getByTelegramId(tgId: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.telegramId, tgId)).limit(1);
  return user ?? null;
}

// ─── One-time link codes ──────────────────────────────────────────────────────
// Keyed by code; stores which (telegramId, userId) pair it belongs to.
// Users generate a code in the bot, then enter it on the website while logged in.

interface PendingLink { telegramId: string; userId: number; expiresAt: number; }
const pendingLinks = new Map<string, PendingLink>();

function generateCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/**
 * Called from the web route POST /api/user/telegram/link.
 * Verifies the code belongs to the authenticated user and applies the link.
 * Returns true on success, false if code invalid/expired/mismatched.
 */
export async function completeLinkByCode(code: string, userId: number): Promise<boolean> {
  const pending = pendingLinks.get(code);
  if (!pending || pending.userId !== userId || Date.now() > pending.expiresAt) {
    return false;
  }
  await db.update(users)
    .set({ telegramId: pending.telegramId, telegramConnected: true })
    .where(eq(users.id, userId));
  pendingLinks.delete(code);
  return true;
}

// ─── Schema bootstrap (idempotent) ───────────────────────────────────────────

export async function bootstrapSchema() {
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_connected BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS referral_usages (
        id SERIAL PRIMARY KEY,
        referrer_id  INTEGER NOT NULL REFERENCES users(id),
        redeemer_id  INTEGER NOT NULL REFERENCES users(id),
        code         TEXT NOT NULL,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE referral_usages DROP CONSTRAINT IF EXISTS referral_usages_redeemer_id_key;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$
    `);
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'referral_usages_redeemer_code_unique'
        ) THEN
          ALTER TABLE referral_usages
            ADD CONSTRAINT referral_usages_redeemer_code_unique UNIQUE(redeemer_id, code);
        END IF;
      END $$
    `);
    await db.execute(sql`
      UPDATE users
      SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
      WHERE referral_code IS NULL
    `);
    console.log("[TelegramBot] Schema bootstrap complete");
  } catch (e) {
    console.warn("[TelegramBot] Schema bootstrap warning:", e);
  }
}

// ─── Start the bot ────────────────────────────────────────────────────────────

export function startTelegramBot() {
  const tokenRaw = process.env.TELEGRAM_BOT_TOKEN;
  if (!tokenRaw) {
    console.log("[TelegramBot] TELEGRAM_BOT_TOKEN not set — bot not started");
    return;
  }
  const token: string = tokenRaw;

  async function init() {
    try {
      await fetch(`${TG(token)}/deleteWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drop_pending_updates: false }),
      });
      console.log("[TelegramBot] Webhook deleted — starting long-poll loop...");
    } catch (e) {
      console.warn("[TelegramBot] deleteWebhook error:", e);
    }

    let offset = 0;

    while (true) {
      try {
        const adminId     = await storage.getSetting("telegram_admin_id", "");
        const nameTag     = await storage.getSetting("telegram_name_tag", "nychq.cc");
        // Two separate settings for channel:
        //   channelLink — invite URL displayed on the join button (no getChatMember)
        //   channelId   — @username or -100xxx used for getChatMember verification
        const channelLink = await storage.getSetting("telegram_required_channel_link", "https://t.me/+CiKKet6kWmBmYzU5");
        const channelId   = await storage.getSetting("telegram_required_channel_id", "");
        const rewardCents = parseInt(await storage.getSetting("referral_reward_amount", "500"), 10) || 500;

        const res = await fetch(
          `${TG(token)}/getUpdates?offset=${offset}&timeout=25` +
          `&allowed_updates=%5B%22message%22%2C%22pre_checkout_query%22%5D`
        );
        if (!res.ok) { await sleep(3000); continue; }
        const data = await res.json() as { ok: boolean; result?: TelegramUpdate[] };
        if (!data.ok || !data.result) { await sleep(3000); continue; }

        for (const update of data.result) {
          offset = update.update_id + 1;

          if (update.pre_checkout_query) {
            await handlePreCheckout(token, update.pre_checkout_query);
            continue;
          }

          const msg = update.message;
          if (!msg?.from) continue;

          if (msg.successful_payment) {
            await handleSuccessfulPayment(msg.successful_payment);
            continue;
          }

          if (msg.from.is_bot) continue;

          const from   = msg.from;
          const chatId = msg.chat.id;
          const text: string = msg.text ?? "";
          const dname  = displayName(from);

          // ── Admin commands ──────────────────────────────────────────────
          if (adminId && String(from.id) === adminId) {
            if (text.startsWith("/earn ")) {
              await cmdEarn(token, chatId, text); continue;
            }
            if (text.startsWith("/announce ")) {
              await cmdAnnounce(token, chatId, text); continue;
            }
            if (text.startsWith("/chan ")) {
              await cmdChan(token, chatId, text); continue;
            }
          }

          // ── Name-tag removal → auto-disconnect ──────────────────────────
          const linked = await getByTelegramId(String(from.id));
          if (linked?.telegramConnected && !hasTag(dname, nameTag)) {
            await db.update(users)
              .set({ telegramConnected: false, telegramId: null })
              .where(eq(users.id, linked.id));
            await send(token, chatId, `⚠️ Account disconnected — your name tag was removed\\.`);
            continue;
          }

          if (text === "/start" || text.startsWith("/start ")) {
            await cmdStart(token, chatId, from, dname, nameTag, channelLink, channelId, linked);
            continue;
          }

          if (text.startsWith("/referral ")) {
            await cmdReferral(token, chatId, text, rewardCents, linked);
            continue;
          }

          if (!linked && !text.startsWith("/")) {
            await cmdLink(token, chatId, from, text, dname, nameTag, channelLink, channelId);
            continue;
          }
        }
      } catch (err) {
        console.warn("[TelegramBot] Poll error:", err);
        await sleep(5000);
      }
    }
  }

  init();
}

// ─── Stars payment handlers ───────────────────────────────────────────────────

async function handlePreCheckout(token: string, pcq: { id: string; invoice_payload: string }) {
  try {
    const orderId = Number(pcq.invoice_payload);
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || order.status !== "pending") {
      await answerPreCheckoutQuery(pcq.id, false, "Order no longer available");
    } else {
      await answerPreCheckoutQuery(pcq.id, true);
    }
  } catch (e) {
    console.warn("[TelegramBot] handlePreCheckout error:", e);
    try { await answerPreCheckoutQuery(pcq.id, false, "Internal error"); } catch { /* ignore */ }
  }
}

async function handleSuccessfulPayment(sp: { invoice_payload: string }) {
  try {
    const orderId = Number(sp.invoice_payload);
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (order && order.status === "pending") {
      await storage.fulfillPendingOrder(orderId);
      console.log(`[TelegramBot] Stars: order ${orderId} fulfilled`);
    }
  } catch (e) {
    console.warn("[TelegramBot] handleSuccessfulPayment error:", e);
  }
}

// ─── Channel membership gate ──────────────────────────────────────────────────
/**
 * channelId (@username / -100xxx) → getChatMember enforced; hard-block if not member.
 * channelLink only (no channelId)  → join button shown; gate passes (no API block).
 * neither                          → gate passes.
 *
 * Returns true if user may proceed, false if blocked (message already sent).
 */
async function checkChannelGate(
  token: string,
  chatId: number,
  from: TelegramUser,
  channelLink: string,
  channelId: string
): Promise<boolean> {
  if (!channelId && !channelLink) return true;

  if (channelId) {
    // Strict getChatMember verification
    const inChannel = await isMember(token, channelId, from.id);
    if (!inChannel) {
      const joinUrl = channelLink || (channelId.startsWith("@") ? `https://t.me/${channelId.slice(1)}` : "");
      const extra = joinUrl
        ? { reply_markup: JSON.stringify({ inline_keyboard: [[{ text: "📢 Join Channel", url: joinUrl }]] }) }
        : {};
      await send(token, chatId,
        `🔒 *Channel membership required*\n\nJoin our channel first, then send \\/start again\\.`,
        extra
      );
      return false;
    }
  } else {
    // Link-only: show join button but do not hard-block (honor system join step)
    const joinBtn = { inline_keyboard: [[{ text: "📢 Join Channel", url: channelLink }]] };
    await send(token, chatId,
      `📢 *Join our channel* to be part of the community\\:`,
      { reply_markup: JSON.stringify(joinBtn) }
    );
    // Gate passes — continue onboarding
  }

  return true;
}

// ─── Command handlers ─────────────────────────────────────────────────────────

async function cmdStart(
  token: string,
  chatId: number,
  from: TelegramUser,
  dname: string,
  nameTag: string,
  channelLink: string,
  channelId: string,
  linked: User | null
) {
  if (linked?.telegramConnected) {
    await send(token, chatId,
      `✅ *Already Connected\\!*\n\nLinked to *${escMd(linked.username)}*\\.\n` +
      `💰 Balance: *\\$${escMd((linked.balance / 100).toFixed(2))}*\n\n` +
      `📎 Referral code: \`${escMd(linked.referralCode ?? "N/A")}\`\n` +
      `_Share it to earn rewards when others use it\\._`
    );
    return;
  }

  // Gate 1: channel (strict if channelId set, show-and-pass if link-only)
  if (!await checkChannelGate(token, chatId, from, channelLink, channelId)) return;

  // Gate 2: name tag in display name
  if (!hasTag(dname, nameTag)) {
    await send(token, chatId,
      `🔥 *Welcome to NYCHQ\\!*\n\n` +
      `*Next —* Add \`${escMd(nameTag)}\` to your Telegram display name\\.\n\n` +
      `📌 *How:* Telegram → Settings → Edit Profile → First\\/Last Name\n\n` +
      `Once your name includes \`${escMd(nameTag)}\`, send your NYCHQ *username or email* here\\.`
    );
    return;
  }

  await send(token, chatId,
    `🔥 *Welcome to NYCHQ\\!*\n\n` +
    `✅ Name tag found\\!\n\n` +
    `Send your NYCHQ *username or email* to link your account\\.`
  );
}

/**
 * Account linking: applies channel gate + name-tag gate, then generates a
 * one-time code that the user must enter on nychq.cc to confirm ownership.
 */
async function cmdLink(
  token: string,
  chatId: number,
  from: TelegramUser,
  text: string,
  dname: string,
  nameTag: string,
  channelLink: string,
  channelId: string
) {
  if (!await checkChannelGate(token, chatId, from, channelLink, channelId)) return;

  if (!hasTag(dname, nameTag)) {
    await send(token, chatId,
      `⚠️ *Name tag missing*\n\nYour display name must contain \`${escMd(nameTag)}\`\\.\n` +
      `Current name: *${escMd(dname || "(none)")}*\n\nAdd it, then send your username or email again\\.`
    );
    return;
  }

  const query = text.trim();
  let siteUser = await storage.getUserByUsername(query);
  if (!siteUser) siteUser = await storage.getUserByEmail(query);
  if (!siteUser) {
    await send(token, chatId,
      `❌ *Not found*\n\nNo account matches \`${escMd(query)}\`\\.\nSend your exact site *username or email*\\.`
    );
    return;
  }

  // Generate one-time link code — user must enter it on the website to confirm ownership
  const code = generateCode();
  pendingLinks.set(code, {
    telegramId: String(from.id),
    userId: siteUser.id,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  await send(token, chatId,
    `🔐 *Confirm Account Ownership*\n\n` +
    `To link your NYCHQ account, enter this code on the website:\n\n` +
    `\`${escMd(code)}\`\n\n` +
    `Go to *nychq\\.cc* → Profile → Dashboard → *Link Telegram*\n\n` +
    `_Code expires in 10 minutes\\._`
  );
}

async function cmdReferral(
  token: string,
  chatId: number,
  text: string,
  rewardCents: number,
  linked: User | null
) {
  if (!linked) {
    await send(token, chatId, `❌ Link your account first\\. Send \\/start to begin\\.`);
    return;
  }

  const code = text.slice("/referral ".length).trim().toUpperCase();
  if (!code) {
    await send(token, chatId, `❌ Usage: \`/referral YOUR_CODE\`\nExample: \`/referral ABCD1234\``);
    return;
  }

  const [referrer] = await db.select().from(users).where(eq(users.referralCode, code)).limit(1);
  if (!referrer) {
    await send(token, chatId,
      `❌ *Invalid code*\n\n\`${escMd(code)}\` doesn't match any account\\. Double\\-check and try again\\.`
    );
    return;
  }

  if (referrer.id === linked.id) {
    await send(token, chatId, `❌ You can't use your own referral code\\.`);
    return;
  }

  const used = await db.select().from(referralUsages)
    .where(and(eq(referralUsages.redeemerId, linked.id), eq(referralUsages.code, code)))
    .limit(1);
  if (used.length > 0) {
    await send(token, chatId, `⚠️ You've already used this referral code\\.`);
    return;
  }

  await db.insert(referralUsages).values({ referrerId: referrer.id, redeemerId: linked.id, code });
  await storage.updateUserBalance(referrer.id, rewardCents);
  await storage.createTransaction(referrer.id, rewardCents, "referral", `Referral reward — ${linked.username} used your code`);

  const updRef = await storage.getUser(referrer.id);

  if (referrer.telegramConnected && referrer.telegramId) {
    await send(token, referrer.telegramId,
      `🎉 *Referral Reward\\!*\n\n*${escMd(linked.username)}* used your code\\!\n` +
      `💰 You earned *\\$${escMd((rewardCents / 100).toFixed(2))}*\n` +
      `💳 New balance: *\\$${escMd(((updRef?.balance ?? 0) / 100).toFixed(2))}*`
    );
  }

  await send(token, chatId,
    `✅ *Code Accepted\\!*\n\nCode \`${escMd(code)}\` was valid\\. The owner has been rewarded\\.`
  );
}

async function cmdEarn(token: string, chatId: number, text: string) {
  const parts = text.slice(6).trim().split(/\s+/);
  if (parts.length < 2) {
    await send(token, chatId, `❌ Usage: \`/earn USERNAME AMOUNT\`\nExample: \`/earn john 5\``);
    return;
  }
  const [username, amountStr] = parts;
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    await send(token, chatId, `❌ Invalid amount: \`${escMd(amountStr)}\``);
    return;
  }
  const cents = Math.round(amount * 100);

  let siteUser = await storage.getUserByUsername(username);
  if (!siteUser) siteUser = await storage.getUserByEmail(username);
  if (!siteUser) {
    await send(token, chatId, `❌ User \`${escMd(username)}\` not found\\.`);
    return;
  }

  await storage.updateUserBalance(siteUser.id, cents);
  await storage.createTransaction(siteUser.id, cents, "manual_deposit", `Admin credited via Telegram`);
  const updated = await storage.getUser(siteUser.id);

  await send(token, chatId,
    `✅ *Credited \\$${escMd(amount.toFixed(2))} → ${escMd(siteUser.username)}*\n` +
    `💳 New balance: *\\$${escMd(((updated?.balance ?? 0) / 100).toFixed(2))}*`
  );

  if (updated?.telegramConnected && updated.telegramId) {
    await send(token, updated.telegramId,
      `💰 *Balance Credited\\!*\n\n*\\$${escMd(amount.toFixed(2))}* added by admin\\.\n` +
      `💳 New balance: *\\$${escMd((updated.balance / 100).toFixed(2))}*`
    );
  }
}

async function cmdAnnounce(token: string, chatId: number, text: string) {
  const message = text.slice("/announce ".length).trim();
  if (!message) {
    await send(token, chatId, `❌ Usage: \`/announce Your message here\``);
    return;
  }

  const recipients = await db
    .select({ telegramId: users.telegramId })
    .from(users)
    .where(and(eq(users.telegramConnected, true), isNotNull(users.telegramId)));

  let sent = 0;
  let failed = 0;
  for (const row of recipients) {
    if (!row.telegramId) continue;
    try {
      await sendPlain(token, row.telegramId, message);
      sent++;
      if (sent % 20 === 0) await sleep(1000);
    } catch { failed++; }
  }

  await send(token, chatId,
    `📢 *Announcement Sent\\!*\n\n✅ Delivered to *${escMd(String(sent))}* users\\.` +
    (failed > 0 ? `\n❌ Failed: *${escMd(String(failed))}*` : "")
  );
}

/**
 * /chan VALUE — auto-detects and sets the right setting:
 *   URL (https://...)        → telegram_required_channel_link
 *   @username or -100xxx     → telegram_required_channel_id
 */
async function cmdChan(token: string, chatId: number, text: string) {
  const val = text.slice(5).trim();
  const isUrl = val.startsWith("http");
  const isVerifiable = /^-\d+$/.test(val) || val.startsWith("@");

  if (isUrl) {
    await storage.setSetting("telegram_required_channel_link", val);
    await send(token, chatId,
      `✅ Channel join link updated\\.\n\nThis link is shown on the join button\\.\nTo also enable verified membership checks, run:\n\`/chan @channelname\` or \`/chan \\-100XXXX\``
    );
  } else if (isVerifiable) {
    await storage.setSetting("telegram_required_channel_id", val);
    // Also update the link to a t.me URL so the join button works
    if (val.startsWith("@")) {
      await storage.setSetting("telegram_required_channel_link", `https://t.me/${val.slice(1)}`);
    }
    await send(token, chatId,
      `✅ Channel set to \`${escMd(val)}\`\\.\nMembership is now *verified via getChatMember* before linking\\.`
    );
  } else {
    await send(token, chatId,
      `❌ Unrecognized format\\.\nProvide a join URL: \`/chan https://t\\.me/\\+xxx\`\nOr a verifiable ID: \`/chan @channelname\` or \`/chan \\-100XXXX\``
    );
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
}

interface TelegramMessage {
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
  successful_payment?: { invoice_payload: string };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  pre_checkout_query?: { id: string; invoice_payload: string };
}
