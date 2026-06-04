import express, { type Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { createForebitPayment, getForebitPayment } from "./forebit";
import { createStarsInvoiceLink, answerPreCheckoutQuery, setupTelegramWebhook } from "./telegram";
import { hashPassword, comparePassword } from "./auth";
import { cryptoPayments, orders, orderItems, verifications, variants, userIps, users, mails, mailReads, discountCodes, transactions, stockItems, cards, achs } from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, desc, sql } from "drizzle-orm";
import nodemailer from "nodemailer";

function isAdminOrWorker(req: any): boolean {
  const u = req.user as any;
  return req.isAuthenticated() && (u?.role === 'admin' || u?.isWorker === true);
}

// In-memory store for email bomb jobs
const emailBombJobs = new Map<string, { sent: number; total: number; status: "running" | "done" | "failed" }>();

// BIN lookup cache + throttle queue (binlist.net = ~10 req/min free tier)
const binCache = new Map<string, any>();
const binQueue: Array<{ bin: string; resolve: (v: any) => void }> = [];
let binQueueRunning = false;
function processBinQueue() {
  if (binQueueRunning || binQueue.length === 0) return;
  binQueueRunning = true;
  const { bin, resolve } = binQueue.shift()!;
  fetch(`https://lookup.binlist.net/${bin}`, { headers: { "Accept-Version": "3" } })
    .then(async r => {
      if (!r.ok) { resolve({ bin }); return; }
      const data = await r.json() as any;
      const result = {
        bin,
        bank: data.bank?.name ?? null,
        scheme: data.scheme ?? null,
        type: data.type ?? null,
        brand: data.brand ?? null,
        country: data.country?.name ?? null,
        countryCode: data.country?.alpha2 ?? null,
      };
      binCache.set(bin, result);
      resolve(result);
    })
    .catch(() => resolve({ bin }))
    .finally(() => {
      setTimeout(() => { binQueueRunning = false; processBinQueue(); }, 700);
    });
}
function lookupBin(bin: string): Promise<any> {
  if (binCache.has(bin)) return Promise.resolve(binCache.get(bin));
  return new Promise(resolve => { binQueue.push({ bin, resolve }); processBinQueue(); });
}

const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Too many game requests. Slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const walletLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many wallet requests. Slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith("/api"),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.set('etag', false);
  app.use('/api', apiLimiter);
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    next();
  });

  // Auth setup (handles /api/login, /api/register, /api/logout, /api/user)
  setupAuth(app);

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    const product = await storage.createProduct(req.body);
    res.status(201).json(product);
  });

  // Variants
  app.post(api.variants.create.path, async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    const variant = await storage.createVariant(req.body);
    res.status(201).json(variant);
  });

  // Stock
  app.post(api.stock.add.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const sellerId = req.body.sellerId ? Number(req.body.sellerId) : undefined;
    const count = await storage.addStockItems(req.body.variantId, req.body.rawContent, sellerId);
    res.json({ addedCount: count });
  });

  // Orders
  app.post(api.orders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = (req.user as any).id;
      const { items, cardIds, discountCodeId, sellerId } = req.body;
      const productItems = (items || []).filter((i: any) => !i.cardId && i.variantId > 0)
        .map((i: any) => ({ ...i, sellerId: sellerId || i.sellerId || undefined }));
      const cardIdList: number[] = cardIds || [];

      const order = await storage.createOrder(userId, productItems, cardIdList, discountCodeId ?? null);
      res.status(201).json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get(api.orders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const orders = await storage.getOrders((req.user as any).id);
    res.json(orders);
  });

  app.get(api.orders.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const order = await storage.getOrder(Number(req.params.id));
    if (!order || order.userId !== (req.user as any).id) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  });

  // Wallet & Redeem
  app.post(api.wallet.redeem.path, walletLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const code = await storage.getRedeemCode(req.body.code);
    
    if (!code || code.isUsed) {
      return res.status(400).json({ message: "Invalid or used code" });
    }

    await storage.markRedeemCodeUsed(code.id, (req.user as any).id);
    const updatedUser = await storage.updateUserBalance((req.user as any).id, code.amount);
    await storage.createTransaction((req.user as any).id, code.amount, "deposit", `Redeemed code: ${code.code}`);

    res.json({ newBalance: updatedUser.balance, amountAdded: code.amount });
  });

  app.get(api.wallet.transactions.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const txs = await storage.getTransactions((req.user as any).id);
    res.json(txs);
  });

  // Combined deposits list (crypto + cashapp deposits) for topup history
  app.get("/api/deposits", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    try {
      // Crypto deposit payments
      const cryptoRows = await db
        .select()
        .from(cryptoPayments)
        .where(and(eq(cryptoPayments.userId, userId), eq(cryptoPayments.purpose, "deposit")))
        .orderBy(desc(cryptoPayments.createdAt))
        .limit(30);

      // CashApp deposit-only orders (orders with no items, paymentMethod CashApp)
      const cashappRows = await db
        .select()
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.paymentMethod, "CashApp")))
        .orderBy(desc(orders.createdAt))
        .limit(30);

      // Filter cashapp orders that are deposit-only (no order items)
      const allOrderIds = cashappRows.map(o => o.id);
      let depositOnlyCashapp = cashappRows;
      if (allOrderIds.length > 0) {
        const itemsInOrders = await db
          .select({ orderId: orderItems.orderId })
          .from(orderItems)
          .where(sql`${orderItems.orderId} = ANY(ARRAY[${sql.join(allOrderIds.map(id => sql`${id}`), sql`, `)}]::int[])`);
        const orderIdsWithItems = new Set(itemsInOrders.map(i => i.orderId));
        depositOnlyCashapp = cashappRows.filter(o => !orderIdsWithItems.has(o.id));
      }

      const cryptoDeposits = cryptoRows.map(p => ({
        id: `crypto_${p.id}`,
        type: "crypto" as const,
        amount: p.amount,
        status: p.status,
        paymentId: p.forebitPaymentId,
        checkoutUrl: p.checkoutUrl,
        createdAt: p.createdAt,
      }));

      const cashappDeposits = depositOnlyCashapp.map(o => ({
        id: `cashapp_${o.id}`,
        type: "cashapp" as const,
        amount: o.total,
        status: o.status,
        paymentNote: o.paymentNote,
        createdAt: o.createdAt,
      }));

      const all = [...cryptoDeposits, ...cashappDeposits].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json(all);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: all deposits from all users
  app.get("/api/admin/deposits", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const cryptoRows = await db
        .select({
          id: cryptoPayments.id, userId: cryptoPayments.userId, amount: cryptoPayments.amount,
          status: cryptoPayments.status, createdAt: cryptoPayments.createdAt,
          username: users.username,
        })
        .from(cryptoPayments)
        .leftJoin(users, eq(cryptoPayments.userId, users.id))
        .where(eq(cryptoPayments.purpose, "deposit"))
        .orderBy(desc(cryptoPayments.createdAt))
        .limit(200);

      const cashappRows = await db
        .select({
          id: orders.id, userId: orders.userId, total: orders.total,
          status: orders.status, paymentNote: orders.paymentNote, createdAt: orders.createdAt,
          username: users.username,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(eq(orders.paymentMethod, "CashApp"))
        .orderBy(desc(orders.createdAt))
        .limit(200);

      const allOrderIds = cashappRows.map(o => o.id);
      let depositOnlyCashapp = cashappRows;
      if (allOrderIds.length > 0) {
        const itemsInOrders = await db
          .select({ orderId: orderItems.orderId })
          .from(orderItems)
          .where(sql`${orderItems.orderId} = ANY(ARRAY[${sql.join(allOrderIds.map(id => sql`${id}`), sql`, `)}]::int[])`);
        const orderIdsWithItems = new Set(itemsInOrders.map(i => i.orderId));
        depositOnlyCashapp = cashappRows.filter(o => !orderIdsWithItems.has(o.id));
      }

      const result = [
        ...cryptoRows.map(p => ({
          id: `crypto_${p.id}`, type: "crypto", username: p.username ?? "?",
          amount: p.amount, status: p.status, createdAt: p.createdAt,
        })),
        ...depositOnlyCashapp.map(o => ({
          id: `cashapp_${o.id}`, type: "cashapp", username: o.username ?? "?",
          amount: o.total, status: o.status, paymentNote: o.paymentNote, createdAt: o.createdAt,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Games
  app.post(api.games.dice.path, gameLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    const bet = Number(req.body.betAmount);

    if (!Number.isFinite(bet) || bet <= 0) {
      return res.status(400).json({ message: "Invalid bet amount." });
    }
    if (bet > 100000) {
      return res.status(400).json({ message: "Bet amount exceeds maximum allowed." });
    }
    if (user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

    // Deduct bet
    await storage.updateUserBalance(user.id, -bet);
    await storage.createTransaction(user.id, -bet, "loss", "Dice game bet");

    // Game Logic: Roll 2 dice (1-6). 
    // Spec: "Roll 2 dice vs system. Higher total wins."
    const userRoll = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    const systemRoll = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
    
    const userTotal = userRoll[0] + userRoll[1];
    const systemTotal = systemRoll[0] + systemRoll[1];
    
    const won = userTotal > systemTotal;
    let payout = 0;

    if (won) {
      payout = bet * 2; // 2x multiplier
      await storage.updateUserBalance(user.id, payout);
      await storage.createTransaction(user.id, payout, "win", "Dice game win");
    }

    const updatedUser = await storage.getUser(user.id);

    res.json({
      won,
      roll: userRoll,
      systemRoll: systemRoll,
      userTotal,
      systemTotal,
      payout,
      newBalance: updatedUser?.balance || 0,
    });
  });

  app.post(api.games.spin.path, gameLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;

    if (user.lastDailySpin) {
      const last = new Date(user.lastDailySpin);
      const now = new Date();
      if (last.getDate() === now.getDate() && last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear()) {
         return res.status(400).json({ message: "Already spun today" });
      }
    }

    // Rewards: $0.05, $0.10, $0.50, $1, $5, $10
    // Weighted probabilities (normalized to request)
    const rewards = [
      { amount: 5, weight: 80 },
      { amount: 10, weight: 60 },
      { amount: 50, weight: 50 },
      { amount: 100, weight: 30 },
      { amount: 500, weight: 20 },
      { amount: 1000, weight: 10 },
    ];

    const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    let reward = 0;

    for (const r of rewards) {
      if (random < r.weight) {
        reward = r.amount;
        break;
      }
      random -= r.weight;
    }

    await storage.updateUserBalance(user.id, reward);
    await storage.updateLastDailySpin(user.id);
    await storage.createTransaction(user.id, reward, "daily_spin", "Daily spin reward");

    const updatedUser = await storage.getUser(user.id);
    
    res.json({
      reward, // in cents
      newBalance: updatedUser?.balance || 0,
    });
  });

  // User - Update Email
  app.patch("/api/user/email", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { email } = req.body;
      if (!email || !email.includes("@")) return res.status(400).json({ message: "Valid email required" });
      const user = await storage.updateUser((req.user as any).id, { email });
      res.json(user);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/user/telegram", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { telegramUsername } = req.body;
      if (!telegramUsername) return res.status(400).json({ message: "Telegram username required" });
      const user = await storage.updateUser((req.user as any).id, { telegramUsername });
      res.json(user);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // User Rank
  app.get("/api/user/rank", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const result = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), sql`amount > 0`, sql`type IN ('deposit', 'manual_deposit')`));
    const totalDeposited = Number(result[0]?.total ?? 0);
    const rank = totalDeposited >= 100000 ? "nyc" : totalDeposited >= 50000 ? "vip" : totalDeposited >= 10000 ? "regular" : "newbie";
    const discountPct = rank === "nyc" ? 10 : rank === "vip" ? 5 : rank === "regular" ? 2 : 0;
    const nextRankAt = rank === "newbie" ? 10000 : rank === "regular" ? 50000 : rank === "vip" ? 100000 : null;
    res.json({ rank, discountPct, totalDeposited, nextRankAt });
  });

  // User - Update Password
  app.patch("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both passwords required" });
      const [currentUser] = await db.select().from(users).where(eq(users.id, (req.user as any).id));
      if (!currentUser) return res.status(404).json({ message: "User not found" });
      const isMatch = await comparePassword(currentPassword, currentUser.password);
      if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });
      const hashed = await hashPassword(newPassword);
      const user = await storage.updateUser((req.user as any).id, { password: hashed });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Admin - Deliver Order
  app.post(api.admin.deliverOrder.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const orderId = Number(req.params.id);
      // Accept either deliveryContents (per-product map) or legacy deliveryContent (string)
      let content: string;
      if (req.body.deliveryContents && typeof req.body.deliveryContents === "object") {
        content = JSON.stringify(req.body.deliveryContents);
      } else {
        content = req.body.deliveryContent || "";
      }
      const order = await storage.updateOrderDelivery(orderId, content);
      res.json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Admin - Ban User
  app.post(api.admin.banUser.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const user = await storage.banUser(Number(req.params.id));
      res.json(user);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Admin - Unban User
  app.post(api.admin.unbanUser.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const user = await storage.unbanUser(Number(req.params.id));
      res.json(user);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Verification - Submit
  app.post("/api/verification/submit", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = (req.user as any).id;
      const { telegramUsername, channelLink, channelName, agreedToTerms } = req.body;
      if (!agreedToTerms) return res.status(400).json({ message: "Must agree to terms" });
      const existing = await db.select().from(verifications).where(eq(verifications.userId, userId));
      if (existing.length > 0) {
        const existingStatus = existing[0].status;
        if (existingStatus === "approved") {
          return res.status(400).json({ message: "Already verified" });
        }
        const [updated] = await db.update(verifications).set({ telegramUsername, channelLink, channelName, agreedToTerms, status: "pending" as any, adminNote: "", termMessage: "" }).where(eq(verifications.userId, userId)).returning();
        return res.json(updated);
      }
      const [verif] = await db.insert(verifications).values({ userId, telegramUsername, channelLink, channelName, agreedToTerms }).returning();
      res.status(201).json(verif);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Verification - Get Mine
  app.get("/api/verification/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const [verif] = await db.select().from(verifications).where(eq(verifications.userId, (req.user as any).id));
    res.json(verif || null);
  });

  // Admin - List Verifications
  app.get("/api/admin/verifications", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    const all = await db.select().from(verifications).orderBy(verifications.createdAt);
    res.json(all);
  });

  // Admin - Approve Verification
  app.post("/api/admin/verifications/:id/approve", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    const [verif] = await db.update(verifications).set({ status: "approved" as any, adminNote: req.body.note || "" }).where(eq(verifications.id, Number(req.params.id))).returning();
    res.json(verif);
  });

  // Admin - Deny Verification
  app.post("/api/admin/verifications/:id/deny", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    const [verif] = await db.update(verifications).set({ status: "denied" as any, adminNote: req.body.note || "" }).where(eq(verifications.id, Number(req.params.id))).returning();
    res.json(verif);
  });

  // Admin - Term a seller (ban with message)
  app.post("/api/admin/verifications/:id/term", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    const [verif] = await db.update(verifications).set({ status: "termed" as any, termMessage: req.body.message || "" }).where(eq(verifications.id, Number(req.params.id))).returning();
    res.json(verif);
  });

  // Admin - Unverify a seller (revoke, must reapply)
  app.post("/api/admin/verifications/:id/unverify", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    const [verif] = await db.update(verifications).set({ status: "denied" as any, adminNote: "Verification revoked by admin" }).where(eq(verifications.id, Number(req.params.id))).returning();
    res.json(verif);
  });

  // Admin - Sellers list (all submitted verifications for management)
  app.get("/api/admin/sellers", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    try {
      const { rows } = await db.execute(sql`
        SELECT v.id, v.user_id, v.telegram_username, v.channel_link, v.channel_name,
               v.agreed_to_terms, v.status, v.admin_note, v.term_message, v.created_at,
               u.id as u_id, u.username as u_username, u.email as u_email
        FROM verifications v
        LEFT JOIN users u ON u.id = v.user_id
        ORDER BY v.created_at DESC
      `) as any;
      const result = [];
      for (const row of rows) {
        if (!row.u_id) continue;
        const { rows: ipRows } = await db.execute(sql`SELECT ip FROM user_ips WHERE user_id = ${row.user_id} ORDER BY logged_at DESC`) as any;
        const uniqueIps = Array.from(new Set(ipRows.map((i: any) => i.ip)));
        result.push({
          id: row.id, userId: row.user_id, telegramUsername: row.telegram_username,
          channelLink: row.channel_link, channelName: row.channel_name,
          agreedToTerms: row.agreed_to_terms, status: row.status,
          adminNote: row.admin_note, termMessage: row.term_message, createdAt: row.created_at,
          user: { id: row.u_id, username: row.u_username, email: row.u_email },
          ips: uniqueIps, totalLogins: ipRows.length,
        });
      }
      res.json(result);
    } catch (e: any) {
      console.error("sellers route error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // Admin - Approved sellers only (for mail recipient dropdown)
  app.get("/api/admin/sellers/approved", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    try {
      const { rows } = await db.execute(sql`
        SELECT v.id, v.user_id, v.telegram_username, v.channel_link, v.channel_name,
               v.agreed_to_terms, v.status, v.admin_note, v.term_message, v.created_at,
               u.id as u_id, u.username as u_username, u.email as u_email
        FROM verifications v
        LEFT JOIN users u ON u.id = v.user_id
        WHERE v.status = 'approved'
        ORDER BY v.created_at DESC
      `) as any;
      const result = rows.filter((r: any) => r.u_id).map((row: any) => ({
        id: row.id, userId: row.user_id, telegramUsername: row.telegram_username,
        channelLink: row.channel_link, channelName: row.channel_name,
        agreedToTerms: row.agreed_to_terms, status: row.status,
        adminNote: row.admin_note, termMessage: row.term_message, createdAt: row.created_at,
        user: { id: row.u_id, username: row.u_username, email: row.u_email },
      }));
      res.json(result);
    } catch (e: any) {
      console.error("sellers/approved route error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // === MAIL ROUTES ===

  // Admin: send mail to one seller or all sellers
  app.post("/api/admin/mails/send", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    const { title, body, recipientId } = req.body;
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ message: "Title and body required" });
    const [mail] = await db.insert(mails).values({
      title: title.trim(),
      body: body.trim(),
      senderId: (req.user as any).id,
      recipientId: recipientId ? Number(recipientId) : null,
    }).returning();
    res.json(mail);
  });

  // User: get own mails (all-sellers broadcasts + personal)
  app.get("/api/mails", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const allMails = await db.select().from(mails).orderBy(desc(mails.createdAt));
    const myMails = allMails.filter(m => m.recipientId === null || m.recipientId === userId);
    const reads = await db.select().from(mailReads).where(eq(mailReads.userId, userId));
    const readIds = new Set(reads.map(r => r.mailId));
    res.json(myMails.map(m => ({ ...m, isRead: readIds.has(m.id) })));
  });

  // User: mark mail as read
  app.post("/api/mails/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const mailId = Number(req.params.id);
    const existing = await db.select().from(mailReads).where(and(eq(mailReads.mailId, mailId), eq(mailReads.userId, userId)));
    if (existing.length === 0) {
      await db.insert(mailReads).values({ mailId, userId });
    }
    res.json({ ok: true });
  });

  // Admin - Update Order Status
  app.patch("/api/admin/orders/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const { status } = req.body;
      const [order] = await db.update(orders).set({ status } as any).where(eq(orders.id, Number(req.params.id))).returning();
      res.json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Admin - Test Order (No Payment)
  app.post("/api/admin/test-order", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const { productId, variantId, quantity } = req.body;
      const [variant] = await db.select().from(variants).where(eq(variants.id, variantId));
      if (!variant) throw new Error("Variant not found");
      
      const total = variant.price * quantity;
      const orderId = `TEST-${Date.now()}`;
      
      const [order] = await db.insert(orders).values({
        orderId,
        userId: (req.user as any).id,
        status: "delivering" as any,
        total
      }).returning();

      await db.insert(orderItems).values({
        orderId: order.id,
        variantId: variant.id,
        stockItemId: null,
        cardId: null,
        itemType: "product",
        price: variant.price,
        quantity,
      });
      
      res.status(201).json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Admin
  app.get(api.admin.dashboard.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.post(api.admin.generateCodes.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { amount, count } = req.body;
    const codes = [];
    
    for (let i = 0; i < count; i++) {
      const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
      const codeStr = `VOUCH-${randomStr}`;
      await storage.createRedeemCode(codeStr, amount);
      codes.push(codeStr);
    }
    res.json({ codes });
  });

  // Admin Products (all products including hidden)
  app.get("/api/admin/products", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    const products = await storage.getAllProducts();
    res.json(products);
  });

  app.patch("/api/admin/products/:id", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    const product = await storage.updateProduct(Number(req.params.id), req.body);
    res.json(product);
  });

  app.delete("/api/admin/products/:id", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteProduct(Number(req.params.id));
    res.json({ success: true });
  });

  app.patch("/api/admin/variants/:id", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    const variant = await storage.updateVariant(Number(req.params.id), req.body);
    res.json(variant);
  });

  app.delete("/api/admin/variants/:id", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteVariant(Number(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/admin/stock", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    const item = await storage.addSingleStockItem(req.body.variantId, req.body.content);
    res.status(201).json(item);
  });

  app.post("/api/admin/stock/bulk", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    const sellerId = req.body.sellerId ? Number(req.body.sellerId) : undefined;
    const result = await storage.addStockItems(req.body.variantId, req.body.rawContent, sellerId);
    res.json({ addedCount: result.added, skippedCount: result.skipped });
  });

  app.get("/api/admin/stock/:variantId", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    const items = await storage.getStockItems(Number(req.params.variantId));
    res.json(items);
  });

  app.delete("/api/admin/stock/:id", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteStockItem(Number(req.params.id));
    res.json({ success: true });
  });

  // Admin/Worker - Get all orders
  app.get("/api/admin/orders", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    const allOrders = await storage.getAllOrders();
    res.json(allOrders);
  });

  // Admin/Worker - Get all users
  app.get("/api/admin/users", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    const allUsers = await storage.getAllUsers();
    res.json(allUsers);
  });

  // Old Admin Orders (keeping for backward compat)
  app.get("/api/admin/orders-old", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const orders = await storage.getAllOrders();
    res.json(orders);
  });

  app.post("/api/admin/orders/:id/refund", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const order = await storage.refundOrder(Number(req.params.id));
    res.json(order);
  });

  app.post("/api/admin/orders/:id/replace", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const order = await storage.replaceOrder(Number(req.params.id));
      res.json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { isBanned, role, email } = req.body;
    const user = await storage.updateUser(Number(req.params.id), { isBanned, role, email });
    res.json(user);
  });

  app.post("/api/admin/users/:id/balance", async (req, res) => {
    if (!req.isAuthenticated() || ((req.user as any).role !== 'admin' && !(req.user as any).isWorker)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.updateUserBalance(Number(req.params.id), req.body.amount);
    if (req.body.amount > 0) {
      await storage.updateProtectedBalance(Number(req.params.id), req.body.amount);
    }
    await storage.createTransaction(Number(req.params.id), req.body.amount, "admin_adjustment", "Admin balance adjustment");
    res.json(user);
  });

  // Set user balance to an absolute value
  app.post("/api/admin/users/:id/set-balance", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = Number(req.params.id);
    const newBalance = Math.round(Number(req.body.balance) * 100); // dollars → cents
    const existing = await storage.getUser(userId);
    if (!existing) return res.status(404).json({ message: "User not found" });
    const delta = newBalance - existing.balance;
    await db.update(users).set({ balance: newBalance } as any).where(eq(users.id, userId));
    await storage.createTransaction(userId, delta, "admin_adjustment", `Admin set balance to $${(newBalance / 100).toFixed(2)}`);
    const updated = await storage.getUser(userId);
    res.json(updated);
  });

  // Set user role (promote/demote admin)
  app.post("/api/admin/users/:id/set-role", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = Number(req.params.id);
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    await db.update(users).set({ role } as any).where(eq(users.id, userId));
    const updated = await storage.getUser(userId);
    res.json(updated);
  });

  // Toggle worker status
  app.post("/api/admin/users/:id/set-worker", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = Number(req.params.id);
    const { isWorker } = req.body;
    await db.update(users).set({ isWorker: Boolean(isWorker) } as any).where(eq(users.id, userId));
    const updated = await storage.getUser(userId);
    res.json(updated);
  });

  // Admin: get crypto addresses for a user
  app.get("/api/admin/users/:id/crypto-addresses", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const addresses = await storage.getCryptoAddresses(Number(req.params.id));
    res.json(addresses);
  });

  // Admin: set crypto address for a user
  app.post("/api/admin/users/:id/crypto-addresses", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { currency, address } = req.body;
    if (!currency || !address) return res.status(400).json({ message: "currency and address required" });
    const result = await storage.setCryptoAddress(Number(req.params.id), currency, address);
    res.json(result);
  });

  // User: get own crypto addresses
  app.get("/api/user/crypto-addresses", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const addresses = await storage.getCryptoAddresses(userId);
    res.json(addresses);
  });

  // Admin Balance Codes (list)
  app.get("/api/admin/codes", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const codes = await storage.getAllRedeemCodes();
    res.json(codes);
  });

  // === DISCOUNT CODES ===

  // Validate a discount code (authenticated users)
  app.post("/api/discount/validate", walletLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { code, cartTotal } = req.body;
      if (!code || typeof code !== "string") return res.status(400).json({ message: "Code required" });

      const [dc] = await db.select().from(discountCodes)
        .where(eq(discountCodes.code, code.toUpperCase().trim()));

      if (!dc || !dc.isActive) return res.status(404).json({ message: "Invalid or inactive code" });
      if (dc.expiresAt && new Date(dc.expiresAt) < new Date()) return res.status(400).json({ message: "This code has expired" });
      if (dc.maxUses !== null && dc.usedCount >= dc.maxUses) return res.status(400).json({ message: "This code has reached its usage limit" });
      if (dc.minOrder && cartTotal < dc.minOrder) {
        return res.status(400).json({ message: `Minimum order of $${(dc.minOrder / 100).toFixed(2)} required` });
      }

      const discountAmount = dc.type === "percent"
        ? Math.round(cartTotal * dc.value / 100)
        : Math.min(dc.value, cartTotal);

      res.json({ id: dc.id, code: dc.code, type: dc.type, value: dc.value, discountAmount });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Admin: list discount codes
  app.get("/api/admin/discount-codes", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    const all = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
    res.json(all);
  });

  // Admin: create discount code
  app.post("/api/admin/discount-codes", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    try {
      const { code, type, value, minOrder, maxUses, expiresAt } = req.body;
      if (!code || !type || !value) return res.status(400).json({ message: "Code, type, and value required" });
      if (!["percent", "fixed"].includes(type)) return res.status(400).json({ message: "Type must be percent or fixed" });
      if (type === "percent" && (value < 1 || value > 100)) return res.status(400).json({ message: "Percent must be 1–100" });

      const [dc] = await db.insert(discountCodes).values({
        code: code.toUpperCase().trim(),
        type,
        value: type === "fixed" ? Math.round(parseFloat(value) * 100) : parseInt(value),
        minOrder: minOrder ? Math.round(parseFloat(minOrder) * 100) : 0,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }).returning();
      res.status(201).json(dc);
    } catch (e: any) {
      if (e.code === "23505") return res.status(400).json({ message: "A code with that name already exists" });
      res.status(400).json({ message: e.message });
    }
  });

  // Admin: toggle active / delete discount code
  app.patch("/api/admin/discount-codes/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    const [dc] = await db.update(discountCodes).set({ isActive: req.body.isActive }).where(eq(discountCodes.id, Number(req.params.id))).returning();
    res.json(dc);
  });

  app.delete("/api/admin/discount-codes/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') return res.status(401).json({ message: "Unauthorized" });
    await db.delete(discountCodes).where(eq(discountCodes.id, Number(req.params.id)));
    res.json({ success: true });
  });

  // Admin Announcements
  app.get("/api/admin/announcements", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const announcements = await storage.getAllAnnouncements();
    res.json(announcements);
  });

  app.post("/api/admin/announcements", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const announcement = await storage.createAnnouncement(req.body);
    res.status(201).json(announcement);
  });

  // Admin Logs
  app.get("/api/admin/logs", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const logs = await storage.getAdminLogs();
    res.json(logs);
  });

  // Image Upload (Admin only)
  app.post("/api/upload", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { filename, mimeType, data } = req.body;
    if (!filename || !mimeType || !data) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const image = await storage.uploadImage(filename, mimeType, data);
    res.status(201).json({ id: image.id, url: `/api/images/${image.id}` });
  });

  // Serve uploaded images
  app.get("/api/images/:id", async (req, res) => {
    const image = await storage.getImage(Number(req.params.id));
    if (!image) return res.status(404).json({ message: "Image not found" });
    
    const buffer = Buffer.from(image.data, 'base64');
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  });

  // Cards
  app.get("/api/cards", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { rows } = await db.execute(sql`
      SELECT c.id, c.card_number, c.masked_card, c.expiry, c.cvv, c.country, c.extras,
             c.price, c.hr_percent, c.is_sold, c.is_first_hand, c.user_id, c.created_at,
             u.seller_type, u.seller_display_name, u.username as seller_username
      FROM cards c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.is_sold = false
      ORDER BY c.created_at DESC
    `) as any;

    // Collect unique BINs
    const uniqueBins = Array.from(new Set(rows.map((r: any) =>
      (r.card_number ?? "").replace(/\D/g, "").substring(0, 6)
    ).filter((b: string) => b.length === 6))) as string[];

    // Return cached BINs instantly; kick off background lookups for uncached ones
    const binDataMap: Record<string, any> = {};
    const uncached: string[] = [];
    for (const bin of uniqueBins) {
      if (binCache.has(bin)) {
        binDataMap[bin] = binCache.get(bin);
      } else {
        uncached.push(bin);
      }
    }
    // Fire background lookups so they're cached for next request
    if (uncached.length > 0) {
      // Await up to 5 cards worth of BIN lookups (3.5s max) to seed the cache
      const eagerLimit = uncached.splice(0, 5);
      Promise.allSettled(eagerLimit.map(bin =>
        lookupBin(bin).then(d => { binDataMap[bin] = d; }).catch(() => {})
      )).catch(() => {});
      // Queue the rest in background without blocking
      uncached.forEach(bin => lookupBin(bin).catch(() => {}));
    }

    res.json(rows.map((r: any) => {
      const bin = (r.card_number ?? "").replace(/\D/g, "").substring(0, 6);
      return {
        id: r.id, cardNumber: r.card_number, maskedCard: r.masked_card,
        expiry: r.expiry, cvv: r.cvv, country: r.country, extras: r.extras,
        price: r.price, hrPercent: r.hr_percent ?? 80, isSold: r.is_sold, isFirstHand: r.is_first_hand,
        userId: r.user_id, createdAt: r.created_at,
        sellerType: r.seller_type, sellerDisplayName: r.seller_display_name, sellerUsername: r.seller_username,
        binData: binDataMap[bin] ?? null,
      };
    }));
  });

  app.post("/api/cards", async (req, res) => {
    if (!req.isAuthenticated() || ((req.user as any).role !== 'admin' && !(req.user as any).isWorker)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Extract card number from the full delivery item (first pipe-delimited segment)
    const fullItem = req.body.extras || "";
    const firstSegment = fullItem.split(/[|\t]/)[0].replace(/\D/g, "").trim();
    const cardNumber = firstSegment || req.body.cardNumber || "";
    const masked = cardNumber.length >= 4
      ? cardNumber.substring(0, 6) + "*".repeat(Math.max(0, cardNumber.length - 10)) + cardNumber.slice(-4)
      : cardNumber;
    let country = "Unknown";

    if (cardNumber.length >= 6) {
      const bin = cardNumber.substring(0, 6);
      try {
        const binRes = await fetch(`https://lookup.binlist.net/${bin}`, { headers: { "Accept-Version": "3" } });
        if (binRes.ok) { const d = await binRes.json(); country = d.country?.name || "Unknown"; }
      } catch {}
    }

    // Validate hrPercent: strip non-numeric, clamp 1-100, default 1
    const rawHr = String(req.body.hrPercent ?? "80").replace(/[^0-9]/g, "");
    const hrPercent = rawHr ? Math.max(1, Math.min(100, parseInt(rawHr, 10))) : 1;

    const card = await storage.createCard({
      cardNumber,
      maskedCard: masked,
      expiry: "",
      cvv: "",
      country,
      extras: fullItem.trim(),
      price: Math.round(parseFloat(req.body.price || "0") * 100) || req.body.price,
      isFirstHand: false,
      hrPercent,
    });
    res.status(201).json(card);
  });

  app.post("/api/cards/:id/purchase", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const cardId = Number(req.params.id);
      const userId = (req.user as any).id;
      const card = await storage.getCard(cardId);
      if (!card) return res.status(404).json({ message: "Card not found" });

      // Apply rank discount
      const rankResult = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), sql`amount > 0`, sql`type IN ('deposit', 'manual_deposit')`));
      const totalDeposited = Number(rankResult[0]?.total ?? 0);
      const rankPct = totalDeposited >= 100000 ? 10 : totalDeposited >= 50000 ? 5 : totalDeposited >= 10000 ? 2 : 0;
      const finalPrice = rankPct > 0 ? Math.max(0, Math.round(card.price * (1 - rankPct / 100))) : card.price;

      const user = await storage.getUser(userId);
      if (!user || user.balance < finalPrice) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      await storage.updateUserBalance(userId, -finalPrice);
      await storage.createTransaction(userId, -finalPrice, "purchase", `Purchased card ${card.maskedCard}`);

      // Credit seller 80% of the ORIGINAL price (not discounted)
      const originalSellerId = card.userId;
      const updatedCard = await storage.purchaseCard(cardId, userId, finalPrice);

      if (originalSellerId && originalSellerId !== userId) {
        const sellerCut = Math.floor(card.price * 0.8);
        await db.update(users)
          .set({
            sellerBalance: sql`${users.sellerBalance} + ${sellerCut}`,
            totalSellerEarned: sql`${users.totalSellerEarned} + ${sellerCut}`,
          })
          .where(eq(users.id, originalSellerId));
      }

      res.json(updatedCard);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/user/cards", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const cards = await storage.getUserCards((req.user as any).id);
    res.json(cards);
  });

  app.delete("/api/admin/cards/:id", async (req, res) => {
    if (!isAdminOrWorker(req)) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteCard(Number(req.params.id));
    res.json({ success: true });
  });

  // Support
  app.post("/api/support", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const ticket = await storage.createSupportTicket({ ...req.body, userId: (req.user as any).id });
    res.status(201).json(ticket);
  });

  app.get("/api/support", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const tickets = await storage.getSupportTickets((req.user as any).id);
    res.json(tickets);
  });

  app.get("/api/admin/support", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const tickets = await storage.getSupportTickets();
    res.json(tickets);
  });

  app.patch("/api/admin/support/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { action, message } = req.body;
    const ticket = await storage.getSupportTicket(Number(req.params.id));
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    try {
      if (action === "refund") {
        const order = await db.select().from(orders).where(eq(orders.orderId, ticket.orderId)).limit(1);
        if (order.length > 0) {
          await storage.refundOrder(order[0].id);
        }
      } else if (action === "replace") {
        const order = await db.select().from(orders).where(eq(orders.orderId, ticket.orderId)).limit(1);
        if (order.length > 0) {
          await storage.replaceOrder(order[0].id);
        }
      }
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }

    const updated = await storage.updateSupportTicket(Number(req.params.id), { 
      status: "closed",
      adminMessage: message || ticket.adminMessage
    });
    res.json(updated);
  });

  app.post("/api/orders/crypto", async (req, res) => {
    return res.status(400).json({ message: "Crypto payments are currently unavailable." });
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    let pendingOrderId: number | null = null;
    try {
      const userId = (req.user as any).id;
      const { items, cardIds } = req.body;
      const productItems = (items || []).filter((i: any) => !i.cardId && i.variantId > 0);
      const cardIdList: number[] = cardIds || [];

      const order = await storage.createPendingOrder(userId, productItems, cardIdList);
      pendingOrderId = order.id;

      const totalWithFee = order.total;
      const amountUsd = totalWithFee / 100;

      const origin = (req.headers.origin as string) || `https://${req.headers.host}`;
      const returnUrl = `${origin}/profile?tab=orders`;

      const forebitPayment = await createForebitPayment({
        amount: amountUsd,
        currency: "USD",
        returnUrl,
      });

      if (!forebitPayment.id || !forebitPayment.url) {
        await storage.cancelPendingOrder(order.id);
        pendingOrderId = null;
        return res.status(502).json({ message: "Payment provider error. Please try again." });
      }

      await db.insert(cryptoPayments).values({
        userId,
        forebitPaymentId: forebitPayment.id,
        amount: totalWithFee,
        currency: "USD",
        status: "pending",
        purpose: "order",
        orderId: order.id,
        checkoutUrl: forebitPayment.url,
        metadata: null,
      });

      pendingOrderId = null;
      res.status(201).json({
        order,
        paymentId: forebitPayment.id,
        checkoutUrl: forebitPayment.url,
      });
    } catch (e: any) {
      console.error("Crypto order creation failed:", e);
      if (pendingOrderId) {
        try { await storage.cancelPendingOrder(pendingOrderId); } catch {}
      }
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/payments/forebit/create", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { amount, purpose, orderId } = req.body;
      // amount arrives in cents from the frontend (e.g. 500 = $5.00)
      const amountUsd = parseFloat(amount) / 100;
      
      if (!amountUsd || amountUsd < 1) {
        return res.status(400).json({ message: "Minimum deposit is $1" });
      }
      if (amountUsd > 1000000000) {
        return res.status(400).json({ message: "Maximum deposit is $1,000,000,000" });
      }

      const userId = (req.user as any).id;

      const forebitPayment = await createForebitPayment({
        amount: amountUsd,
        currency: "USD",
      });

      if (!forebitPayment.id) {
        console.error("Forebit: payment created but missing ID", forebitPayment);
        return res.status(502).json({ message: "Payment provider returned an invalid response. Please try again." });
      }

      if (!forebitPayment.url) {
        console.error("Forebit: payment created but missing checkout URL", forebitPayment);
        return res.status(502).json({ message: "Payment provider did not return a checkout link. Please try again." });
      }

      await db.insert(cryptoPayments).values({
        userId,
        forebitPaymentId: forebitPayment.id,
        amount: Math.round(amountUsd * 100),
        currency: "USD",
        status: "pending",
        purpose: purpose || "deposit",
        orderId: orderId ? Number(orderId) : null,
        checkoutUrl: forebitPayment.url,
        metadata: JSON.stringify({ forebitResponse: forebitPayment }),
      });

      res.json({
        paymentId: forebitPayment.id,
        checkoutUrl: forebitPayment.url,
      });
    } catch (error: any) {
      console.error("Forebit payment creation failed:", error);
      res.status(500).json({ message: "Failed to create payment. Please try again later." });
    }
  });

  app.get("/api/payments/forebit/:paymentId/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { paymentId } = req.params;
      const userId = (req.user as any).id;

      const [localPayment] = await db
        .select()
        .from(cryptoPayments)
        .where(eq(cryptoPayments.forebitPaymentId, paymentId))
        .limit(1);

      if (!localPayment || localPayment.userId !== userId) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (localPayment.status === "completed") {
        return res.json({ status: "completed", amount: localPayment.amount, purpose: localPayment.purpose, orderId: localPayment.orderId });
      }

      try {
        const forebitResp = await getForebitPayment(paymentId);
        const nestedData = forebitResp.data || forebitResp.payment || forebitResp.result || {};
        const rawStatus = forebitResp.status || (nestedData as any).status || "";
        const newStatus = mapForebitStatus(typeof rawStatus === 'string' ? rawStatus : "");

        if (newStatus !== localPayment.status) {
          const [updated] = await db
            .update(cryptoPayments)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(and(eq(cryptoPayments.id, localPayment.id), ne(cryptoPayments.status, 'completed')))
            .returning();

          if (newStatus === "completed" && updated) {
            await processForebitCompletion(localPayment);
          }
          if ((newStatus === "failed" || newStatus === "expired") && updated && localPayment.purpose === "order" && localPayment.orderId) {
            await storage.cancelPendingOrder(localPayment.orderId);
          }
        }

        res.json({ status: newStatus, amount: localPayment.amount, purpose: localPayment.purpose, orderId: localPayment.orderId });
      } catch {
        res.json({ status: localPayment.status, amount: localPayment.amount });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/webhooks/forebit", async (req, res) => {
    try {
      console.log("Forebit webhook received:", JSON.stringify(req.body, null, 2));
      const body = req.body || {};
      const nested = body.data || body.payment || body.result || {};
      const id = body.id || body.paymentId || body.payment_id || nested.id || nested.paymentId || nested.payment_id;
      const status = body.status || nested.status;
      
      if (!id) {
        console.warn("Forebit webhook: could not extract payment ID from body:", JSON.stringify(body));
        return res.status(200).json({ received: true });
      }

      const [payment] = await db
        .select()
        .from(cryptoPayments)
        .where(eq(cryptoPayments.forebitPaymentId, id))
        .limit(1);

      if (!payment) {
        console.warn("Forebit webhook: payment not found:", id);
        return res.status(200).json({ received: true });
      }

      if (payment.status === "completed") {
        return res.status(200).json({ received: true, alreadyProcessed: true });
      }

      const newStatus = mapForebitStatus(status);
      const [updated] = await db
        .update(cryptoPayments)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(and(eq(cryptoPayments.id, payment.id), ne(cryptoPayments.status, 'completed')))
        .returning();

      if (newStatus === "completed" && updated) {
        const verified = await verifyForebitPayment(payment.forebitPaymentId);
        if (verified) {
          await processForebitCompletion(payment);
        } else {
          console.warn("Forebit webhook: payment verification failed for:", id);
        }
      }
      if ((newStatus === "failed" || newStatus === "expired") && updated && payment.purpose === "order" && payment.orderId) {
        await storage.cancelPendingOrder(payment.orderId);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Forebit webhook error:", error);
      res.status(200).json({ received: true });
    }
  });

  async function processForebitCompletion(payment: typeof cryptoPayments.$inferSelect) {
    if (payment.purpose === "order" && payment.orderId) {
      await storage.fulfillPendingOrder(payment.orderId);
      await storage.createTransactionWithMethod(
        payment.userId,
        -payment.amount,
        "purchase",
        `Crypto order payment via Forebit ($${(payment.amount / 100).toFixed(2)})`,
        "Forebit"
      );
    } else {
      await storage.updateUserBalance(payment.userId, payment.amount);
      await storage.updateProtectedBalance(payment.userId, payment.amount);
      await storage.createTransactionWithMethod(
        payment.userId,
        payment.amount,
        "deposit",
        `Crypto deposit via Forebit ($${(payment.amount / 100).toFixed(2)})`,
        "Forebit"
      );
    }
  }

  function mapForebitStatus(forebitStatus: string): "pending" | "completed" | "failed" | "expired" | "underpaid" {
    switch (forebitStatus?.toUpperCase()) {
      case "COMPLETED": case "PAID": case "CONFIRMED": case "DONE": case "SETTLED": return "completed";
      case "FAILED": case "CANCELLED": case "CANCELED": case "REJECTED": return "failed";
      case "EXPIRED": return "expired";
      case "UNDERPAID": case "PARTIAL": return "underpaid";
      default: return "pending";
    }
  }

  async function verifyForebitPayment(paymentId: string): Promise<boolean> {
    try {
      const resp = await getForebitPayment(paymentId);
      const nestedData = resp.data || resp.payment || resp.result || {};
      const rawStatus = resp.status || (nestedData as any).status || "";
      const status = typeof rawStatus === 'string' ? rawStatus.toUpperCase() : "";
      return ["COMPLETED", "PAID", "CONFIRMED", "DONE", "SETTLED"].includes(status);
    } catch (error) {
      console.error("Failed to verify Forebit payment:", error);
      return false;
    }
  }

  // ── Payment method config (public) ───────────────────────────────────────
  app.get("/api/payment-methods", async (_req, res) => {
    const config = await storage.getPaymentMethodsConfig();
    res.json(config);
  });

  // ── Payment method admin toggle ───────────────────────────────────────────
  app.get("/api/admin/payment-methods", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(await storage.getPaymentMethodsConfig());
  });

  app.patch("/api/admin/payment-methods/:method", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { method } = req.params;
    const { enabled } = req.body;
    if (!["crypto", "stars"].includes(method) || typeof enabled !== "boolean") {
      return res.status(400).json({ message: "Invalid request" });
    }
    await storage.setSetting(`payment_method_${method}`, String(enabled));
    res.json(await storage.getPaymentMethodsConfig());
  });

  // ── Integrations status ──────────────────────────────────────────────────
  app.get("/api/admin/integrations/status", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({
      TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
    });
  });

  // ── Admin: CashApp tag setting ────────────────────────────────────────────
  app.get("/api/admin/settings/cashapp-tag", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(401).json({ message: "Unauthorized" });
    const tag = await storage.getSetting("cashapp_tag", "");
    res.json({ tag });
  });

  app.post("/api/admin/settings/cashapp-tag", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(401).json({ message: "Unauthorized" });
    const { tag } = req.body;
    if (typeof tag !== "string") return res.status(400).json({ message: "Invalid tag" });
    await storage.setSetting("cashapp_tag", tag.trim());
    res.json({ tag: tag.trim() });
  });

  // ── Telegram Stars order ──────────────────────────────────────────────────
  app.post("/api/orders/stars", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    let pendingOrderId: number | null = null;
    try {
      const userId = (req.user as any).id;
      const { items } = req.body;
      const productItems = (items || []).filter((i: any) => !i.cardId && i.variantId > 0);
      const order = await storage.createPendingOrder(userId, productItems, []);
      pendingOrderId = order.id;

      const invoiceLink = await createStarsInvoiceLink(
        "RULF.CC Order",
        `Order #${order.orderId}`,
        String(order.id),
        order.total
      );

      pendingOrderId = null;
      res.status(201).json({ order, invoiceLink });
    } catch (e: any) {
      console.error("Stars order creation failed:", e);
      if (pendingOrderId) {
        try { await storage.cancelPendingOrder(pendingOrderId); } catch {}
      }
      res.status(400).json({ message: e.message });
    }
  });

  // ── CashApp order (auto-delivers from stock) ─────────────────────────────
  app.get("/api/site-settings/cashapp-tag", async (req, res) => {
    const tag = await storage.getSetting("cashapp_tag", "");
    res.json({ tag });
  });

  app.post("/api/orders/cashapp", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    let pendingOrderId: number | null = null;
    try {
      const userId = (req.user as any).id;
      const { items, amount, note } = req.body;
      const productItems = (items || []).filter((i: any) => !i.cardId && i.variantId > 0);
      const noteWords = ["Fuel", "Gas", "Snack"];
      const noteWord = noteWords[Math.floor(Math.random() * noteWords.length)];
      const noteNum = Math.floor(1000 + Math.random() * 89000);
      const paymentNote = `${noteWord} - ${noteNum}`;
      const cashappTag = await storage.getSetting("cashapp_tag", "");

      // Deposit-only mode: no items — just generate a note, no amount required
      if (productItems.length === 0) {
        const publicOrderId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const [order] = await db.insert(orders).values({
          userId,
          orderId: publicOrderId,
          total: 0,
          paidAmount: 0,
          status: "pending",
          paymentMethod: "CashApp",
          paymentNote: paymentNote,
          deliveryContent: "",
        }).returning();
        return res.status(201).json({ order: { ...order, paymentMethod: "CashApp", paymentNote }, paymentNote, cashappTag });
      }

      // Use createPendingOrder to reserve stock immediately
      const order = await storage.createPendingOrder(userId, productItems, []);
      pendingOrderId = order.id;

      // Attach CashApp-specific fields
      await db.update(orders)
        .set({ paymentMethod: "CashApp", paymentNote })
        .where(eq(orders.id, order.id));

      pendingOrderId = null;
      res.status(201).json({ order: { ...order, paymentMethod: "CashApp", paymentNote }, paymentNote, cashappTag });
    } catch (e: any) {
      console.error("CashApp order creation failed:", e);
      if (pendingOrderId) {
        try { await storage.cancelPendingOrder(pendingOrderId); } catch {}
      }
      res.status(400).json({ message: e.message });
    }
  });

  // ── Admin: fulfill CashApp order (Paid) ──────────────────────────────────
  app.post("/api/admin/orders/:id/cashapp-fulfill", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const paidAmount = req.body.paidAmount !== undefined
        ? Math.round(Number(req.body.paidAmount) * 100)
        : undefined;
      const order = await storage.fulfillCashappOrder(Number(req.params.id), paidAmount);
      res.json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ── Admin: push stock to any pending order ────────────────────────────────
  app.post("/api/admin/orders/:id/push-stock", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const order = await storage.fulfillCashappOrder(Number(req.params.id));
      res.json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ── Admin: mark order unpaid ──────────────────────────────────────────────
  app.post("/api/admin/orders/:id/mark-unpaid", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const order = await storage.markOrderUnpaid(Number(req.params.id));
      res.json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ── Telegram webhook (pre_checkout_query + successful_payment) ────────────
  app.post("/api/telegram/webhook", async (req, res) => {
    res.status(200).json({ ok: true });
    try {
      const update = req.body || {};
      if (update.pre_checkout_query) {
        const pcq = update.pre_checkout_query;
        const orderId = Number(pcq.invoice_payload);
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (!order || order.status !== "pending") {
          await answerPreCheckoutQuery(pcq.id, false, "Order no longer available");
        } else {
          await answerPreCheckoutQuery(pcq.id, true);
        }
      } else if (update.message?.successful_payment) {
        const sp = update.message.successful_payment;
        const orderId = Number(sp.invoice_payload);
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (order && order.status === "pending") {
          await storage.fulfillPendingOrder(orderId);
          console.log(`Telegram Stars: order ${orderId} fulfilled`);
        }
      }
    } catch (e) {
      console.error("Telegram webhook error:", e);
    }
  });

  // ── Seller Application Routes ─────────────────────────────────────────────
  app.post("/api/seller/apply", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const existing = await storage.getSellerApplication(userId);
    if (existing) return res.status(400).json({ error: "Application already submitted", application: existing });
    const sellerCode = `TRENT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const app = await storage.createSellerApplication(userId, sellerCode);
    res.json(app);
  });

  app.get("/api/seller/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const user = await storage.getUser(userId);
    const application = await storage.getSellerApplication(userId);
    res.json({ isSeller: user?.isSeller ?? false, sellerBalance: user?.sellerBalance ?? 0, totalEarned: user?.totalSellerEarned ?? 0, sellerType: user?.sellerType ?? "bronze", sellerDisplayName: user?.sellerDisplayName ?? "", application });
  });

  app.get("/api/admin/seller-applications", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const apps = await storage.getAllSellerApplications();
    res.json(apps);
  });

  app.post("/api/admin/seller-applications/:id/approve", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    await storage.approveSellerApplication(Number(req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/admin/seller-applications/:id/reject", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    await storage.rejectSellerApplication(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Admin Seller Management ───────────────────────────────────────────────

  // Get all active sellers
  app.get("/api/admin/active-sellers", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const { rows } = await db.execute(sql`
      SELECT u.id, u.username, u.email, u.seller_balance, u.total_seller_earned,
             u.seller_type, u.seller_display_name, u.created_at,
             sa.seller_code, sa.id as app_id
      FROM users u
      LEFT JOIN seller_applications sa ON sa.user_id = u.id
      WHERE u.is_seller = true
      ORDER BY u.total_seller_earned DESC
    `) as any;
    res.json(rows.map((r: any) => ({
      id: r.id, username: r.username, email: r.email,
      sellerBalance: r.seller_balance, totalEarned: r.total_seller_earned,
      sellerType: r.seller_type, sellerDisplayName: r.seller_display_name,
      sellerCode: r.seller_code, appId: r.app_id, createdAt: r.created_at,
    })));
  });

  // Get seller detail (cards, stock, transactions)
  app.get("/api/admin/active-sellers/:userId/detail", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const userId = Number(req.params.userId);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const [cardsRes, txRes] = await Promise.all([
      db.execute(sql`SELECT id, masked_card, price, is_sold, created_at FROM cards WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`) as any,
      db.execute(sql`SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`) as any,
    ]);
    const stockRes = await db.execute(sql`
      SELECT si.id, si.variant_id, si.is_sold, si.created_at, v.name as variant_name, p.name as product_name
      FROM stock_items si
      JOIN variants v ON v.id = si.variant_id
      JOIN products p ON p.id = v.product_id
      WHERE si.seller_id = ${userId}
      ORDER BY si.created_at DESC LIMIT 50
    `) as any;
    res.json({
      user: { id: user.id, username: user.username, sellerBalance: user.sellerBalance, totalEarned: user.totalSellerEarned, sellerType: user.sellerType, sellerDisplayName: user.sellerDisplayName },
      cards: cardsRes.rows,
      transactions: txRes.rows,
      stock: stockRes.rows,
    });
  });

  // Set seller type + display name
  app.patch("/api/admin/active-sellers/:userId/type", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const userId = Number(req.params.userId);
    const { sellerType, sellerDisplayName } = req.body;
    await db.update(users).set({ sellerType: sellerType || "bronze", sellerDisplayName: sellerDisplayName || "" }).where(eq(users.id, userId));
    res.json({ ok: true });
  });

  // Remove seller
  app.delete("/api/admin/active-sellers/:userId", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const userId = Number(req.params.userId);
    await db.update(users).set({ isSeller: false } as any).where(eq(users.id, userId));
    res.json({ ok: true });
  });

  // Payout seller
  app.post("/api/admin/active-sellers/:userId/payout", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const userId = Number(req.params.userId);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.sellerBalance <= 0) return res.status(400).json({ error: "No balance to payout" });
    const amount = user.sellerBalance;
    await db.update(users).set({ sellerBalance: 0 } as any).where(eq(users.id, userId));
    await db.insert(transactions).values({ userId, type: "seller_payout", amount, paymentMethod: "manual", status: "completed", reference: `PAYOUT-${Date.now()}` } as any);
    res.json({ ok: true, amount });
  });

  // ── Seller Product Permissions ────────────────────────────────────────────

  // Get allowed product IDs for a seller
  app.get("/api/admin/seller-permissions/products/:sellerId", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const sellerId = Number(req.params.sellerId);
    const raw = await storage.getSetting(`seller_product_perms_${sellerId}`, "");
    const ids = raw ? raw.split(",").map(Number).filter(Boolean) : [];
    res.json({ productIds: ids });
  });

  // Set allowed product IDs for a seller
  app.post("/api/admin/seller-permissions/products/:sellerId", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const sellerId = Number(req.params.sellerId);
    const { productIds } = req.body;
    const value = (productIds as number[]).join(",");
    await storage.setSetting(`seller_product_perms_${sellerId}`, value);
    res.json({ ok: true });
  });

  // ── Seller Stock / Card Routes ────────────────────────────────────────────

  // Seller add card
  app.post("/api/seller/cards", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const user = await storage.getUser((req.user as any).id);
    if (!user?.isSeller) return res.status(403).json({ error: "Not a seller" });
    const perms = await storage.getSetting(`seller_perms_${user.id}`, "cards,ach,logs");
    if (!perms.split(",").includes("cards")) return res.status(403).json({ error: "You don't have permission to add cards" });
    const { cardNumber, price } = req.body;
    if (!cardNumber || !price) return res.status(400).json({ error: "Card number and price required" });
    const digits = cardNumber.replace(/\D/g, "");
    const bin = digits.substring(0, 6);
    let country = "Unknown";
    try {
      const r = await fetch(`https://lookup.binlist.net/${bin}`, { headers: { "Accept-Version": "3" } });
      if (r.ok) { const d = await r.json() as any; country = d.country?.name || "Unknown"; }
    } catch {}
    const masked = digits.replace(/\d(?=\d{4})/g, "*");
    const card = await storage.createCard({
      cardNumber: cardNumber.trim(), maskedCard: masked || cardNumber.substring(0, 4) + "****",
      expiry: "", cvv: "", country, extras: req.body.extras || "", price: Math.round(parseFloat(price) * 100),
      isFirstHand: req.body.isFirstHand || false, userId: user.id,
    } as any);
    res.status(201).json(card);
  });

  // Seller get their cards
  app.get("/api/seller/cards", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const { rows } = await db.execute(sql`SELECT * FROM cards WHERE user_id = ${userId} ORDER BY created_at DESC`) as any;
    res.json(rows);
  });

  // ── Seller Permissions ──────────────────────────────────────────────────
  app.get("/api/seller/permissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const perms = await storage.getSetting(`seller_perms_${userId}`, "cards,ach,logs");
    const list = perms.split(",").map((s: string) => s.trim()).filter(Boolean);
    res.json({ cards: list.includes("cards"), ach: list.includes("ach"), logs: list.includes("logs") });
  });

  app.get("/api/admin/seller-permissions/:userId", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const userId = req.params.userId;
    const perms = await storage.getSetting(`seller_perms_${userId}`, "cards,ach,logs");
    const list = perms.split(",").map((s: string) => s.trim()).filter(Boolean);
    res.json({ cards: list.includes("cards"), ach: list.includes("ach"), logs: list.includes("logs") });
  });

  app.post("/api/admin/seller-permissions/:userId", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const userId = req.params.userId;
    const { cards, ach, logs } = req.body;
    const list = [cards && "cards", ach && "ach", logs && "logs"].filter(Boolean).join(",");
    await storage.setSetting(`seller_perms_${userId}`, list);
    res.json({ ok: true });
  });

  // Seller add stock to existing variant
  app.post("/api/seller/stock", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const user = await storage.getUser((req.user as any).id);
    if (!user?.isSeller) return res.status(403).json({ error: "Not a seller" });
    const { variantId, content } = req.body;
    if (!variantId || !content) return res.status(400).json({ error: "variantId and content required" });
    // Check logs permission
    const perms = await storage.getSetting(`seller_perms_${user.id}`, "cards,ach,logs");
    if (!perms.split(",").includes("logs")) return res.status(403).json({ error: "You don't have permission to add logs" });
    // Check product-level permission
    const [variantRow] = await db.select({ productId: variants.productId }).from(variants).where(eq(variants.id, Number(variantId)));
    if (variantRow) {
      const productPermsRaw = await storage.getSetting(`seller_product_perms_${user.id}`, "");
      if (productPermsRaw) {
        const allowedIds = productPermsRaw.split(",").map(Number).filter(Boolean);
        if (allowedIds.length > 0 && !allowedIds.includes(variantRow.productId)) {
          return res.status(403).json({ error: "You don't have permission to sell in this product" });
        }
      }
    }
    // Items separated by blank lines (\n\n) — skip duplicates
    const items = content.split("\n\n").map((s: string) => s.trim()).filter(Boolean);
    let added = 0;
    let skipped = 0;
    for (const item of items) {
      const existing = await db.select({ id: stockItems.id }).from(stockItems)
        .where(eq(stockItems.content, item)).limit(1);
      if (existing.length > 0) { skipped++; continue; }
      await db.insert(stockItems).values({ variantId: Number(variantId), content: item, sellerId: user.id });
      added++;
    }
    res.json({ ok: true, added, skipped });
  });

  // Seller get transactions
  app.get("/api/seller/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const { rows } = await db.execute(sql`SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 100`) as any;
    res.json(rows);
  });

  // Get all active products/variants for seller stock adding
  app.get("/api/seller/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const user = await storage.getUser((req.user as any).id);
    if (!user?.isSeller) return res.status(403).json({ error: "Not a seller" });
    const prods = await storage.getAllProducts();
    res.json(prods);
  });

  // ── Sellers across ALL variants of a product (shown immediately on product open) ──
  app.get("/api/products/:productId/sellers", async (req, res) => {
    const productId = Number(req.params.productId);
    if (!productId) return res.status(400).json({ message: "Invalid product" });
    try {
      const { rows } = await db.execute(sql`
        SELECT id, "sellerType", "sellerDisplayName", username, "stockCount" FROM (
          SELECT
            -1 as id,
            'top' as "sellerType",
            'ACCTPLUG' as "sellerDisplayName",
            'acctplug' as username,
            COUNT(CASE WHEN si.is_sold = false AND si.is_reserved = false THEN 1 END)::int as "stockCount"
          FROM stock_items si
          JOIN variants v ON v.id = si.variant_id
          WHERE v.product_id = ${productId} AND si.seller_id IS NULL
          HAVING COUNT(*) > 0
          UNION ALL
          SELECT
            u.id,
            u.seller_type as "sellerType",
            u.seller_display_name as "sellerDisplayName",
            u.username,
            COUNT(CASE WHEN si.is_sold = false AND si.is_reserved = false THEN 1 END)::int as "stockCount"
          FROM stock_items si
          JOIN variants v ON v.id = si.variant_id
          JOIN users u ON u.id = si.seller_id
          WHERE v.product_id = ${productId} AND si.seller_id IS NOT NULL
          GROUP BY u.id, u.seller_type, u.seller_display_name, u.username
        ) combined
        ORDER BY "stockCount" DESC
      `) as any;
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Sellers per variant (for variant-specific stock counts after variant is picked) ──
  app.get("/api/variants/:variantId/sellers", async (req, res) => {
    const variantId = Number(req.params.variantId);
    if (!variantId) return res.status(400).json({ message: "Invalid variant" });
    try {
      const { rows } = await db.execute(sql`
        SELECT id, "sellerType", "sellerDisplayName", username, "stockCount" FROM (
          -- Admin stock (seller_id IS NULL) — show if ANY admin stock exists for this variant
          SELECT
            -1 as id,
            'top' as "sellerType",
            'ACCTPLUG' as "sellerDisplayName",
            'acctplug' as username,
            COUNT(CASE WHEN si.is_sold = false AND si.is_reserved = false THEN 1 END)::int as "stockCount"
          FROM stock_items si
          WHERE si.variant_id = ${variantId}
            AND si.seller_id IS NULL
          HAVING COUNT(*) > 0
          UNION ALL
          -- Seller stock — show each seller who has ever uploaded stock to this variant
          SELECT
            u.id,
            u.seller_type as "sellerType",
            u.seller_display_name as "sellerDisplayName",
            u.username,
            COUNT(CASE WHEN si.is_sold = false AND si.is_reserved = false THEN 1 END)::int as "stockCount"
          FROM stock_items si
          JOIN users u ON u.id = si.seller_id
          WHERE si.variant_id = ${variantId}
            AND si.seller_id IS NOT NULL
          GROUP BY u.id, u.seller_type, u.seller_display_name, u.username
        ) combined
        ORDER BY "stockCount" DESC
      `) as any;
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Seller: get own allowed product IDs ───────────────────────────────────
  app.get("/api/seller/product-permissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const user = await storage.getUser(userId);
    if (!user?.isSeller) return res.status(403).json({ error: "Not a seller" });
    const raw = await storage.getSetting(`seller_product_perms_${userId}`, "");
    const allowedIds = raw ? raw.split(",").map(Number).filter(Boolean) : [];
    res.json({ allowedIds });
  });

  // ── Seller: view own log stock items ──────────────────────────────────────
  app.get("/api/seller/stock", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const user = await storage.getUser(userId);
    if (!user?.isSeller) return res.status(403).json({ error: "Not a seller" });
    try {
      const { rows } = await db.execute(sql`
        SELECT si.id, si.variant_id, si.content, si.is_sold, si.created_at,
               v.name as variant_name, p.name as product_name
        FROM stock_items si
        JOIN variants v ON v.id = si.variant_id
        JOIN products p ON p.id = v.product_id
        WHERE si.seller_id = ${userId}
        ORDER BY si.created_at DESC
        LIMIT 300
      `) as any;
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Seller: delete own unsold log stock item ──────────────────────────────
  app.delete("/api/seller/stock/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const user = await storage.getUser(userId);
    if (!user?.isSeller) return res.status(403).json({ error: "Not a seller" });
    const id = Number(req.params.id);
    const [item] = await db.select().from(stockItems).where(and(eq(stockItems.id, id)));
    if (!item) return res.status(404).json({ error: "Not found" });
    if ((item as any).sellerId !== userId) return res.status(403).json({ error: "Not yours" });
    if (item.isSold) return res.status(400).json({ error: "Already sold" });
    await db.delete(stockItems).where(eq(stockItems.id, id));
    res.json({ ok: true });
  });

  // ── Seller: delete own unsold card ────────────────────────────────────────
  app.delete("/api/seller/cards/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const user = await storage.getUser(userId);
    if (!user?.isSeller) return res.status(403).json({ error: "Not a seller" });
    const id = Number(req.params.id);
    const [card] = await db.select().from(cards).where(eq(cards.id, id));
    if (!card) return res.status(404).json({ error: "Not found" });
    if ((card as any).userId !== userId) return res.status(403).json({ error: "Not yours" });
    if (card.isSold) return res.status(400).json({ error: "Already sold" });
    await db.delete(cards).where(eq(cards.id, id));
    res.json({ ok: true });
  });

  // ── Seller: delete own unsold ACH ─────────────────────────────────────────
  app.delete("/api/seller/ach/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const user = await storage.getUser(userId);
    if (!user?.isSeller) return res.status(403).json({ error: "Not a seller" });
    const id = Number(req.params.id);
    const [ach] = await db.select().from(achs).where(eq(achs.id, id));
    if (!ach) return res.status(404).json({ error: "Not found" });
    if ((ach as any).sellerId !== userId) return res.status(403).json({ error: "Not yours" });
    if ((ach as any).isSold) return res.status(400).json({ error: "Already sold" });
    await db.delete(achs).where(eq(achs.id, id));
    res.json({ ok: true });
  });

  // ── BIN Lookup ───────────────────────────────────────────────────────────
  app.get("/api/bin/:bin", async (req, res) => {
    const { bin } = req.params;
    if (!/^\d{6,8}$/.test(bin)) return res.status(400).json({ error: "Invalid BIN" });
    try {
      const result = await lookupBin(bin);
      res.json(result);
    } catch {
      res.json({ bin });
    }
  });

  // ── Register Telegram webhook on server start ─────────────────────────────
  (async () => {
    const domain = process.env.REPLIT_DEV_DOMAIN || (process.env.REPLIT_DOMAINS || "").split(",")[0].trim();
    if (domain) {
      await setupTelegramWebhook(`https://${domain}/api/telegram/webhook`);
    }
  })();

  // Seed Data (if empty)
  const seedStats = await storage.getDashboardStats();
  if (seedStats.totalUsers === 0) {
    console.log("Seeding database...");
    const { hashPassword } = await import("./auth");
    const adminPass = await hashPassword("admin123");
    await storage.createUser({
      username: "admin",
      password: adminPass,
      email: "admin@store.com",
      role: "admin",
      confirmPassword: "admin123"
    } as any);

    const demoPass = await hashPassword("user123");
    await storage.createUser({
      username: "demo",
      password: demoPass,
      email: "demo@user.com",
      role: "user",
      confirmPassword: "user123"
    } as any);

    // Seed Product
    const prod = await storage.createProduct({
      name: "Netflix Premium (1 Month)",
      description: "4K UHD, 4 Screens. Private account.",
      image: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
      active: true
    });

    const variant = await storage.createVariant({
      productId: prod.id,
      name: "Private Account",
      price: 500 // $5.00
    });

    await storage.addStockItems(variant.id, 
      "user1@email.com\npass1\nextra_info1\nuser2@email.com\npass2\nextra_info2"
    );
  }

  // ── Email Bomber ──────────────────────────────────────────────
  app.post("/api/tools/email-bomb", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { email } = req.body;
    if (!email || typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: "Valid target email required" });
    }

    const user = req.user as any;
    const COST = 50; // $0.50 in cents
    if ((user.balance || 0) < COST) {
      return res.status(400).json({ message: "Insufficient balance — need $0.50" });
    }

    const smtpEmail = await storage.getSetting("smtp_email", "");
    const smtpPassword = await storage.getSetting("smtp_password", "");
    const smtpHost = await storage.getSetting("smtp_host", "smtp.gmail.com");
    const smtpPort = parseInt(await storage.getSetting("smtp_port", "587"));

    if (!smtpEmail || !smtpPassword) {
      return res.status(500).json({ message: "SMTP not configured — contact admin" });
    }

    // Deduct balance
    await storage.updateUserBalance(user.id, -COST);
    await storage.createTransaction(user.id, -COST, "email_bomb", `Email bomb → ${email}`);

    const jobId = randomBytes(8).toString("hex");
    const job = { sent: 0, total: 200, status: "running" as const };
    emailBombJobs.set(jobId, job);

    res.json({ jobId, total: 200 });

    // Run bomb in background
    (async () => {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpEmail, pass: smtpPassword },
          tls: { rejectUnauthorized: false },
        });

        const j = emailBombJobs.get(jobId)!;
        for (let i = 0; i < 200; i++) {
          try {
            await transporter.sendMail({
              from: smtpEmail,
              to: email,
              subject: `Notification #${i + 1}`,
              text: `You have a new message. (${i + 1} of 200)`,
            });
          } catch (_) {}
          j.sent = i + 1;
          if (i < 199) await new Promise((r) => setTimeout(r, 500));
        }
        j.status = "done";
      } catch {
        const j = emailBombJobs.get(jobId);
        if (j) j.status = "failed";
      }
    })();
  });

  app.get("/api/tools/email-bomb/:jobId", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const job = emailBombJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  });

  // ── ACH ──────────────────────────────────────────────────────
  app.get("/api/ach", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { rows } = await db.execute(sql`
      SELECT a.id, a.bank_name, a.balance, a.price, a.is_sold, a.seller_id, a.created_at,
             u.seller_type, u.seller_display_name
      FROM achs a
      LEFT JOIN users u ON u.id = a.seller_id
      WHERE a.is_sold = false
      ORDER BY a.created_at DESC
    `) as any;
    res.json(rows.map((r: any) => ({
      id: r.id, bankName: r.bank_name, balance: r.balance,
      price: r.price, isSold: r.is_sold, sellerId: r.seller_id, createdAt: r.created_at,
      sellerType: r.seller_type, sellerDisplayName: r.seller_display_name,
    })));
  });

  app.post("/api/ach", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { bankName, balance, fullItem, price } = req.body;
    if (!bankName || !balance || !fullItem || !price) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const ach = await storage.createAch({
      bankName: String(bankName).trim(),
      balance: String(balance).trim(),
      fullItem: String(fullItem).trim(),
      price: Math.round(parseFloat(String(price)) * 100),
    });
    res.status(201).json(ach);
  });

  app.post("/api/ach/:id/purchase", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const achId = Number(req.params.id);
      const userId = (req.user as any).id;
      const ach = await storage.getAch(achId);
      if (!ach || ach.isSold) return res.status(404).json({ message: "ACH not found or sold" });

      // Apply rank discount
      const rankResult = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), sql`amount > 0`, sql`type IN ('deposit', 'manual_deposit')`));
      const totalDeposited = Number(rankResult[0]?.total ?? 0);
      const rankPct = totalDeposited >= 100000 ? 10 : totalDeposited >= 50000 ? 5 : totalDeposited >= 10000 ? 2 : 0;
      const finalPrice = rankPct > 0 ? Math.max(0, Math.round(ach.price * (1 - rankPct / 100))) : ach.price;

      const user = await storage.getUser(userId);
      if (!user || user.balance < finalPrice) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      await storage.updateUserBalance(userId, -finalPrice);
      await storage.createTransaction(userId, -finalPrice, "purchase", `Purchased ACH: ${ach.bankName}`);

      const originalSellerId = ach.sellerId;
      await storage.purchaseAch(achId);

      if (originalSellerId && originalSellerId !== userId) {
        const sellerCut = Math.floor(ach.price * 0.8);
        await db.update(users)
          .set({
            sellerBalance: sql`${users.sellerBalance} + ${sellerCut}`,
            totalSellerEarned: sql`${users.totalSellerEarned} + ${sellerCut}`,
          })
          .where(eq(users.id, originalSellerId));
      }

      const publicOrderId = Math.random().toString(36).substring(2, 15);
      const [achOrder] = await db.insert(orders).values({
        userId,
        orderId: `ACH-${publicOrderId}`,
        total: finalPrice,
        paidAmount: finalPrice,
        status: "fulfilled",
        deliveryContent: ach.fullItem,
        paymentMethod: "wallet",
      }).returning();

      // Insert order item so the products tab is populated
      await db.insert(orderItems).values({
        orderId: achOrder.id,
        variantId: null,
        cardId: null,
        itemType: "ach",
        price: ach.price,
        quantity: 1,
      });

      res.json({ success: true, deliveryContent: ach.fullItem });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/ach/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }
    await storage.deleteAch(Number(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/seller/ach", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    if (!user.isSeller) return res.status(403).json({ message: "Not a seller" });
    const perms = await storage.getSetting(`seller_perms_${user.id}`, "cards,ach,logs");
    if (!perms.split(",").includes("ach")) return res.status(403).json({ message: "You don't have permission to add ACH" });
    const { bankName, balance, fullItem, price } = req.body;
    if (!bankName || !balance || !fullItem || !price) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const ach = await storage.createAch({
      bankName: String(bankName).trim(),
      balance: String(balance).trim(),
      fullItem: String(fullItem).trim(),
      price: Math.round(parseFloat(String(price)) * 100),
      sellerId: user.id,
    });
    res.status(201).json(ach);
  });

  app.get("/api/seller/ach", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    if (!user.isSeller) return res.status(403).json({ message: "Not a seller" });
    const list = await storage.getSellerAchs(user.id);
    res.json(list);
  });

  // ── SMTP Settings (admin) ──────────────────────────────────────
  app.get("/api/admin/smtp", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const smtp_host = await storage.getSetting("smtp_host", "smtp.gmail.com");
    const smtp_port = await storage.getSetting("smtp_port", "587");
    const smtp_email = await storage.getSetting("smtp_email", "");
    // Never return the password
    const has_password = (await storage.getSetting("smtp_password", "")).length > 0;
    res.json({ smtp_host, smtp_port, smtp_email, has_password });
  });

  app.post("/api/admin/smtp", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { smtp_host, smtp_port, smtp_email, smtp_password } = req.body;
    if (smtp_host) await storage.setSetting("smtp_host", String(smtp_host).trim());
    if (smtp_port) await storage.setSetting("smtp_port", String(smtp_port).trim());
    if (smtp_email) await storage.setSetting("smtp_email", String(smtp_email).trim());
    if (smtp_password) await storage.setSetting("smtp_password", String(smtp_password));
    res.json({ message: "SMTP settings saved" });
  });

  return httpServer;
}
