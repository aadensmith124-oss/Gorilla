import { db } from "./db";
import { 
  users, products, variants, stockItems, orders, orderItems, transactions, redeemCodes, announcements, uploadedImages, cards, supportTickets, verifications, cryptoPayments, mails, mailReads, siteSettings,
  type User, type InsertUser, type Product, type InsertProduct, type Variant, type InsertVariant,
  type StockItem, type Order, type OrderItem, type Transaction, type RedeemCode, type Announcement, type InsertAnnouncement, type UploadedImage,
  type Card, type InsertCard
} from "@shared/schema";
import { eq, and, sql, desc, lt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amountCents: number): Promise<User>;
  updateProtectedBalance(userId: number, amountCents: number): Promise<User>;
  setProtectedBalance(userId: number, value: number): Promise<User>;
  updateLastDailySpin(userId: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<User>): Promise<User>;

  // Products & Variants
  getProducts(): Promise<(Product & { variants: (Variant & { stockCount: number })[] })[]>;
  getAllProducts(): Promise<(Product & { variants: (Variant & { stockCount: number })[] })[]>;
  getProduct(id: number): Promise<(Product & { variants: (Variant & { stockCount: number })[] }) | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<Product>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  createVariant(variant: InsertVariant): Promise<Variant>;
  updateVariant(id: number, data: Partial<Variant>): Promise<Variant>;
  deleteVariant(id: number): Promise<void>;
  
  // Stock
  addStockItems(variantId: number, content: string): Promise<number>;
  addSingleStockItem(variantId: number, content: string): Promise<StockItem>;
  getStockItems(variantId: number): Promise<StockItem[]>;
  deleteStockItem(id: number): Promise<void>;
  reserveStockItem(variantId: number): Promise<StockItem | undefined>;
  
  // Orders
  createOrder(userId: number, items: { variantId: number; quantity: number }[], cardIds?: number[]): Promise<Order>;
  getOrders(userId: number): Promise<(Order & { items: (OrderItem & { stockItem: StockItem | null, variant: Variant | null })[] })[]>;
  getOrder(id: number): Promise<(Order & { items: (OrderItem & { stockItem: StockItem | null, variant: Variant | null })[] }) | undefined>;
  getAllOrders(): Promise<any[]>;
  refundOrder(orderId: number): Promise<Order>;
  replaceOrderItem(orderId: number): Promise<Order>;
  
  // Wallet
  createTransaction(userId: number, amount: number, type: string, description: string): Promise<Transaction>;
  createTransactionWithMethod(userId: number, amount: number, type: string, description: string, paymentMethod: string): Promise<Transaction>;
  getTransactions(userId: number): Promise<Transaction[]>;
  getRedeemCode(code: string): Promise<RedeemCode | undefined>;
  markRedeemCodeUsed(id: number, userId: number): Promise<void>;
  createRedeemCode(code: string, amount: number): Promise<RedeemCode>;
  getAllRedeemCodes(): Promise<RedeemCode[]>;
  
  // Admin
  getDashboardStats(): Promise<{ totalUsers: number; totalSales: number; storeBalance: number; itemsInStock: number; itemsSold: number; totalOrders: number; pendingOrders: number; totalRevenue: number }>;
  getAdminLogs(): Promise<any[]>;
  updateOrderDelivery(orderId: number, deliveryContent: string): Promise<Order>;
  banUser(userId: number): Promise<User>;
  unbanUser(userId: number): Promise<User>;
  
  // Announcements
  getAnnouncements(): Promise<Announcement[]>;
  getAllAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  
  // Images
  uploadImage(filename: string, mimeType: string, data: string): Promise<UploadedImage>;
  getImage(id: number): Promise<UploadedImage | undefined>;

  // Support
  createSupportTicket(ticket: any): Promise<any>;
  getSupportTickets(userId?: number): Promise<any[]>;
  getSupportTicket(id: number): Promise<any>;
  updateSupportTicket(id: number, data: any): Promise<any>;

  // Cards
  getCards(): Promise<Card[]>;
  getCard(id: number): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: number, data: Partial<Card>): Promise<Card>;
  purchaseCard(cardId: number, userId: number): Promise<Card>;

  // Settings
  getSetting(key: string, defaultValue?: string): Promise<string>;
  setSetting(key: string, value: string): Promise<void>;
  getPaymentMethodsConfig(): Promise<Record<string, boolean>>;
  getUserCards(userId: number): Promise<Card[]>;
  deleteCard(id: number): Promise<void>;

}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserBalance(userId: number, amountCents: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ balance: sql`${users.balance} + ${amountCents}` })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateProtectedBalance(userId: number, amountCents: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ protectedBalance: sql`GREATEST(0, ${users.protectedBalance} + ${amountCents})` })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async setProtectedBalance(userId: number, value: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ protectedBalance: Math.max(0, value) })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateLastDailySpin(userId: number): Promise<void> {
    await db.update(users).set({ lastDailySpin: new Date() }).where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async banUser(userId: number): Promise<User> {
    const [user] = await db.update(users).set({ isBanned: true }).where(eq(users.id, userId)).returning();
    return user;
  }

  async unbanUser(userId: number): Promise<User> {
    const [user] = await db.update(users).set({ isBanned: false }).where(eq(users.id, userId)).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getProducts(): Promise<(Product & { variants: (Variant & { stockCount: number })[] })[]> {
    const allProducts = await db.select().from(products).where(eq(products.active, true));
    return this.enrichProductsWithVariants(allProducts);
  }

  async getAllProducts(): Promise<(Product & { variants: (Variant & { stockCount: number })[] })[]> {
    const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
    return this.enrichProductsWithVariants(allProducts);
  }

  private async enrichProductsWithVariants(allProducts: Product[]): Promise<(Product & { variants: (Variant & { stockCount: number })[] })[]> {
    const result = [];
    for (const prod of allProducts) {
      const prodVariants = await db.select().from(variants).where(eq(variants.productId, prod.id));
      const variantsWithStock = [];
      
      for (const v of prodVariants) {
        const [count] = await db
          .select({ count: sql<number>`count(*)` })
          .from(stockItems)
          .where(and(eq(stockItems.variantId, v.id), eq(stockItems.isSold, false)));
        
        variantsWithStock.push({ ...v, stockCount: Number(count.count) });
      }
      result.push({ ...prod, variants: variantsWithStock });
    }
    return result;
  }

  async getProduct(id: number): Promise<(Product & { variants: (Variant & { stockCount: number })[] }) | undefined> {
    const [prod] = await db.select().from(products).where(eq(products.id, id));
    if (!prod) return undefined;

    const prodVariants = await db.select().from(variants).where(eq(variants.productId, prod.id));
    const variantsWithStock = [];
      
    for (const v of prodVariants) {
      const [count] = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockItems)
        .where(and(eq(stockItems.variantId, v.id), eq(stockItems.isSold, false)));
      
      variantsWithStock.push({ ...v, stockCount: Number(count.count) });
    }
    
    return { ...prod, variants: variantsWithStock };
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [prod] = await db.insert(products).values(insertProduct).returning();
    return prod;
  }

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    const [prod] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return prod;
  }

  async createVariant(insertVariant: InsertVariant): Promise<Variant> {
    const [variant] = await db.insert(variants).values(insertVariant).returning();
    return variant;
  }

  async updateVariant(id: number, data: Partial<Variant>): Promise<Variant> {
    const [variant] = await db.update(variants).set(data).where(eq(variants.id, id)).returning();
    return variant;
  }

  async deleteVariant(id: number): Promise<void> {
    await db.delete(stockItems).where(eq(stockItems.variantId, id));
    await db.delete(variants).where(eq(variants.id, id));
  }

  async deleteProduct(id: number): Promise<void> {
    const prodVariants = await db.select().from(variants).where(eq(variants.productId, id));
    for (const v of prodVariants) {
      await db.delete(orderItems).where(eq(orderItems.variantId, v.id));
      await db.delete(stockItems).where(eq(stockItems.variantId, v.id));
    }
    await db.delete(variants).where(eq(variants.productId, id));
    await db.delete(products).where(eq(products.id, id));
  }

  async addStockItems(variantId: number, content: string): Promise<number> {
    const items = content.split(/\n\s*\n/).map(block => block.trim()).filter(block => block.length > 0);
    if (items.length === 0) return 0;

    const values = items.map(itemContent => ({
      variantId,
      content: itemContent,
      isSold: false
    }));

    await db.insert(stockItems).values(values);
    return items.length;
  }

  async addSingleStockItem(variantId: number, content: string): Promise<StockItem> {
    const [item] = await db.insert(stockItems).values({
      variantId,
      content,
      isSold: false
    }).returning();
    return item;
  }

  async getStockItems(variantId: number): Promise<StockItem[]> {
    return db.select().from(stockItems).where(and(eq(stockItems.variantId, variantId), eq(stockItems.isSold, false))).orderBy(desc(stockItems.createdAt));
  }

  async deleteStockItem(id: number): Promise<void> {
    await db.delete(stockItems).where(eq(stockItems.id, id));
  }

  async reserveStockItem(variantId: number): Promise<StockItem | undefined> {
    const [item] = await db
      .select()
      .from(stockItems)
      .where(and(eq(stockItems.variantId, variantId), eq(stockItems.isSold, false)))
      .limit(1);

    if (item) {
      const [updated] = await db
        .update(stockItems)
        .set({ isSold: true })
        .where(eq(stockItems.id, item.id))
        .returning();
      return updated;
    }
    return undefined;
  }

  async createOrder(userId: number, items: { variantId: number; quantity: number }[], cardIds: number[] = []): Promise<Order> {
    let total = 0;
    const reservedStockItems: { variantId: number, stockItemId: number, price: number }[] = [];
    const cardPurchases: { cardId: number, price: number }[] = [];

    for (const item of items) {
      const [variant] = await db.select().from(variants).where(eq(variants.id, item.variantId));
      if (!variant) throw new Error("Variant not found");
      
      total += variant.price * item.quantity;

      for (let i = 0; i < item.quantity; i++) {
        const stockItem = await this.reserveStockItem(item.variantId);
        if (!stockItem) throw new Error(`Insufficient stock for ${variant.name}`);
        reservedStockItems.push({ variantId: item.variantId, stockItemId: stockItem.id, price: variant.price });
      }
    }

    for (const cardId of cardIds) {
      const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
      if (!card) throw new Error("Card not found");
      if (card.isSold) throw new Error("Card already sold");
      total += card.price;
      cardPurchases.push({ cardId: card.id, price: card.price });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.balance < total) throw new Error("Insufficient balance");

    await this.updateUserBalance(userId, -total);
    await this.createTransaction(userId, -total, "purchase", `Order purchase`);

    const publicOrderId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const [order] = await db.insert(orders).values({
      userId,
      orderId: publicOrderId,
      total,
      paidAmount: total,
      status: "fulfilled"
    }).returning();

    for (const res of reservedStockItems) {
      await db.insert(orderItems).values({
        orderId: order.id,
        variantId: res.variantId,
        stockItemId: res.stockItemId,
        cardId: null,
        itemType: "product",
        price: res.price,
        quantity: 1
      });
      
      await db.update(stockItems).set({ orderId: order.id }).where(eq(stockItems.id, res.stockItemId));
    }

    for (const cp of cardPurchases) {
      await db.insert(orderItems).values({
        orderId: order.id,
        variantId: null,
        cardId: cp.cardId,
        itemType: "card",
        price: cp.price,
        quantity: 1
      });
      await db.update(cards).set({ isSold: true, userId }).where(eq(cards.id, cp.cardId));
    }

    return order;
  }

  async createPendingOrder(userId: number, items: { variantId: number; quantity: number }[], cardIds: number[] = []): Promise<Order> {
    let total = 0;

    for (const item of items) {
      const [variant] = await db.select().from(variants).where(eq(variants.id, item.variantId));
      if (!variant) throw new Error("Variant not found");
      total += variant.price * item.quantity;
    }

    const publicOrderId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const [order] = await db.insert(orders).values({
      userId,
      orderId: publicOrderId,
      total,
      status: "pending"
    }).returning();

    for (const item of items) {
      const [variant] = await db.select().from(variants).where(eq(variants.id, item.variantId));
      if (!variant) continue;
      await db.insert(orderItems).values({
        orderId: order.id,
        variantId: item.variantId,
        stockItemId: null,
        cardId: null,
        itemType: "product",
        price: variant.price,
        quantity: item.quantity,
      });
    }

    return order;
  }

  async fulfillPendingOrder(orderId: number): Promise<void> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new Error("Order not found");
    await db.update(orders).set({ status: "fulfilled" }).where(eq(orders.id, orderId));
  }

  async fulfillCashappOrder(orderId: number): Promise<Order> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new Error("Order not found");
    if (order.status !== "waiting_payment" && order.status !== "pending") {
      throw new Error("Order is not in a payable state");
    }
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const deliveryParts: Record<string, string[]> = {};

    for (const item of items) {
      if (!item.variantId) continue;
      const [variant] = await db.select().from(variants).where(eq(variants.id, item.variantId));
      if (!variant) continue;
      const key = String(item.variantId);
      if (!deliveryParts[key]) deliveryParts[key] = [];
      for (let i = 0; i < (item.quantity ?? 1); i++) {
        const stock = await this.reserveStockItem(item.variantId);
        if (!stock) throw new Error(`Insufficient stock for ${variant.name}`);
        await db.update(orderItems).set({ stockItemId: stock.id }).where(eq(orderItems.id, item.id));
        await db.update(stockItems).set({ isSold: true, orderId }).where(eq(stockItems.id, stock.id));
        deliveryParts[key].push(stock.content);
      }
    }

    const deliveryContent = JSON.stringify(
      Object.fromEntries(Object.entries(deliveryParts).map(([k, v]) => [k, v.join("\n\n")]))
    );
    const [updated] = await db.update(orders)
      .set({ status: "delivering", deliveryContent, paidAmount: order.total })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  async markOrderUnpaid(orderId: number): Promise<Order> {
    const [updated] = await db.update(orders)
      .set({ status: "waiting_payment" })
      .where(eq(orders.id, orderId))
      .returning();
    if (!updated) throw new Error("Order not found");
    return updated;
  }

  async cancelPendingOrder(orderId: number): Promise<void> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order || order.status !== "pending") return;
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.update(orders).set({ status: "waiting_payment" as any }).where(eq(orders.id, orderId));
  }

  async cancelStalePendingOrders(maxAgeMs: number = 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const staleOrders = await db.select().from(orders)
      .where(and(eq(orders.status, "pending"), lt(orders.createdAt, cutoff)));
    let cancelled = 0;
    for (const order of staleOrders) {
      // Never auto-cancel CashApp orders — they need up to 4 hours
      if (order.paymentMethod === "CashApp") continue;
      await this.cancelPendingOrder(order.id);
      cancelled++;
    }
    return cancelled;
  }

  async getOrders(userId: number): Promise<(Order & { items: (OrderItem & { stockItem: StockItem | null, variant: Variant | null })[] })[]> {
    const userOrders = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    
    const result = [];
    for (const o of userOrders) {
      const oItems = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      const itemsWithDetails = [];
      for (const i of oItems) {
        const [stockItem] = i.stockItemId ? await db.select().from(stockItems).where(eq(stockItems.id, i.stockItemId)) : [undefined];
        const [variant] = i.variantId ? await db.select().from(variants).where(eq(variants.id, i.variantId)) : [undefined];
        const [product] = variant?.productId ? await db.select().from(products).where(eq(products.id, variant.productId)) : [undefined];
        const [card] = i.cardId ? await db.select().from(cards).where(eq(cards.id, i.cardId)) : [undefined];
        itemsWithDetails.push({ ...i, stockItem: stockItem || null, variant: variant || null, card: card || null, productName: product?.name || null });
      }
      result.push({ ...o, items: itemsWithDetails });
    }
    return result;
  }

  async getOrder(id: number) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const oItems = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const itemsWithDetails = [];
    for (const i of oItems) {
      const [stockItem] = i.stockItemId ? await db.select().from(stockItems).where(eq(stockItems.id, i.stockItemId)) : [undefined];
      const [variant] = i.variantId ? await db.select().from(variants).where(eq(variants.id, i.variantId)) : [undefined];
      const [card] = i.cardId ? await db.select().from(cards).where(eq(cards.id, i.cardId)) : [undefined];
      itemsWithDetails.push({ ...i, stockItem: stockItem || null, variant: variant || null, card: card || null });
    }
    
    return { ...order, items: itemsWithDetails };
  }

  async getAllOrders(): Promise<any[]> {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const result = [];
    for (const o of allOrders) {
      const [user] = await db.select().from(users).where(eq(users.id, o.userId));
      const oItems = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      const itemsWithDetails = [];
      for (const i of oItems) {
        const [stockItem] = i.stockItemId ? await db.select().from(stockItems).where(eq(stockItems.id, i.stockItemId)) : [undefined];
        const [variant] = i.variantId ? await db.select().from(variants).where(eq(variants.id, i.variantId)) : [undefined];
        const [product] = variant?.productId ? await db.select().from(products).where(eq(products.id, variant.productId)) : [undefined];
        const [card] = i.cardId ? await db.select().from(cards).where(eq(cards.id, i.cardId)) : [undefined];
        itemsWithDetails.push({ ...i, stockItem: stockItem || null, variant: variant || null, card: card || null, productName: product?.name || null });
      }
      let paymentMethod = "Unknown";
      try {
        const [cryptoPay] = await db.select().from(cryptoPayments).where(eq(cryptoPayments.orderId, o.id));
        if (cryptoPay) {
          paymentMethod = "Crypto";
        } else {
          const purchaseTxs = await db.select().from(transactions)
            .where(and(eq(transactions.userId, o.userId), eq(transactions.type, "purchase")))
            .orderBy(desc(transactions.createdAt));
          const purchaseTx = purchaseTxs.find(tx => {
            const txTime = new Date(tx.createdAt).getTime();
            const orderTime = new Date(o.createdAt).getTime();
            return Math.abs(txTime - orderTime) < 30000;
          });
          if (purchaseTx?.paymentMethod) paymentMethod = purchaseTx.paymentMethod;
        }
      } catch (e) {}
      const [verif] = await db.select().from(verifications).where(eq(verifications.userId, o.userId)).catch(() => [undefined]);
      result.push({ ...o, user: { id: user?.id, username: user?.username, email: user?.email, telegramUsername: verif?.telegramUsername || null, channelName: verif?.channelName || null, channelLink: verif?.channelLink || null }, items: itemsWithDetails, paymentMethod });
    }
    return result;
  }

  async refundOrder(orderId: number): Promise<Order> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order || order.status === 'refunded') throw new Error("Invalid order or already refunded");

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (item.itemType === 'product' && item.stockItemId) {
        await db.update(orderItems).set({ stockItemId: null }).where(eq(orderItems.id, item.id));
        await db.delete(stockItems).where(eq(stockItems.id, item.stockItemId));
      }
      if (item.itemType === 'card' && item.cardId) {
        await db.update(orderItems).set({ cardId: null }).where(eq(orderItems.id, item.id));
        await db.delete(cards).where(eq(cards.id, item.cardId));
      }
    }

    await this.updateUserBalance(order.userId, order.total);
    await this.createTransaction(order.userId, order.total, "refund", `Refund for order #${order.orderId}`);
    
    const [updated] = await db.update(orders).set({ status: 'refunded' as const }).where(eq(orders.id, orderId)).returning();
    return updated;
  }

  async updateOrderDelivery(orderId: number, deliveryContent: string): Promise<Order> {
    const [order] = await db.update(orders).set({
      deliveryContent,
      status: "fulfilled" as any
    }).where(eq(orders.id, orderId)).returning();
    return order;
  }

  async replaceOrderItem(orderId: number): Promise<Order> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new Error("Order not found");

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const productItems = items.filter(i => i.itemType === 'product' && i.variantId);
    if (productItems.length === 0) throw new Error("No product items to replace");
    
    for (const item of productItems) {
      if (!item.variantId) continue;
      const newStock = await this.reserveStockItem(item.variantId);
      if (!newStock) throw new Error("No stock available for replacement");
      
      await db.update(orderItems).set({ stockItemId: newStock.id }).where(eq(orderItems.id, item.id));
      await db.update(stockItems).set({ orderId, replacementForId: item.stockItemId }).where(eq(stockItems.id, newStock.id));
    }
    
    const [updated] = await db.update(orders).set({ status: 'replaced' as const }).where(eq(orders.id, orderId)).returning();
    return updated;
  }

  async createTransaction(userId: number, amount: number, type: string, description: string): Promise<Transaction> {
    const [tx] = await db.insert(transactions).values({
      userId,
      amount,
      type,
      description
    }).returning();
    return tx;
  }

  async createTransactionWithMethod(userId: number, amount: number, type: string, description: string, paymentMethod: string): Promise<Transaction> {
    const [tx] = await db.insert(transactions).values({
      userId,
      amount,
      type,
      description,
      paymentMethod
    }).returning();
    return tx;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async getRedeemCode(code: string): Promise<RedeemCode | undefined> {
    const [rc] = await db.select().from(redeemCodes).where(eq(redeemCodes.code, code));
    return rc;
  }

  async markRedeemCodeUsed(id: number, userId: number): Promise<void> {
    await db.update(redeemCodes).set({ isUsed: true, usedBy: userId }).where(eq(redeemCodes.id, id));
  }

  async createRedeemCode(code: string, amount: number): Promise<RedeemCode> {
    const [rc] = await db.insert(redeemCodes).values({ code, amount }).returning();
    return rc;
  }

  async getAllRedeemCodes(): Promise<RedeemCode[]> {
    return db.select().from(redeemCodes).orderBy(desc(redeemCodes.createdAt));
  }

  async getDashboardStats() {
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [salesSum] = await db.select({ sum: sql<number>`sum(${orders.total})` }).from(orders).where(eq(orders.status, 'fulfilled'));
    const [stockCount] = await db.select({ count: sql<number>`count(*)` }).from(stockItems).where(eq(stockItems.isSold, false));
    const [soldCount] = await db.select({ count: sql<number>`count(*)` }).from(stockItems).where(eq(stockItems.isSold, true));
    const [ordersCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const [pendingCount] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, 'waiting_payment'));

    return {
      totalUsers: Number(usersCount.count),
      totalSales: Number(salesSum.sum || 0),
      totalRevenue: Number(salesSum.sum || 0),
      storeBalance: 0,
      itemsInStock: Number(stockCount.count),
      itemsSold: Number(soldCount.count),
      totalOrders: Number(ordersCount.count),
      pendingOrders: Number(pendingCount.count)
    };
  }

  async getAdminLogs(): Promise<any[]> {
    return db.select().from(transactions).where(eq(transactions.type, "admin_adjustment")).orderBy(desc(transactions.createdAt)).limit(50);
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).where(eq(announcements.active, true)).orderBy(desc(announcements.createdAt));
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [ann] = await db.insert(announcements).values(announcement).returning();
    return ann;
  }

  async uploadImage(filename: string, mimeType: string, data: string): Promise<UploadedImage> {
    const [img] = await db.insert(uploadedImages).values({ filename, mimeType, data }).returning();
    return img;
  }

  async getImage(id: number): Promise<UploadedImage | undefined> {
    const [img] = await db.select().from(uploadedImages).where(eq(uploadedImages.id, id));
    return img;
  }

  async createSupportTicket(ticket: any): Promise<any> {
    const [t] = await db.insert(supportTickets).values(ticket).returning();
    return t;
  }

  async getSupportTickets(userId?: number): Promise<any[]> {
    const q = db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
    if (userId) return q.where(eq(supportTickets.userId, userId));
    return q;
  }

  async getSupportTicket(id: number): Promise<any> {
    const [t] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return t;
  }

  async updateSupportTicket(id: number, data: any): Promise<any> {
    const [t] = await db.update(supportTickets).set(data).where(eq(supportTickets.id, id)).returning();
    return t;
  }

  async getCards(): Promise<Card[]> {
    return db.select().from(cards).where(eq(cards.isSold, false)).orderBy(desc(cards.createdAt));
  }

  async getCard(id: number): Promise<Card | undefined> {
    const [card] = await db.select().from(cards).where(eq(cards.id, id));
    return card;
  }

  async createCard(insertCard: InsertCard): Promise<Card> {
    const [card] = await db.insert(cards).values(insertCard).returning();
    return card;
  }

  async updateCard(id: number, data: Partial<Card>): Promise<Card> {
    const [card] = await db.update(cards).set(data).where(eq(cards.id, id)).returning();
    return card;
  }

  async purchaseCard(cardId: number, userId: number): Promise<Card> {
    const [card] = await db.select().from(cards).where(and(eq(cards.id, cardId), eq(cards.isSold, false)));
    if (!card) throw new Error("Card not found or already sold");
    
    const [updated] = await db.update(cards).set({ isSold: true, userId }).where(eq(cards.id, cardId)).returning();

    // Create a matching order so it shows in "Orders"
    const publicOrderId = Math.random().toString(36).substring(2, 15);
    const [order] = await db.insert(orders).values({
      userId,
      orderId: `CARD-${publicOrderId}`,
      total: card.price,
      paidAmount: card.price,
      status: "fulfilled"
    }).returning();

    return updated;
  }

  async getUserCards(userId: number): Promise<Card[]> {
    return db.select().from(cards).where(eq(cards.userId, userId)).orderBy(desc(cards.createdAt));
  }

  async deleteCard(id: number): Promise<void> {
    await db.delete(cards).where(eq(cards.id, id));
  }

  async getSetting(key: string, defaultValue: string = ""): Promise<string> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value ?? defaultValue;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db
      .insert(siteSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value } });
  }

  async getPaymentMethodsConfig(): Promise<Record<string, boolean>> {
    const rows = await db.select().from(siteSettings)
      .where(sql`key LIKE 'payment_method_%'`);
    const defaults: Record<string, boolean> = { crypto: true, stars: true };
    for (const row of rows) {
      const method = row.key.replace("payment_method_", "");
      defaults[method] = row.value === "true";
    }
    return defaults;
  }

}

export const storage = new DatabaseStorage();
