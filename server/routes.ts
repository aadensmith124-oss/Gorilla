import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
      const order = await storage.createOrder((req.user as any).id, req.body.items);
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
      roll: userRoll, // We also could send system roll if UI supports it, but simple UI just shows user result usually
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
      // Generate realistic looking code: VOUCH-XXXX-XXXX
      const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
      const codeStr = `VOUCH-${randomStr}`;
      await storage.createRedeemCode(codeStr, amount);
      codes.push(codeStr);
    }
    res.json({ codes });
  });

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
      confirmPassword: "admin123" // Only needed for validation schema, not DB
    });

    const demoPass = await hashPassword("user123");
    await storage.createUser({
      username: "demo",
      password: demoPass,
      email: "demo@user.com",
      role: "user",
      confirmPassword: "user123"
    });

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
