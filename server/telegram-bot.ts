import { db } from "./db";
import { users, orders } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { storage } from "./storage";
import { answerPreCheckoutQuery } from "./telegram";

const TG = (token: string) => `https://api.telegram.org/bot${token}`;

function escMd(text: string): string {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, c => `\\${c}`);
}

async function send(token: string, chatId: string | number, text: string, extra: Record<string, any> = {}) {
  try {
    const res = await fetch(`${TG(token)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "MarkdownV2", ...extra }),
    });
    const data = await res.json() as any;
    if (!data.ok) console.warn("[TelegramBot] sendMessage error:", data.description, "text:", text.slice(0, 80));
  } catch (e) {
    console.warn("[TelegramBot] sendMessage failed:", e);
  }
}

async function sendRaw(token: string, chatId: string | number, text: string, extra: Record<string, any> = {}) {
  try {
    await fetch(`${TG(token)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, ...extra }),
    });
  } catch {}
}

async function isMember(token: string, channelId: string, userId: number): Promise<boolean> {
  if (!channelId) return true;
  try {
    const res = await fetch(`${TG(token)}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channelId, user_id: userId }),
    });
    const data = await res.json() as any;
    if (!data.ok) return false;
    return ["member", "administrator", "creator"].includes(data.result?.status);
  } catch { return false; }
}

function displayName(from: any): string {
  return `${from.first_name ?? ""} ${from.last_name ?? ""}`.trim();
}

function hasTag(name: string, tag: string): boolean {
  if (!tag.trim()) return true;
  return name.toLowerCase().includes(tag.toLowerCase());
}

async function getByTelegramId(tgId: string) {
  const { rows } = await db.execute(sql`SELECT * FROM users WHERE telegram_id = ${tgId} LIMIT 1`) as any;
  return (rows[0] as any) ?? null;
}

// ─── Schema bootstrap (idempotent) ───────────────────────────────────────────

async function bootstrapSchema() {
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_connected BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS referral_usages (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER NOT NULL REFERENCES users(id),
        redeemer_id INTEGER NOT NULL REFERENCES users(id),
        code TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(redeemer_id)
      )
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
    // Ensure schema is up to date before doing anything else
    await bootstrapSchema();

    // Delete any existing webhook — long polling and webhooks are mutually exclusive
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
    let alive = true;

    async function poll() {
      while (alive) {
        try {
          // Load settings fresh each cycle so admin changes take effect without restart
          const adminId       = await storage.getSetting("telegram_admin_id", "");
          const nameTag       = await storage.getSetting("telegram_name_tag", "nychq.cc");
          const channelLink   = await storage.getSetting("telegram_required_channel", "https://t.me/+CiKKet6kWmBmYzU5");
          const channelId     = await storage.getSetting("telegram_channel_id", "");
          const rewardCents   = parseInt(await storage.getSetting("referral_reward_amount", "500"), 10) || 500;

          // message + pre_checkout_query covers all regular chat + Stars payments
          const res = await fetch(
            `${TG(token)}/getUpdates?offset=${offset}&timeout=25&allowed_updates=%5B%22message%22%2C%22pre_checkout_query%22%5D`
          );
          if (!res.ok) { await sleep(3000); continue; }
          const data = await res.json() as any;
          if (!data.ok) { await sleep(3000); continue; }

          for (const update of (data.result ?? [])) {
            offset = update.update_id + 1;

            // ── Stars: pre_checkout_query ─────────────────────────────────
            if (update.pre_checkout_query) {
              await handlePreCheckout(token, update.pre_checkout_query);
              continue;
            }

            const msg = update.message;
            if (!msg?.from) continue;

            // ── Stars: successful_payment inside a message ────────────────
            if (msg.successful_payment) {
              await handleSuccessfulPayment(msg.successful_payment);
              continue;
            }

            if (msg.from.is_bot) continue;

            const from    = msg.from;
            const chatId  = msg.chat.id;
            const text: string = msg.text ?? "";
            const dname   = displayName(from);

            // ── Admin commands ────────────────────────────────────────────
            if (adminId && String(from.id) === adminId) {
              if (text.startsWith("/earn ")) {
                await cmdEarn(token, chatId, text); continue;
              }
              if (text.startsWith("/announce ")) {
                await cmdAnnounce(token, chatId, text); continue;
              }
              if (text.startsWith("/chan ")) {
                const val = text.slice(5).trim();
                if (/^-?\d+$/.test(val)) {
                  await storage.setSetting("telegram_channel_id", val);
                  await send(token, chatId, `✅ Channel ID set to \`${escMd(val)}\`\\.`);
                } else {
                  await storage.setSetting("telegram_required_channel", val);
                  await send(token, chatId, `✅ Channel link set to \`${escMd(val)}\`\\.`);
                }
                continue;
              }
            }

            // ── Check name-tag removal for already-linked users ───────────
            const linked = await getByTelegramId(String(from.id));
            if (linked?.telegram_connected) {
              if (!hasTag(dname, nameTag)) {
                await db.execute(sql`
                  UPDATE users SET telegram_connected = false, telegram_id = NULL
                  WHERE id = ${linked.id}
                `);
                await send(token, chatId,
                  `⚠️ *Account Disconnected*\n\nYour display name no longer contains \`${escMd(nameTag)}\`\\.\nYour NYCHQ account has been unlinked\\.\n\nTo reconnect, add \`${escMd(nameTag)}\` back to your Telegram name and send \\/start again\\.`
                );
                continue;
              }
            }

            // ── /start ────────────────────────────────────────────────────
            if (text === "/start" || text.startsWith("/start ")) {
              await cmdStart(token, chatId, from, dname, nameTag, channelLink, channelId, linked);
              continue;
            }

            // ── /referral <CODE> ──────────────────────────────────────────
            if (text.startsWith("/referral ")) {
              await cmdReferral(token, chatId, from, text, rewardCents, linked);
              continue;
            }

            // ── Text message → account linking attempt ────────────────────
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

    poll();
  }

  init();
}

// ─── Telegram Stars payment handlers ─────────────────────────────────────────

async function handlePreCheckout(token: string, pcq: any) {
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
    try { await answerPreCheckoutQuery(pcq.id, false, "Internal error"); } catch {}
  }
}

async function handleSuccessfulPayment(sp: any) {
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

// ─── Command handlers ─────────────────────────────────────────────────────────

async function cmdStart(
  token: string, chatId: number, from: any, dname: string,
  nameTag: string, channelLink: string, channelId: string, linked: any
) {
  const joinBtn = {
    inline_keyboard: [[{ text: "📢 Join Channel — Click Here", url: channelLink }]]
  };

  const inChannel = channelId ? await isMember(token, channelId, from.id) : true;

  if (!inChannel) {
    await send(token, chatId,
      `🔥 *Welcome to NYCHQ\\!*\n\n*Step 1 —* Join our channel to get started\\.\nTap the button below, then send \\/start again\\.`,
      { reply_markup: JSON.stringify(joinBtn) }
    );
    return;
  }

  if (linked?.telegram_connected) {
    await send(token, chatId,
      `✅ *Already Connected\\!*\n\nYou're linked to *${escMd(linked.username)}*\\.\n💰 Balance: *\\$${escMd((linked.balance / 100).toFixed(2))}*\n\n📎 Your referral code: \`${escMd(linked.referral_code ?? "N/A")}\`\nShare it — you earn a reward every time someone uses it\\.`
    );
    return;
  }

  await send(token, chatId,
    `🔥 *Welcome to NYCHQ\\!*\n\n✅ Channel joined — nice\\!\n\n*Step 2 —* Add \`${escMd(nameTag)}\` to your Telegram display name\\.\n\n📌 *How:*\nTelegram → Settings → Edit Profile → First\\/Last Name\n\nOnce you've added \`${escMd(nameTag)}\` to your name, send your NYCHQ *username or email* here to link your account\\.`
  );
}

async function cmdLink(
  token: string, chatId: number, from: any, text: string,
  dname: string, nameTag: string, channelLink: string, channelId: string
) {
  const joinBtn = { inline_keyboard: [[{ text: "📢 Join Channel", url: channelLink }]] };

  if (channelId) {
    const inChannel = await isMember(token, channelId, from.id);
    if (!inChannel) {
      await send(token, chatId, `⚠️ *Join required\\!*\n\nYou must join our channel before linking\\. Tap below:`,
        { reply_markup: JSON.stringify(joinBtn) });
      return;
    }
  }

  if (!hasTag(dname, nameTag)) {
    await send(token, chatId,
      `⚠️ *Name tag missing\\!*\n\nYour Telegram display name must contain \`${escMd(nameTag)}\`\\.\nCurrent name: *${escMd(dname || "(none)")}*\n\nAdd it, then send your username or email again\\.`
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

  // Link the account
  await db.execute(sql`
    UPDATE users SET telegram_id = ${String(from.id)}, telegram_connected = true
    WHERE id = ${siteUser.id}
  `);

  const { rows } = await db.execute(sql`SELECT referral_code FROM users WHERE id = ${siteUser.id}`) as any;
  const refCode = rows[0]?.referral_code ?? "N/A";

  await send(token, chatId,
    `✅ *Account Linked\\!*\n\n🎉 Welcome, *${escMd(siteUser.username)}*\\!\n💰 Balance: *\\$${escMd((siteUser.balance / 100).toFixed(2))}*\n\n📎 Your referral code: \`${escMd(refCode)}\`\n_Share your code — you earn a reward every time someone uses it\\._\n\nUse \\/referral CODE to redeem someone else's code\\.`
  );
}

async function cmdReferral(
  token: string, chatId: number, from: any,
  text: string, rewardCents: number, linked: any
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

  // Find referrer
  const { rows: refRows } = await db.execute(sql`SELECT * FROM users WHERE referral_code = ${code} LIMIT 1`) as any;
  const referrer = refRows[0];
  if (!referrer) {
    await send(token, chatId, `❌ *Invalid code*\n\n\`${escMd(code)}\` doesn't match any account\\. Double\\-check and try again\\.`);
    return;
  }

  if (referrer.id === linked.id) {
    await send(token, chatId, `❌ You can't use your own referral code\\.`);
    return;
  }

  // Check if this redeemer already used a referral code
  const { rows: used } = await db.execute(sql`SELECT id FROM referral_usages WHERE redeemer_id = ${linked.id} LIMIT 1`) as any;
  if (used.length > 0) {
    await send(token, chatId, `⚠️ You've already used a referral code before\\. Each account can only redeem once\\.`);
    return;
  }

  // Record + reward
  await db.execute(sql`
    INSERT INTO referral_usages (referrer_id, redeemer_id, code) VALUES (${referrer.id}, ${linked.id}, ${code})
  `);
  await storage.updateUserBalance(referrer.id, rewardCents);
  await storage.createTransaction(referrer.id, rewardCents, "referral", `Referral reward — ${linked.username} used your code`);

  const updRef = await storage.getUser(referrer.id);

  // Notify referrer
  if (referrer.telegram_connected && referrer.telegram_id) {
    await send(token, referrer.telegram_id,
      `🎉 *Referral Reward\\!*\n\n*${escMd(linked.username)}* used your referral code\\!\n💰 You earned *\\$${escMd((rewardCents / 100).toFixed(2))}*\n💳 New balance: *\\$${escMd(((updRef?.balance ?? 0) / 100).toFixed(2))}*`
    );
  }

  await send(token, chatId,
    `✅ *Code Accepted\\!*\n\nReferral code \`${escMd(code)}\` was valid\\.\nThe code owner has been automatically rewarded\\.`
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
    `✅ *Credited \\$${escMd(amount.toFixed(2))} → ${escMd(siteUser.username)}*\n💳 New balance: *\\$${escMd(((updated?.balance ?? 0) / 100).toFixed(2))}*`
  );

  // Notify user if they're connected
  const { rows } = await db.execute(sql`SELECT telegram_id, telegram_connected FROM users WHERE id = ${siteUser.id}`) as any;
  const tgUser = rows[0];
  if (tgUser?.telegram_connected && tgUser?.telegram_id) {
    await send(token, tgUser.telegram_id,
      `💰 *Balance Credited\\!*\n\n*\\$${escMd(amount.toFixed(2))}* was added to your account by admin\\.\n💳 New balance: *\\$${escMd(((updated?.balance ?? 0) / 100).toFixed(2))}*`
    );
  }
}

async function cmdAnnounce(token: string, chatId: number, text: string) {
  const message = text.slice("/announce ".length).trim();
  if (!message) {
    await send(token, chatId, `❌ Usage: \`/announce Your message here\``);
    return;
  }

  const { rows } = await db.execute(
    sql`SELECT telegram_id FROM users WHERE telegram_connected = true AND telegram_id IS NOT NULL`
  ) as any;

  let sent = 0, failed = 0;
  for (const row of rows) {
    try {
      await fetch(`${TG(token)}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: row.telegram_id, text: message }),
      });
      sent++;
      if (sent % 20 === 0) await sleep(1000); // avoid flood limits
    } catch { failed++; }
  }

  await send(token, chatId,
    `📢 *Announcement Sent\\!*\n\n✅ Delivered to *${escMd(String(sent))}* users\\.${failed > 0 ? `\n❌ Failed: *${escMd(String(failed))}*` : ""}`
  );
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
