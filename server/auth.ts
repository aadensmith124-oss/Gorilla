import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, userIps, users } from "@shared/schema";
import pgSession from "connect-pg-simple";
import { pool, db } from "./db";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePassword(supplied: string, stored: string) {
  if (!stored || !stored.includes(".")) return false;
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateLoginCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(12);
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function generateAnonUsername(): string {
  return "anon_" + randomBytes(5).toString("hex");
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: "Too many accounts created from this IP. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function setupAuth(app: Express) {
  const PGStore = pgSession(session);

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    console.warn("[SECURITY] SESSION_SECRET env var is not set — using insecure fallback. Set it in production.");
  }

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || "rulf_fallback_dev_secret_change_in_prod",
    resave: false,
    saveUninitialized: false,
    store: new PGStore({ pool, createTableIfMissing: false }),
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Login with loginCode only
  app.post("/api/login", loginLimiter, async (req, res, next) => {
    try {
      const { loginCode } = req.body;
      if (!loginCode || typeof loginCode !== "string") {
        return res.status(400).json({ message: "Login code required" });
      }
      const code = loginCode.trim().toUpperCase();
      if (code.length !== 12) {
        return res.status(400).json({ message: "Login code must be 12 characters" });
      }

      // Look up user by loginCode
      const [user] = await db.select().from(users).where(eq(users.loginCode, code));
      if (!user) return res.status(401).json({ message: "Invalid login code" });
      if (user.isBanned) return res.status(401).json({ message: "This account has been suspended" });

      req.login(user, async (err) => {
        if (err) return next(err);
        try {
          const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
          await db.insert(userIps).values({ userId: user.id, ip });
        } catch {}
        res.status(200).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  // Register — no email required, auto-generate everything
  app.post("/api/register", registerLimiter, async (req, res, next) => {
    try {
      const loginCode = generateLoginCode();
      const username = generateAnonUsername();
      // Generate a unique internal email so the unique constraint doesn't fail
      const internalEmail = `${username}@acctplug.fo`;

      const user = await storage.createUser({
        username,
        email: internalEmail,
        password: "",
        loginCode,
        telegramUsername: "",
        role: "user",
      } as any);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ ...user, loginCode });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(req.user);
  });
}
