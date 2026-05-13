import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { pool, db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

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
    log("Auto-promotion check complete");
  } catch (e) {
    console.error("Auto-promotion failed:", e);
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
