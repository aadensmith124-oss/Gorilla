import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { createForebitPayment, getForebitPayment } from "./forebit";
import { cryptoPayments, orders } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
  app.post("/api/wallet/purchase", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const { amount, method } = req.body;
    const amountCents = Math.round(parseFloat(amount) * 100);
    
    const updatedUser = await storage.updateUserBalance((req.user as any).id, amountCents);
    await storage.createTransaction((req.user as any).id, amountCents, "manual_deposit", `Purchased balance via ${method}`);

    res.json({ newBalance: updatedUser.balance, amountAdded: amountCents });
  });

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

  // Admin Orders
  app.get("/api/admin/orders", async (req, res) => {
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
      const order = await storage.replaceOrderItem(Number(req.params.id));
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
      extras: req.body.extras || "",
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

  app.post("/api/payments/forebit/create", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { amount, purpose, orderId } = req.body;
      const amountUsd = parseFloat(amount);
      
      if (!amountUsd || amountUsd < 0.50) {
        return res.status(400).json({ message: "Minimum payment is $0.50" });
      }

      const userId = (req.user as any).id;
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const forebitPayment = await createForebitPayment({
        amount: amountUsd,
        currency: "USD",
        name: purpose === "order" ? `Order Payment` : `Balance Deposit`,
        description: `User ${userId} - ${purpose === "order" ? "order" : "deposit"}`,
        redirectUrl: `${baseUrl}/profile?tab=balance&payment=success`,
        notifyUrl: `${baseUrl}/api/webhooks/forebit`,
        metadata: {
          userId: String(userId),
          purpose: purpose || "deposit",
          orderId: orderId ? String(orderId) : "",
          amountCents: String(Math.round(amountUsd * 100)),
        },
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
        return res.json({ status: "completed", amount: localPayment.amount });
      }

      try {
        const forebitStatus = await getForebitPayment(paymentId);
        const newStatus = mapForebitStatus(forebitStatus.status || "");

        if (newStatus !== localPayment.status) {
          await db
            .update(cryptoPayments)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(eq(cryptoPayments.id, localPayment.id));

          if (newStatus === "completed" && localPayment.status !== "completed") {
            await processForebitCompletion(localPayment);
          }
        }

        res.json({ status: newStatus, amount: localPayment.amount });
      } catch {
        res.json({ status: localPayment.status, amount: localPayment.amount });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/webhooks/forebit", async (req, res) => {
    try {
      const { id, status } = req.body;
      
      if (!id) {
        return res.status(400).json({ message: "Missing payment ID" });
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
      await db
        .update(cryptoPayments)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(cryptoPayments.id, payment.id));

      if (newStatus === "completed") {
        const verified = await verifyForebitPayment(payment.forebitPaymentId);
        if (verified) {
          await processForebitCompletion(payment);
        } else {
          console.warn("Forebit webhook: payment verification failed for:", id);
        }
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Forebit webhook error:", error);
      res.status(200).json({ received: true });
    }
  });

  async function processForebitCompletion(payment: typeof cryptoPayments.$inferSelect) {
    if (payment.purpose === "deposit") {
      await storage.updateUserBalance(payment.userId, payment.amount);
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
      case "COMPLETED": return "completed";
      case "FAILED": case "CANCELLED": return "failed";
      case "EXPIRED": return "expired";
      case "UNDERPAID": return "underpaid";
      default: return "pending";
    }
  }

  async function verifyForebitPayment(paymentId: string): Promise<boolean> {
    try {
      const payment = await getForebitPayment(paymentId);
      return payment.status?.toUpperCase() === "COMPLETED";
    } catch (error) {
      console.error("Failed to verify Forebit payment:", error);
      return false;
    }
  }

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
