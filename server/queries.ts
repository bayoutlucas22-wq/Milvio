import { and, desc, eq, gte, lte, asc } from "drizzle-orm";
import {
  cancellations,
  dailyClosings,
  deliveries,
  drivers,
  feeRules,
  orderItems,
  orders,
  products,
  systemSettings,
} from "../drizzle/schema";
import { getDb } from "./db";

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
    .where(and(eq(drivers.status, "available"), lte(drivers.activeOrderCount, 1)));
}

export async function getDriversWithCapacity() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(drivers).where(lte(drivers.activeOrderCount, 1)).orderBy(asc(drivers.activeOrderCount));
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
    .where(and(gte(orders.createdAt, today), lte(orders.createdAt, tomorrow)))
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
  return await db.select().from(orders).where(eq(orders.driverId, driverId));
}

export async function getActiveOrders() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orders).where(and(eq(orders.status, "dispatched"), lte(orders.createdAt, new Date())));
}

export async function getWaitingOrders() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orders).where(eq(orders.status, "ready"));
}

export async function getLateOrders() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orders).where(and(eq(orders.status, "dispatched"), gte(orders.delayMinutes, 1)));
}

export async function getCriticalOrders() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orders).where(eq(orders.riskLevel, "high"));
}

export async function getOrdersWithRisk() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orders).where(and(eq(orders.status, "dispatched"), eq(orders.riskLevel, "high")));
}

// ============ ORDER ITEMS ============

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

// ============ DELIVERIES ============

export async function getDeliveryByOrderId(orderId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(deliveries).where(eq(deliveries.orderId, orderId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ============ FEE RULES ============

export async function getFeeRuleByCategory(category: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(feeRules)
    .where(and(eq(feeRules.category, category), eq(feeRules.active, true)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getFeeRuleByProduct(productId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(feeRules)
    .where(and(eq(feeRules.productId, productId), eq(feeRules.active, true)))
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
    .where(and(gte(cancellations.createdAt, startDate), lte(cancellations.createdAt, endDate)));
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
    .where(and(gte(dailyClosings.closingDate, startOfDay), lte(dailyClosings.closingDate, endOfDay)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getLastDailyClosing() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(dailyClosings).orderBy(desc(dailyClosings.closingDate)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getDailyClosingHistory(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(dailyClosings).orderBy(desc(dailyClosings.closingDate)).limit(limit);
}

// ============ SYSTEM SETTINGS ============

export async function getSystemSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllSystemSettings() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(systemSettings);
}
