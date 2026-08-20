import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
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
  if (hashedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export const MIN_PASSWORD_LENGTH = 12;

export function toPublicUser<T extends Record<string, unknown>>(user: T) {
  const { password, loginCode, ...publicUser } = user;
  return publicUser;
}

function generateAnonUsername(): string {
  return "anon-" + randomBytes(4).toString("hex");
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
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

export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many password change attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || !req.isAuthenticated()) {
    return next();
  }

  const expectedHost = req.get("host");
  const origin = req.get("origin");
  const referer = req.get("referer");
  const source = origin || referer;

  try {
    if (!expectedHost || !source || new URL(source).host !== expectedHost) {
      return res.status(403).json({ message: "Invalid request origin" });
    }
  } catch {
    return res.status(403).json({ message: "Invalid request origin" });
  }

  next();
}

function establishSession(req: Request, user: User, next: NextFunction, res: Response, status: number) {
  req.session.regenerate((sessionError) => {
    if (sessionError) return next(sessionError);
    req.login(user, (loginError) => {
      if (loginError) return next(loginError);
      res.status(status).json(toPublicUser(user as unknown as Record<string, unknown>));
    });
  });
}

export function setupAuth(app: Express) {
  const PGStore = pgSession(session);

  let sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured in production");
  }
  if (!sessionSecret) {
    sessionSecret = randomBytes(32).toString("hex");
    console.warn("[SECURITY] SESSION_SECRET is not configured; using an ephemeral development-only secret.");
  }

  const sessionSettings: session.SessionOptions = {
    name: "uc_session",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new PGStore({ pool, createTableIfMissing: false }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    }
  };

  // Replit routes both previews and deployments through one trusted proxy.
  // This lets rate limiting use the forwarded client IP without rejecting
  // login requests because of the X-Forwarded-For header.
  app.set("trust proxy", 1);

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(requireSameOrigin);

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      // If the user row was deleted (DB reset, manual delete, etc.) treat the
      // session as invalid so Passport clears it rather than serving a ghost user.
      if (!user) return done(null, false);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Login — email + password
  app.post("/api/login", loginLimiter, async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || typeof email !== "string" || !password || typeof password !== "string") {
        console.warn("[security] failed login attempt");
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
      if (!user || user.isBanned) {
        console.warn("[security] failed login attempt");
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await comparePassword(password, user.password);
      if (!valid) {
        console.warn("[security] failed login attempt");
        return res.status(401).json({ message: "Invalid email or password" });
      }

      try {
        const ip = req.ip || "unknown";
        await db.insert(userIps).values({ userId: user.id, ip });
      } catch {}
      if (user.role === "admin") console.info(`[security] successful admin login for user ${user.id}`);
      establishSession(req, user, next, res, 200);
    } catch (err) {
      next(err);
    }
  });

  // Register — email + password, auto-generate username
  app.post("/api/register", registerLimiter, async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email required" });
      }
      if (!password || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      }

      const normalEmail = email.trim().toLowerCase();

      // Check if email already taken. The response remains generic to avoid
      // allowing attackers to enumerate registered accounts.
      const [existing] = await db.select().from(users).where(eq(users.email, normalEmail));
      if (existing) return res.status(400).json({ message: "Unable to create account with these details" });

      const username = generateAnonUsername();
      const hashed = await hashPassword(password);

      const user = await storage.createUser({
        username,
        email: normalEmail,
        password: hashed,
        loginCode: "",
        telegramUsername: "",
        role: "user",
      } as any);

      establishSession(req, user, next, res, 201);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(400).json({ message: "Unable to create account with these details" });
      }
      next(err);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((destroyError) => {
        if (destroyError) return next(destroyError);
        res.clearCookie("uc_session");
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(toPublicUser(req.user as unknown as Record<string, unknown>));
  });
}
