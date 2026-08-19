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
import { startTelegramBot } from "./telegram";

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
  // Endpoints whose URL and/or response carry sensitive data (one-time tokens,
  // account details). Redact the path and never capture the response body.
  const isSensitive = path.startsWith("/api/telegram/link-token");
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    if (!isSensitive) capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const loggedPath = isSensitive ? "/api/telegram/link-token/[redacted]" : path;
      let logLine = `${req.method} ${loggedPath} ${res.statusCode} in ${duration}ms`;
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
  // DB schema migrations

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

  // Start Telegram bot (no-op if TELEGRAM_BOT_TOKEN is not set)
  startTelegramBot();


  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });

  // Graceful shutdown — close the HTTP server on SIGTERM/SIGINT so the port
  // is released before the process exits, preventing EADDRINUSE on restart.
  const shutdown = () => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000); // hard exit after 3 s
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT",  shutdown);
})();
