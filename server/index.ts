import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { pool, db } from "./db";
import { sql } from "drizzle-orm";
import { pollPendingCryptoPayments } from "./crypto-poller";
import { startTelegramBot } from "./telegram";

const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      upgradeInsecureRequests: [],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "6mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "6mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function removeSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeSensitiveFields);
  if (!value || typeof value !== "object") return value;

  const hidden = new Set(["password", "loginCode", "smtp_password", "smtpPassword"]);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !hidden.has(key))
      .map(([key, nested]) => [key, removeSensitiveFields(nested)]),
  );
}

// Password hashes, legacy login codes, and stored mail credentials must never
// be returned accidentally by an API handler.
app.use((_req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => originalJson(removeSensitiveFields(body))) as typeof res.json;
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const isSensitive = path.startsWith("/api/telegram/link-token");

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const loggedPath = isSensitive ? "/api/telegram/link-token/[redacted]" : path;
      log(`${req.method} ${loggedPath} ${res.statusCode} in ${duration}ms`);
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
    const message = status >= 500 && process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

    console.error("Internal Server Error:", err instanceof Error ? err.message : err);

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

  // The bot must run only in the published environment so it reads the same
  // production database as accounts and one-time link tokens. Running it in
  // the dev workflow causes Telegram polling conflicts and invalid live tokens.
  if (process.env.NODE_ENV !== "development") {
    startTelegramBot();
  } else {
    log("Telegram bot disabled in development; it runs from the published site", "telegram");
  }


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
