import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  ApiCredential,
  ApiKpiCache,
  ApiSyncLog,
  InsertOrderEvent,
  OrderEvent,
  InsertApiCredential,
  InsertApiKpiCache,
  InsertApiSyncLog,
  apiKpiCache,
  orderEvents,
  apiCredentials,
  apiSyncLogs,
} from "../../../drizzle/schema";

export async function getApiCredentialsByUserId(userId: number): Promise<ApiCredential | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(apiCredentials).where(and(eq(apiCredentials.userId, userId), eq(apiCredentials.isActive, true))).limit(1);
  return result[0];
}

export async function createApiCredential(data: InsertApiCredential): Promise<ApiCredential> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(apiCredentials).values(data);
  const result = await db.select().from(apiCredentials).where(eq(apiCredentials.userId, data.userId)).orderBy(desc(apiCredentials.createdAt)).limit(1);
  if (!result[0]) throw new Error("Failed to create API credential");
  return result[0];
}

export async function updateApiCredential(id: number, data: Partial<InsertApiCredential>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(apiCredentials).set(data).where(eq(apiCredentials.id, id));
}

export async function createApiSyncLog(data: InsertApiSyncLog): Promise<ApiSyncLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(apiSyncLogs).values(data);
  const result = await db.select().from(apiSyncLogs).where(eq(apiSyncLogs.apiCredentialId, data.apiCredentialId)).orderBy(desc(apiSyncLogs.createdAt)).limit(1);
  if (!result[0]) throw new Error("Failed to create sync log");
  return result[0];
}

export async function getCachedKPI(merchantId: string): Promise<ApiKpiCache | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(apiKpiCache).where(eq(apiKpiCache.merchantId, merchantId)).limit(1);
  const row = result[0];
  if (!row || new Date() > row.expiresAt) return undefined;
  return row;
}

export async function cacheKPI(data: InsertApiKpiCache): Promise<ApiKpiCache> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(apiKpiCache).where(eq(apiKpiCache.merchantId, data.merchantId));
  await db.insert(apiKpiCache).values(data);
  const result = await db.select().from(apiKpiCache).where(eq(apiKpiCache.merchantId, data.merchantId)).limit(1);
  if (!result[0]) throw new Error("Failed to cache KPI");
  return result[0];
}

export async function upsertOrderEvent(data: InsertOrderEvent): Promise<OrderEvent> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(orderEvents).where(eq(orderEvents.eventId, data.eventId)).limit(1);
  if (existing[0]) {
    await db.update(orderEvents).set({
      ...data,
      eventId: existing[0].eventId,
    }).where(eq(orderEvents.eventId, data.eventId));
  } else {
    await db.insert(orderEvents).values(data);
  }
  const result = await db.select().from(orderEvents).where(eq(orderEvents.eventId, data.eventId)).limit(1);
  if (!result[0]) throw new Error("Failed to persist order event");
  return result[0];
}

export async function getRecentOrderEvents(merchantId: string, limit = 10): Promise<OrderEvent[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(orderEvents).where(eq(orderEvents.merchantId, merchantId)).orderBy(desc(orderEvents.createdAt)).limit(limit);
}
