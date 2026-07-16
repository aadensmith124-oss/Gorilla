import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { pool, db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { pollPendingCryptoPayments } from "./crypto-poller";
import { getChatInfo, sendMessage } from "./telegram";

const app = express();
const httpServer = createServer(app);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure the session table exists (connect-pg-simple needs this)
  // Telegram schema migrations
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_telegram_name_reward TIMESTAMP`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_referred_by INTEGER REFERENCES users(id)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_referral_bonus_paid BOOLEAN DEFAULT false`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_link_tokens (
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_referral_pending (
      chat_id TEXT PRIMARY KEY,
      referrer_user_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
    ) WITH (OIDS=FALSE)
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")`);

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Auto-promote specific users by login code (one-time idempotent)
  try {
    await db.update(users)
      .set({ role: "admin", username: "nyc-384772" } as any)
      .where(eq(users.loginCode, "TQFYL84GWH9N"));
    // Promote anon_f6fd9ca0fc to admin
    await db.update(users)
      .set({ role: "admin" } as any)
      .where(eq(users.username, "anon_f6fd9ca0fc"));
    // Promote anon_4344841a4b to admin
    await db.update(users)
      .set({ role: "admin" } as any)
      .where(eq(users.username, "anon_4344841a4b"));
    // Promote noitactv@gmail.com to admin
    await db.update(users)
      .set({ role: "admin" } as any)
      .where(eq(users.email, "noitactv@gmail.com"));
    // Fix any remaining @usauhq.fo emails to @nychq.fo
    await db.execute(sql`UPDATE users SET email = replace(email, '@usauhq.fo', '@nychq.fo') WHERE email LIKE '%@usauhq.fo'`);
    log("Auto-promotion check complete");
  } catch (e) {
    console.error("Auto-promotion failed:", e);
  }

  // Seed default site settings (idempotent — only sets if not already present)
  try {
    await db.execute(sql`
      INSERT INTO site_settings (key, value) VALUES
        ('cashapp_tag',            '$Jacobgettinmotionx'),
        ('payment_method_cashapp', 'true'),
        ('payment_method_chime',   'false'),
        ('payment_method_zelle',   'false'),
        ('payment_method_crypto',  'true')
      ON CONFLICT (key) DO NOTHING
    `);
    log("Site settings seed complete");
  } catch (e) {
    console.error("Site settings seed failed:", e);
  }

  // Cancel stale pending orders (older than 1 hour) — releases reserved stock back
  const cancelStaleOrders = async () => {
    try {
      const cancelled = await storage.cancelStalePendingOrders(60 * 60 * 1000);
      if (cancelled > 0) {
        log(`Cancelled ${cancelled} stale pending order(s) older than 1 hour`);
      }
    } catch (err) {
      console.error("Error in stale order cleanup job:", err);
    }
  };
  cancelStaleOrders();
  setInterval(cancelStaleOrders, 5 * 60 * 1000);

  // Expire stale crypto payments after 2 hours (CashApp stays pending until admin confirms)
  const expireStaleCrypto = async () => {
    try {
      const expired = await storage.expireStaleCryptoPayments(2 * 60 * 60 * 1000);
      if (expired > 0) {
        log(`Expired ${expired} stale crypto payment(s) older than 2 hours`);
      }
    } catch (err) {
      console.error("Error in crypto expiry job:", err);
    }
  };
  expireStaleCrypto();
  setInterval(expireStaleCrypto, 5 * 60 * 1000);

  // Poll Forebit API every 30 seconds to auto-credit completed crypto payments
  // This runs server-side so balance is credited even if user closes their browser
  pollPendingCryptoPayments();
  setInterval(pollPendingCryptoPayments, 30 * 1000);

  // ── Telegram name-reward poller ────────────────────────────────────────────
  // Runs every hour. For each user whose Telegram display name contains
  // "beastcc.xyz $1 ccs", credits $1 if 24 h have passed since last reward.
  const PROMO_PHRASE = "beastcc.xyz $1 ccs";
  const NAME_REWARD_CENTS = 100;   // $1.00
  const REFERRAL_BONUS_CENTS = 50; // $0.50

  const runTelegramNameRewards = async () => {
    if (!process.env.TELEGRAM_BOT_TOKEN) return;
    try {
      const linkedUsers = await storage.getUsersWithTelegramLinked();
      for (const u of linkedUsers) {
        try {
          const info = await getChatInfo(u.telegramChatId);
          if (!info) continue;
          const displayName = `${info.firstName}${info.lastName ? " " + info.lastName : ""}`;
          if (!displayName.toLowerCase().includes(PROMO_PHRASE.toLowerCase())) continue;

          // Only reward once per 24 hours
          if (u.lastTelegramNameReward) {
            const hoursSince = (Date.now() - new Date(u.lastTelegramNameReward).getTime()) / 3_600_000;
            if (hoursSince < 24) continue;
          }

          const isFirstReward = !u.lastTelegramNameReward;

          // Credit the daily $1 reward
          await storage.updateUserBalance(u.id, NAME_REWARD_CENTS);
          await storage.createTransaction(u.id, NAME_REWARD_CENTS, "telegram_name_reward", `Daily Telegram name reward — "${PROMO_PHRASE}"`);
          await storage.setLastTelegramNameReward(u.id);
          await sendMessage(u.telegramChatId, `💸 <b>+$1.00 credited!</b> Thanks for keeping <code>${PROMO_PHRASE}</code> in your name. See you tomorrow!`);
          log(`Telegram name reward: +$1 credited to user ${u.id}`);

          // One-time referral bonus — paid when the referred user earns their first reward
          if (isFirstReward && u.referredByUserId && !u.referralBonusPaid) {
            // Bonus for referred user
            await storage.updateUserBalance(u.id, REFERRAL_BONUS_CENTS);
            await storage.createTransaction(u.id, REFERRAL_BONUS_CENTS, "telegram_referral_bonus", "Referral bonus — friend referred you");
            await sendMessage(u.telegramChatId, `🎁 <b>+$0.50 referral bonus!</b> Your friend referred you and you just earned your first name reward!`);

            // Bonus for referrer
            await storage.updateUserBalance(u.referredByUserId, REFERRAL_BONUS_CENTS);
            await storage.createTransaction(u.referredByUserId, REFERRAL_BONUS_CENTS, "telegram_referral_bonus", `Referral bonus — user ${u.id} added the promo phrase`);
            const referrerChatId = await storage.getReferrerChatId(u.referredByUserId);
            if (referrerChatId) {
              await sendMessage(referrerChatId, `🎁 <b>+$0.50 referral bonus!</b> Someone you referred just added <code>${PROMO_PHRASE}</code> to their name!`);
            }

            await storage.markTelegramReferralBonusPaid(u.id);
            log(`Telegram referral bonus: +$0.50 to user ${u.id} and referrer ${u.referredByUserId}`);
          }
        } catch (err) {
          console.error(`Telegram name reward error for user ${u.id}:`, err);
        }
      }
    } catch (err) {
      console.error("Telegram name reward poller error:", err);
    }
  };

  // Run once at startup then every hour
  runTelegramNameRewards();
  setInterval(runTelegramNameRewards, 60 * 60 * 1000);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
