import { db } from "./db";
import { 
  users, products, variants, stockItems, orders, orderItems, transactions, redeemCodes, announcements,
  type User, type InsertUser, type Product, type InsertProduct, type Variant, type InsertVariant,
  type StockItem, type Order, type OrderItem, type Transaction, type RedeemCode, type Announcement, type InsertAnnouncement
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amountCents: number): Promise<User>; // amountCents can be negative
  updateLastDailySpin(userId: number): Promise<void>;

  // Products & Variants
  getProducts(): Promise<(Product & { variants: (Variant & { stockCount: number })[] })[]>;
  getProduct(id: number): Promise<(Product & { variants: (Variant & { stockCount: number })[] }) | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  createVariant(variant: InsertVariant): Promise<Variant>;
  
  // Stock
  addStockItems(variantId: number, content: string): Promise<number>; // Returns count added
  reserveStockItem(variantId: number): Promise<StockItem | undefined>;
  
  // Orders
  createOrder(userId: number, items: { variantId: number; quantity: number }[]): Promise<Order>;
  getOrders(userId: number): Promise<(Order & { items: (OrderItem & { stockItem: StockItem | null, variant: Variant | null })[] })[]>;
  getOrder(id: number): Promise<(Order & { items: (OrderItem & { stockItem: StockItem | null, variant: Variant | null })[] }) | undefined>;
  
  // Wallet
  createTransaction(userId: number, amount: number, type: string, description: string): Promise<Transaction>;
  getTransactions(userId: number): Promise<Transaction[]>;
  getRedeemCode(code: string): Promise<RedeemCode | undefined>;
  markRedeemCodeUsed(id: number, userId: number): Promise<void>;
  createRedeemCode(code: string, amount: number): Promise<RedeemCode>;
  
  // Admin
  getDashboardStats(): Promise<{ totalUsers: number; totalSales: number; storeBalance: number; itemsInStock: number; itemsSold: number }>;
  
  // Announcements
  getAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
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

  async updateLastDailySpin(userId: number): Promise<void> {
    await db.update(users).set({ lastDailySpin: new Date() }).where(eq(users.id, userId));
  }

  async getProducts(): Promise<(Product & { variants: (Variant & { stockCount: number })[] })[]> {
    const allProducts = await db.select().from(products).where(eq(products.active, true));
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

  async createVariant(insertVariant: InsertVariant): Promise<Variant> {
    const [variant] = await db.insert(variants).values(insertVariant).returning();
    return variant;
  }

  async addStockItems(variantId: number, content: string): Promise<number> {
    // 1 Item = 3 non-empty lines
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const items: string[] = [];
    
    for (let i = 0; i < lines.length; i += 3) {
      if (i + 2 < lines.length) {
        items.push([lines[i], lines[i+1], lines[i+2]].join('\n'));
      }
    }

    if (items.length === 0) return 0;

    await db.insert(stockItems).values(
      items.map(itemContent => ({
        variantId,
        content: itemContent,
        isSold: false
      }))
    );

    return items.length;
  }

  async reserveStockItem(variantId: number): Promise<StockItem | undefined> {
    // Find first unsold item
    // In a real high-concurrency app, this needs a transaction/lock
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

  async createOrder(userId: number, items: { variantId: number; quantity: number }[]): Promise<Order> {
    // Calculate total
    let total = 0;
    const reservedStockItems: { variantId: number, stockItemId: number, price: number }[] = [];

    // Validations and Reservations
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

    // Check Balance
    const user = await this.getUser(userId);
    if (!user || user.balance < total) {
      // Rollback stock reservations (naive implementation, manual rollback)
      for (const res of reservedStockItems) {
        await db.update(stockItems).set({ isSold: false }).where(eq(stockItems.id, res.stockItemId));
      }
      throw new Error("Insufficient balance");
    }

    // Deduct Balance
    await this.updateUserBalance(userId, -total);
    await this.createTransaction(userId, -total, "purchase", "Order payment");

    // Create Order
    const [order] = await db.insert(orders).values({
      userId,
      total,
      status: "paid"
    }).returning();

    // Create Order Items and Link Stock
    for (const res of reservedStockItems) {
      await db.insert(orderItems).values({
        orderId: order.id,
        variantId: res.variantId,
        stockItemId: res.stockItemId,
        price: res.price
      });
      
      // Update stock item with order ID
      await db.update(stockItems).set({ orderId: order.id }).where(eq(stockItems.id, res.stockItemId));
    }

    return order;
  }

  async getOrders(userId: number): Promise<(Order & { items: (OrderItem & { stockItem: StockItem | null, variant: Variant | null })[] })[]> {
    const userOrders = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    
    const result = [];
    for (const o of userOrders) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      const itemsWithDetails = [];
      for (const i of items) {
        const [stockItem] = i.stockItemId ? await db.select().from(stockItems).where(eq(stockItems.id, i.stockItemId)) : [undefined];
        const [variant] = await db.select().from(variants).where(eq(variants.id, i.variantId));
        itemsWithDetails.push({ ...i, stockItem: stockItem || null, variant: variant || null });
      }
      result.push({ ...o, items: itemsWithDetails });
    }
    return result;
  }

  async getOrder(id: number): Promise<(Order & { items: (OrderItem & { stockItem: StockItem | null, variant: Variant | null })[] }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const itemsWithDetails = [];
    for (const i of items) {
      const [stockItem] = i.stockItemId ? await db.select().from(stockItems).where(eq(stockItems.id, i.stockItemId)) : [undefined];
      const [variant] = await db.select().from(variants).where(eq(variants.id, i.variantId));
      itemsWithDetails.push({ ...i, stockItem: stockItem || null, variant: variant || null });
    }
    
    return { ...order, items: itemsWithDetails };
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

  async getDashboardStats() {
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [salesSum] = await db.select({ sum: sql<number>`sum(${orders.total})` }).from(orders);
    const [balanceSum] = await db.select({ sum: sql<number>`sum(${users.balance})` }).from(users);
    const [stockCount] = await db.select({ count: sql<number>`count(*)` }).from(stockItems).where(eq(stockItems.isSold, false));
    const [soldCount] = await db.select({ count: sql<number>`count(*)` }).from(stockItems).where(eq(stockItems.isSold, true));

    return {
      totalUsers: Number(usersCount.count),
      totalSales: Number(salesSum.sum || 0),
      storeBalance: Number(balanceSum.sum || 0),
      itemsInStock: Number(stockCount.count),
      itemsSold: Number(soldCount.count)
    };
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).where(eq(announcements.active, true)).orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [ann] = await db.insert(announcements).values(announcement).returning();
    return ann;
  }
}

export const storage = new DatabaseStorage();
