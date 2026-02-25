import { db } from "./db";
import { 
  users, products, variants, stockItems, orders, orderItems, transactions, redeemCodes, announcements, uploadedImages, cards,
  type User, type InsertUser, type Product, type InsertProduct, type Variant, type InsertVariant,
  type StockItem, type Order, type OrderItem, type Transaction, type RedeemCode, type Announcement, type InsertAnnouncement, type UploadedImage,
  type Card, type InsertCard
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amountCents: number): Promise<User>;
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
  createOrder(userId: number, items: { variantId: number; quantity: number }[]): Promise<Order>;
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
  
  // Announcements
  getAnnouncements(): Promise<Announcement[]>;
  getAllAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  
  // Images
  uploadImage(filename: string, mimeType: string, data: string): Promise<UploadedImage>;
  getImage(id: number): Promise<UploadedImage | undefined>;

  // Cards
  getCards(): Promise<Card[]>;
  getCard(id: number): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: number, data: Partial<Card>): Promise<Card>;
  purchaseCard(cardId: number, userId: number): Promise<Card>;
  getUserCards(userId: number): Promise<Card[]>;
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

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
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
      await db.delete(stockItems).where(eq(stockItems.variantId, v.id));
    }
    await db.delete(variants).where(eq(variants.productId, id));
    await db.delete(products).where(eq(products.id, id));
  }

  async addStockItems(variantId: number, content: string): Promise<number> {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return 0;

    const values = lines.map(itemContent => ({
      variantId,
      content: itemContent,
      isSold: false
    }));

    await db.insert(stockItems).values(values);
    return lines.length;
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

  async createOrder(userId: number, items: { variantId: number; quantity: number }[]): Promise<Order> {
    let total = 0;
    const reservedStockItems: { variantId: number, stockItemId: number, price: number }[] = [];

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
        price: res.price,
        quantity: 1
      });
      
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

  async getAllOrders(): Promise<any[]> {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const result = [];
    for (const o of allOrders) {
      const [user] = await db.select().from(users).where(eq(users.id, o.userId));
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      result.push({ ...o, user, items });
    }
    return result;
  }

  async refundOrder(orderId: number): Promise<Order> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order || order.status === 'refunded') throw new Error("Invalid order or already refunded");
    
    const [updated] = await db.update(orders).set({ status: 'refunded' as const }).where(eq(orders.id, orderId)).returning();
    return updated;
  }

  async replaceOrderItem(orderId: number): Promise<Order> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order || order.status !== 'paid') throw new Error("Invalid order");
    
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    if (items.length === 0) throw new Error("No items to replace");
    
    const firstItem = items[0];
    const newStock = await this.reserveStockItem(firstItem.variantId);
    if (!newStock) throw new Error("No stock available for replacement");
    
    await db.update(orderItems).set({ stockItemId: newStock.id }).where(eq(orderItems.id, firstItem.id));
    await db.update(stockItems).set({ orderId, replacementForId: firstItem.stockItemId }).where(eq(stockItems.id, newStock.id));
    
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
    const [salesSum] = await db.select({ sum: sql<number>`sum(${orders.paidAmount})` }).from(orders).where(eq(orders.status, 'fulfilled'));
    const [balanceSum] = await db.select({ sum: sql<number>`sum(${users.balance})` }).from(users);
    const [stockCount] = await db.select({ count: sql<number>`count(*)` }).from(stockItems).where(eq(stockItems.isSold, false));
    const [soldCount] = await db.select({ count: sql<number>`count(*)` }).from(stockItems).where(eq(stockItems.isSold, true));
    const [ordersCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const [pendingCount] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, 'unpaid'));

    return {
      totalUsers: Number(usersCount.count),
      totalSales: Number(salesSum.sum || 0),
      totalRevenue: Number(salesSum.sum || 0),
      storeBalance: Number(balanceSum.sum || 0),
      itemsInStock: Number(stockCount.count),
      itemsSold: Number(soldCount.count),
      totalOrders: Number(ordersCount.count),
      pendingOrders: Number(pendingCount.count)
    };
  }

  async getAdminLogs(): Promise<any[]> {
    return [];
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
    return updated;
  }

  async getUserCards(userId: number): Promise<Card[]> {
    return db.select().from(cards).where(eq(cards.userId, userId)).orderBy(desc(cards.createdAt));
  }
}

export const storage = new DatabaseStorage();
