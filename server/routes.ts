import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { createForebitPayment, getForebitPayment } from "./forebit";
import { createStarsInvoiceLink, answerPreCheckoutQuery, setupTelegramWebhook } from "./telegram";
import { hashPassword, comparePassword } from "./auth";
import { cryptoPayments, orders, orderItems, verifications, variants, userIps, users, mails, mailReads } from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, desc, sql } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.set('etag', false);
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
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const product = await storage.createProduct(req.body);
    res.status(201).json(product);
  });

  // Variants
  app.post(api.variants.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const variant = await storage.createVariant(req.body);
    res.status(201).json(variant);
  });

  // Stock
  app.post(api.stock.add.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const count = await storage.addStockItems(req.body.variantId, req.body.rawContent);
    res.json({ addedCount: count });
  });

  // Orders
  app.post(api.orders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = (req.user as any).id;
      const { items, cardIds } = req.body;
      const productItems = (items || []).filter((i: any) => !i.cardId && i.variantId > 0);
      const cardIdList: number[] = cardIds || [];

      const order = await storage.createOrder(userId, productItems, cardIdList);
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
  app.post(api.wallet.redeem.path, async (req, res) => {
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

  // Games
  app.post(api.games.dice.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    const bet = req.body.betAmount;

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

  app.post(api.games.spin.path, async (req, res) => {
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

  // User - Update Telegram
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
        const uniqueIps = [...new Set(ipRows.map((i: any) => i.ip))];
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
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const products = await storage.getAllProducts();
    res.json(products);
  });

  app.patch("/api/admin/products/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const product = await storage.updateProduct(Number(req.params.id), req.body);
    res.json(product);
  });

  app.delete("/api/admin/products/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await storage.deleteProduct(Number(req.params.id));
    res.json({ success: true });
  });

  app.patch("/api/admin/variants/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const variant = await storage.updateVariant(Number(req.params.id), req.body);
    res.json(variant);
  });

  app.delete("/api/admin/variants/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await storage.deleteVariant(Number(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/admin/stock", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const item = await storage.addSingleStockItem(req.body.variantId, req.body.content);
    res.status(201).json(item);
  });

  app.post("/api/admin/stock/bulk", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const count = await storage.addStockItems(req.body.variantId, req.body.rawContent);
    res.json({ addedCount: count });
  });

  app.get("/api/admin/stock/:variantId", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const items = await storage.getStockItems(Number(req.params.variantId));
    res.json(items);
  });

  app.delete("/api/admin/stock/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await storage.deleteStockItem(Number(req.params.id));
    res.json({ success: true });
  });

  // Admin - Get all orders for admin
  app.get("/api/admin/orders", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const allOrders = await storage.getAllOrders();
    res.json(allOrders);
  });

  // Admin - Get all users
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
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

  // Admin Users
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const users = await storage.getAllUsers();
    res.json(users);
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
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.updateUserBalance(Number(req.params.id), req.body.amount);
    if (req.body.amount > 0) {
      await storage.updateProtectedBalance(Number(req.params.id), req.body.amount);
    }
    await storage.createTransaction(Number(req.params.id), req.body.amount, "admin_adjustment", "Admin balance adjustment");
    res.json(user);
  });

  // Admin Codes (list)
  app.get("/api/admin/codes", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const codes = await storage.getAllRedeemCodes();
    res.json(codes);
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
    const cards = await storage.getCards();
    res.json(cards);
  });

  app.post("/api/cards", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const cardNumber = req.body.cardNumber || "";
    let country = req.body.country || "";

    if (!country && cardNumber.length >= 6) {
      const bin = cardNumber.substring(0, 6);
      try {
        const binRes = await fetch(`https://lookup.binlist.net/${bin}`, {
          headers: { "Accept-Version": "3" }
        });
        if (binRes.ok) {
          const binData = await binRes.json();
          country = binData.country?.name || "Unknown";
        } else {
          country = "Unknown";
        }
      } catch {
        country = "Unknown";
      }
    }

    if (!country) country = "Unknown";

    const cardData = {
      ...req.body,
      country,
    };
    const card = await storage.createCard(cardData);
    res.status(201).json(card);
  });

  app.post("/api/cards/:id/purchase", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const cardId = Number(req.params.id);
      const userId = (req.user as any).id;
      const card = await storage.getCard(cardId);
      if (!card) return res.status(404).json({ message: "Card not found" });

      const user = await storage.getUser(userId);
      if (!user || user.balance < card.price) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      await storage.updateUserBalance(userId, -card.price);
      await storage.createTransaction(userId, -card.price, "purchase", `Purchased card ${card.maskedCard}`);
      const updatedCard = await storage.purchaseCard(cardId, userId);
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
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
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
          await storage.replaceOrderItem(order[0].id);
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
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    let pendingOrderId: number | null = null;
    try {
      const userId = (req.user as any).id;
      const { items, cardIds } = req.body;
      const productItems = (items || []).filter((i: any) => !i.cardId && i.variantId > 0);
      const cardIdList: number[] = cardIds || [];

      const order = await storage.createPendingOrder(userId, productItems, cardIdList);
      pendingOrderId = order.id;

      const CRYPTO_FEE_PERCENT = 10;
      const totalWithFee = order.total + Math.round(order.total * CRYPTO_FEE_PERCENT / 100);
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
      const amountUsd = parseFloat(amount);
      
      if (!amountUsd || amountUsd < 0.50) {
        return res.status(400).json({ message: "Minimum payment is $0.50" });
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
    try {
      const userId = (req.user as any).id;
      const { items } = req.body;
      const productItems = (items || []).filter((i: any) => !i.cardId && i.variantId > 0);
      const noteId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const paymentNote = `snack-${noteId}`;
      const cashappTag = await storage.getSetting("cashapp_tag", "");

      const publicOrderId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      let total = 0;
      for (const item of productItems) {
        const [v] = await db.select().from(variants).where(eq(variants.id, item.variantId));
        if (!v) throw new Error("Variant not found");
        total += v.price * item.quantity;
      }

      // Create order as pending first
      const [order] = await db.insert(orders).values({
        orderId: publicOrderId,
        userId,
        total,
        status: "pending",
        paymentMethod: "CashApp",
        paymentNote,
      }).returning();

      for (const item of productItems) {
        const [v] = await db.select().from(variants).where(eq(variants.id, item.variantId));
        if (!v) continue;
        await db.insert(orderItems).values({
          orderId: order.id,
          variantId: item.variantId,
          stockItemId: null,
          cardId: null,
          itemType: "product",
          price: v.price,
          quantity: item.quantity,
        });
      }

      res.status(201).json({ order, paymentNote, cashappTag });
    } catch (e: any) {
      console.error("CashApp order creation failed:", e);
      res.status(400).json({ message: e.message });
    }
  });

  // ── Admin: fulfill CashApp order (Paid) ──────────────────────────────────
  app.post("/api/admin/orders/:id/cashapp-fulfill", async (req, res) => {
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

  // ── Admin: refund order ───────────────────────────────────────────────────
  app.post("/api/admin/orders/:id/refund", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const order = await storage.refundOrder(Number(req.params.id));
      res.json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ── Admin: replace order (grab new stock item) ────────────────────────────
  app.post("/api/admin/orders/:id/replace", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const order = await storage.replaceOrder(Number(req.params.id));
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

  // ── Register Telegram webhook on server start ─────────────────────────────
  (async () => {
    const domain = process.env.REPLIT_DEV_DOMAIN || (process.env.REPLIT_DOMAINS || "").split(",")[0].trim();
    if (domain) {
      await setupTelegramWebhook(`https://${domain}/api/telegram/webhook`);
    }
  })();

  // Seed Data (if empty)
  const users = await storage.getDashboardStats();
  if (users.totalUsers === 0) {
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

  return httpServer;
}
