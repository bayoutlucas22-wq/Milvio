import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  datetime,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Products table with pricing, costs, and inventory (total and cold storage)
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }).unique(),
  category: varchar("category", { length: 100 }).notNull(),
  salePrice: decimal("salePrice", { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }).notNull(),
  stockTotal: int("stockTotal").default(0).notNull(),
  stockCold: int("stockCold").default(0).notNull(),
  minimumStock: int("minimumStock").default(0).notNull(),
  platformFeePercent: decimal("platformFeePercent", { precision: 5, scale: 2 }).default("20.00").notNull(),
  extraFeePercent: decimal("extraFeePercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  marginTargetPercent: decimal("marginTargetPercent", { precision: 5, scale: 2 }).default("15.00").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Drivers table with status and delivery capacity tracking
 */
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  status: mysqlEnum("status", [
    "available",
    "one_order",
    "two_orders",
    "unavailable",
    "delayed",
    "paused",
  ]).default("available").notNull(),
  activeOrderCount: int("activeOrderCount").default(0).notNull(),
  maxActiveOrders: int("maxActiveOrders").default(2).notNull(),
  averageDeliveryTime: int("averageDeliveryTime").default(0), // in minutes
  delayRate: decimal("delayRate", { precision: 5, scale: 2 }).default("0.00"), // percentage
  completedOrdersToday: int("completedOrdersToday").default(0).notNull(),
  paymentDue: decimal("paymentDue", { precision: 10, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

/**
 * Orders table with SLA tracking and margin calculation
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  externalOrderId: varchar("externalOrderId", { length: 100 }).unique(),
  platform: varchar("platform", { length: 50 }), // e.g., "ifood", "uber", "manual"
  customerNeighborhood: varchar("customerNeighborhood", { length: 255 }),
  grossAmount: decimal("grossAmount", { precision: 10, scale: 2 }).notNull(),
  platformFeePercent: decimal("platformFeePercent", { precision: 5, scale: 2 }).default("20.00").notNull(),
  platformFeeAmount: decimal("platformFeeAmount", { precision: 10, scale: 2 }).notNull(),
  extraFeeAmount: decimal("extraFeeAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  productCostTotal: decimal("productCostTotal", { precision: 10, scale: 2 }).default("0.00").notNull(),
  deliveryCost: decimal("deliveryCost", { precision: 10, scale: 2 }).default("0.00").notNull(),
  packagingCost: decimal("packagingCost", { precision: 10, scale: 2 }).default("0.00").notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  refundAmount: decimal("refundAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  netMarginAmount: decimal("netMarginAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  netMarginPercent: decimal("netMarginPercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  slaPromisedMinutes: int("slaPromisedMinutes").default(30).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  pickingStartedAt: timestamp("pickingStartedAt"),
  readyAt: timestamp("readyAt"),
  dispatchedAt: timestamp("dispatchedAt"),
  deliveredAt: timestamp("deliveredAt"),
  status: mysqlEnum("status", [
    "pending",
    "accepted",
    "picking",
    "ready",
    "dispatched",
    "delivered",
    "cancelled",
  ]).default("pending").notNull(),
  delayMinutes: int("delayMinutes").default(0).notNull(),
  delayReason: varchar("delayReason", { length: 255 }),
  riskLevel: mysqlEnum("riskLevel", ["none", "low", "medium", "high"]).default("none").notNull(),
  driverId: int("driverId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items table with per-item margin calculation
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }).notNull(),
  categoryFeePercent: decimal("categoryFeePercent", { precision: 5, scale: 2 }).notNull(),
  extraFeePercent: decimal("extraFeePercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  grossAmount: decimal("grossAmount", { precision: 10, scale: 2 }).notNull(),
  feeAmount: decimal("feeAmount", { precision: 10, scale: 2 }).notNull(),
  costAmount: decimal("costAmount", { precision: 10, scale: 2 }).notNull(),
  netMarginAmount: decimal("netMarginAmount", { precision: 10, scale: 2 }).notNull(),
  netMarginPercent: decimal("netMarginPercent", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Deliveries table with time tracking
 */
export const deliveries = mysqlTable("deliveries", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(),
  driverId: int("driverId").notNull(),
  neighborhood: varchar("neighborhood", { length: 255 }),
  startedAt: timestamp("startedAt"),
  deliveredAt: timestamp("deliveredAt"),
  estimatedMinutes: int("estimatedMinutes"),
  actualMinutes: int("actualMinutes"),
  delayMinutes: int("delayMinutes").default(0).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "in_transit",
    "delivered",
    "failed",
  ]).default("pending").notNull(),
  issueReason: varchar("issueReason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Delivery = typeof deliveries.$inferSelect;
export type InsertDelivery = typeof deliveries.$inferInsert;

/**
 * Fee rules table for configurable platform and extra fees
 */
export const feeRules = mysqlTable("feeRules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  productId: int("productId"),
  platformFeePercent: decimal("platformFeePercent", { precision: 5, scale: 2 }).notNull(),
  extraFeePercent: decimal("extraFeePercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  paymentFeePercent: decimal("paymentFeePercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  validFrom: datetime("validFrom"),
  validTo: datetime("validTo"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeeRule = typeof feeRules.$inferSelect;
export type InsertFeeRule = typeof feeRules.$inferInsert;

/**
 * Cancellations table for tracking cancelled orders
 */
export const cancellations = mysqlTable("cancellations", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  valueLost: decimal("valueLost", { precision: 10, scale: 2 }).notNull(),
  productsReturned: int("productsReturned").default(0).notNull(),
  productsLost: int("productsLost").default(0).notNull(),
  deliveryCostLost: decimal("deliveryCostLost", { precision: 10, scale: 2 }).default("0.00").notNull(),
  responsibleParty: varchar("responsibleParty", { length: 100 }), // e.g., "customer", "driver", "store", "platform"
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Cancellation = typeof cancellations.$inferSelect;
export type InsertCancellation = typeof cancellations.$inferInsert;

/**
 * Daily closing table for financial summary
 */
export const dailyClosings = mysqlTable("dailyClosings", {
  id: int("id").autoincrement().primaryKey(),
  closingDate: datetime("closingDate").notNull().unique(),
  totalOrders: int("totalOrders").notNull(),
  totalDeliveredOrders: int("totalDeliveredOrders").notNull(),
  totalCancelledOrders: int("totalCancelledOrders").notNull(),
  grossRevenue: decimal("grossRevenue", { precision: 10, scale: 2 }).notNull(),
  platformCommissions: decimal("platformCommissions", { precision: 10, scale: 2 }).notNull(),
  extraFees: decimal("extraFees", { precision: 10, scale: 2 }).notNull(),
  productCosts: decimal("productCosts", { precision: 10, scale: 2 }).notNull(),
  deliveryCosts: decimal("deliveryCosts", { precision: 10, scale: 2 }).notNull(),
  packagingCosts: decimal("packagingCosts", { precision: 10, scale: 2 }).notNull(),
  discounts: decimal("discounts", { precision: 10, scale: 2 }).notNull(),
  refunds: decimal("refunds", { precision: 10, scale: 2 }).notNull(),
  totalNetMargin: decimal("totalNetMargin", { precision: 10, scale: 2 }).notNull(),
  netMarginPercent: decimal("netMarginPercent", { precision: 5, scale: 2 }).notNull(),
  ordersWithLoss: int("ordersWithLoss").default(0).notNull(),
  averageDelayMinutes: int("averageDelayMinutes").default(0).notNull(),
  onTimeDeliveryPercent: decimal("onTimeDeliveryPercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyClosing = typeof dailyClosings.$inferSelect;
export type InsertDailyClosing = typeof dailyClosings.$inferInsert;

/**
 * System settings table for configurable parameters
 */
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
