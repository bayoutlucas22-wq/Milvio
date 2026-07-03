import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  products,
  drivers,
  orders,
  orderItems,
  deliveries,
  feeRules,
  cancellations,
  dailyClosings,
  systemSettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ PRODUCTS ============

export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).where(eq(products.active, true));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getCriticalStockProducts() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(products)
    .where(and(eq(products.active, true), lte(products.stockCold, products.minimumStock)));
}

// ============ DRIVERS ============

export async function getAllDrivers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(drivers);
}

export async function getDriverById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAvailableDrivers() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(drivers)
    .where(
      and(
        eq(drivers.status, "available"),
        lte(drivers.activeOrderCount, 1)
      )
    );
}

export async function getDriversWithCapacity() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(drivers)
    .where(lte(drivers.activeOrderCount, 1))
    .orderBy(asc(drivers.activeOrderCount));
}

// ============ ORDERS ============

export async function getTodayOrders() {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, today),
        lte(orders.createdAt, tomorrow)
      )
    )
    .orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getOrdersByDriver(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(orders)
    .where(eq(orders.driverId, driverId));
}

export async function getActiveOrders() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "dispatched"),
        lte(orders.createdAt, new Date())
      )
    );
}

export async function getLateOrders() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "dispatched"),
        gte(orders.delayMinutes, 1)
      )
    );
}

export async function getOrdersWithRisk() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "dispatched"),
        eq(orders.riskLevel, "high")
      )
    );
}

// ============ ORDER ITEMS ============

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}

// ============ DELIVERIES ============

export async function getDeliveryByOrderId(orderId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.orderId, orderId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// ============ FEE RULES ============

export async function getFeeRuleByCategory(category: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(feeRules)
    .where(
      and(
        eq(feeRules.category, category),
        eq(feeRules.active, true)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getFeeRuleByProduct(productId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(feeRules)
    .where(
      and(
        eq(feeRules.productId, productId),
        eq(feeRules.active, true)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllFeeRules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(feeRules).where(eq(feeRules.active, true));
}

// ============ CANCELLATIONS ============

export async function getCancellationsByDate(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(cancellations)
    .where(
      and(
        gte(cancellations.createdAt, startDate),
        lte(cancellations.createdAt, endDate)
      )
    );
}

// ============ DAILY CLOSINGS ============

export async function getDailyClosingByDate(date: Date) {
  const db = await getDb();
  if (!db) return null;
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await db
    .select()
    .from(dailyClosings)
    .where(
      and(
        gte(dailyClosings.closingDate, startOfDay),
        lte(dailyClosings.closingDate, endOfDay)
      )
    )
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getLastDailyClosing() {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(dailyClosings)
    .orderBy(desc(dailyClosings.closingDate))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// ============ SYSTEM SETTINGS ============

export async function getSystemSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllSystemSettings() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(systemSettings);
}

// ============ CALCULATION HELPERS ============

/**
 * Calculate SLA delay for an order
 */
export function calculateOrderDelay(order: any): number {
  if (!order.deliveredAt || !order.createdAt) return 0;
  
  const totalTime = new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime();
  const totalMinutes = Math.floor(totalTime / (1000 * 60));
  const promisedMinutes = order.slaPromisedMinutes || 30;
  
  return Math.max(0, totalMinutes - promisedMinutes);
}

/**
 * Determine risk level based on margin percentage
 */
export function calculateRiskLevel(marginPercent: number): "none" | "low" | "medium" | "high" {
  if (marginPercent >= 15) return "none";
  if (marginPercent >= 10) return "low";
  if (marginPercent >= 5) return "medium";
  return "high";
}

/**
 * Calculate net margin for an order
 */
export function calculateNetMargin(
  grossAmount: number,
  platformFeeAmount: number,
  extraFeeAmount: number,
  productCostTotal: number,
  deliveryCost: number,
  packagingCost: number,
  discountAmount: number
): { amount: number; percent: number } {
  const netMargin =
    grossAmount -
    platformFeeAmount -
    extraFeeAmount -
    productCostTotal -
    deliveryCost -
    packagingCost -
    discountAmount;

  const netMarginPercent = grossAmount > 0 ? (netMargin / grossAmount) * 100 : 0;

  return {
    amount: Math.max(0, netMargin),
    percent: Math.max(0, netMarginPercent),
  };
}
