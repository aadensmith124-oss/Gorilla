import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === USERS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  balance: integer("balance").default(0).notNull(), // stored in cents
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  lastDailySpin: timestamp("last_daily_spin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  balance: true, 
  role: true, 
  isBanned: true, 
  lastDailySpin: true,
  createdAt: true 
}).extend({
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// === PRODUCTS ===
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(), // URL or path
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });

// === VARIANTS (OPTIONS) ===
export const variants = pgTable("variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  price: integer("price").notNull(), // in cents
});

export const insertVariantSchema = createInsertSchema(variants).omit({ id: true });

// === STOCK ITEMS ===
// 1 Item = 3 lines. We store the full content.
export const stockItems = pgTable("stock_items", {
  id: serial("id").primaryKey(),
  variantId: integer("variant_id").notNull().references(() => variants.id),
  content: text("content").notNull(),
  isSold: boolean("is_sold").default(false).notNull(),
  orderId: integer("order_id"), // Filled when sold
  replacementForId: integer("replacement_for_id"), // If this is a replacement
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockItemSchema = createInsertSchema(stockItems).omit({ 
  id: true, 
  isSold: true, 
  orderId: true, 
  replacementForId: true, 
  createdAt: true 
});

// === ORDERS ===
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status", { enum: ["pending", "paid", "refunded", "replaced"] }).default("pending").notNull(),
  total: integer("total").notNull(), // in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === ORDER ITEMS ===
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  variantId: integer("variant_id").notNull().references(() => variants.id),
  stockItemId: integer("stock_item_id").references(() => stockItems.id), // The specific item delivered
  price: integer("price").notNull(), // Price at purchase
});

// === TRANSACTIONS ===
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // + for deposit/win, - for purchase/loss
  type: text("type").notNull(), // deposit, purchase, refund, win, loss, daily_spin
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === REDEEM CODES ===
export const redeemCodes = pgTable("redeem_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  amount: integer("amount").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  usedBy: integer("used_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRedeemCodeSchema = createInsertSchema(redeemCodes).omit({ 
  id: true, 
  isUsed: true, 
  usedBy: true, 
  createdAt: true 
});

// === ANNOUNCEMENTS ===
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  link: text("link"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });

// === RELATIONS ===
export const productsRelations = relations(products, ({ many }) => ({
  variants: many(variants),
}));

export const variantsRelations = relations(variants, ({ one, many }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
  stockItems: many(stockItems),
}));

export const stockItemsRelations = relations(stockItems, ({ one }) => ({
  variant: one(variants, {
    fields: [stockItems.variantId],
    references: [variants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(variants, {
    fields: [orderItems.variantId],
    references: [variants.id],
  }),
  stockItem: one(stockItems, {
    fields: [orderItems.stockItemId],
    references: [stockItems.id],
  }),
}));


// === TYPES ===
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type StockItem = typeof stockItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type RedeemCode = typeof redeemCodes.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertVariant = z.infer<typeof insertVariantSchema>;
export type InsertStockItem = z.infer<typeof insertStockItemSchema>;
export type InsertRedeemCode = z.infer<typeof insertRedeemCodeSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
