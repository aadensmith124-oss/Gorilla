import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, userIps } from "@shared/schema";
import pgSession from "connect-pg-simple";
import { pool, db } from "./db";

const scryptAsync = promisify(scrypt);

// Helper to hash password
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Helper to compare password
export async function comparePassword(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
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

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePassword(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", loginLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: User, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      req.login(user, async (err) => {
        if (err) return next(err);
        try {
          const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
          await db.insert(userIps).values({ userId: (user as any).id, ip });
        } catch {}
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/register", registerLimiter, async (req, res, next) => {
    try {
      const { username, password, email } = req.body;

      if (!username || typeof username !== "string" || username.length < 3 || username.length > 32) {
        return res.status(400).json({ message: "Username must be 3–32 characters." });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores." });
      }
      if (!password || typeof password !== "string" || password.length < 6 || password.length > 128) {
        return res.status(400).json({ message: "Password must be 6–128 characters." });
      }
      if (email && (typeof email !== "string" || email.length > 254)) {
        return res.status(400).json({ message: "Invalid email address." });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      
      const adminEmails = ["lifeanime886@gmail.com", "erizl9521@gmail.com"];
      const isAdminEmail = adminEmails.includes(req.body.email?.toLowerCase());
      
      const user = await storage.createUser({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        telegramUsername: req.body.telegramUsername || "",
        role: isAdminEmail ? "admin" : "user",
      } as any);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
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
