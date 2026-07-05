import { and, desc, eq, gte, lte, asc } from "drizzle-orm";
import {
  cancellations,
  dailyClosings,
  deliveries,
  drivers,
  importBatches,
  importDriverRows,
  importOrderProductRows,
  importOrderRows,
  importRestitutionRows,
  feeRules,
  orderItems,
  orders,
  products,
  systemSettings,
} from "../drizzle/schema";
import { getDb } from "./db";

export type ExecutiveDailyClosing = {
  closingDate: Date;
  totalOrders: number;
  totalDeliveredOrders: number;
  totalCancelledOrders: number;
  grossRevenue: number;
  platformCommissions: number;
  extraFees: number;
  productCosts: number;
  deliveryCosts: number;
  packagingCosts: number;
  discounts: number;
  refunds: number;
  totalNetMargin: number;
  netMarginPercent: number;
  ordersWithLoss: number;
  averageDelayMinutes: number;
  onTimeDeliveryPercent: number;
};

export type ExecutiveSummary = {
  latestClosing: ExecutiveDailyClosing | null;
  history: ExecutiveDailyClosing[];
  averageNetMarginPercent: number;
  averageGrossRevenue: number;
  trend: "up" | "down" | "flat";
  bestDay: ExecutiveDailyClosing | null;
  worstDay: ExecutiveDailyClosing | null;
};

export type ImportedSummariesResult = Record<string, unknown>;

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function normalizeDateLabel(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function normalizeDailyClosing(row: typeof dailyClosings.$inferSelect): ExecutiveDailyClosing {
  return {
    closingDate: row.closingDate,
    totalOrders: toNumber(row.totalOrders),
    totalDeliveredOrders: toNumber(row.totalDeliveredOrders),
    totalCancelledOrders: toNumber(row.totalCancelledOrders),
    grossRevenue: toNumber(row.grossRevenue),
    platformCommissions: toNumber(row.platformCommissions),
    extraFees: toNumber(row.extraFees),
    productCosts: toNumber(row.productCosts),
    deliveryCosts: toNumber(row.deliveryCosts),
    packagingCosts: toNumber(row.packagingCosts),
    discounts: toNumber(row.discounts),
    refunds: toNumber(row.refunds),
    totalNetMargin: toNumber(row.totalNetMargin),
    netMarginPercent: toNumber(row.netMarginPercent),
    ordersWithLoss: toNumber(row.ordersWithLoss),
    averageDelayMinutes: toNumber(row.averageDelayMinutes),
    onTimeDeliveryPercent: toNumber(row.onTimeDeliveryPercent),
  };
}

export function buildExecutiveSummary(rows: typeof dailyClosings.$inferSelect[]): ExecutiveSummary {
  const history = rows.map(normalizeDailyClosing);
  const latestClosing = history[0] ?? null;
  const averageNetMarginPercent = history.length
    ? history.reduce((sum, row) => sum + row.netMarginPercent, 0) / history.length
    : 0;
  const averageGrossRevenue = history.length
    ? history.reduce((sum, row) => sum + row.grossRevenue, 0) / history.length
    : 0;
  const bestDay = history.reduce<ExecutiveDailyClosing | null>((best, row) => {
    if (!best || row.totalNetMargin > best.totalNetMargin) return row;
    return best;
  }, null);
  const worstDay = history.reduce<ExecutiveDailyClosing | null>((worst, row) => {
    if (!worst || row.totalNetMargin < worst.totalNetMargin) return row;
    return worst;
  }, null);
  const trend =
    history.length >= 2
      ? history[0].totalNetMargin > history[history.length - 1].totalNetMargin
        ? "up"
        : history[0].totalNetMargin < history[history.length - 1].totalNetMargin
          ? "down"
          : "flat"
      : "flat";

  return {
    latestClosing,
    history,
    averageNetMarginPercent,
    averageGrossRevenue,
    trend,
    bestDay,
    worstDay,
  };
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

export async function getExecutiveSummary(limit = 7) {
  const history = await getDailyClosingHistory(limit);
  return buildExecutiveSummary(history);
}

function buildOrdersSummaryFromRows(
  batch: typeof importBatches.$inferSelect,
  rows: typeof importOrderRows.$inferSelect[],
  productsRows: typeof importOrderProductRows.$inferSelect[]
) {
  const paymentMix = new Map<string, number>();
  const courierStats = new Map<string, { count: number; total: number }>();
  const productStats = new Map<string, { count: number; total: number }>();

  let subtotalRevenue = 0;
  let freightRevenue = 0;
  let discountTotal = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let grossRevenue = 0;

  for (const row of rows) {
    const payment = row.paymentMethod?.trim() || "Nao informado";
    const courier = row.courierName?.trim() || "";
    const total = toNumber(row.total);

    subtotalRevenue += toNumber(row.subtotal);
    freightRevenue += toNumber(row.freight);
    discountTotal += toNumber(row.discount);
    grossRevenue += total;
    paymentMix.set(payment, (paymentMix.get(payment) ?? 0) + total);

    if ((row.status ?? "").toLowerCase().includes("entreg")) deliveredOrders += 1;
    if ((row.status ?? "").toLowerCase().includes("cancel")) cancelledOrders += 1;

    if (courier) {
      const current = courierStats.get(courier) ?? { count: 0, total: 0 };
      courierStats.set(courier, { count: current.count + 1, total: current.total + total });
    }
  }

  for (const row of productsRows) {
    const current = productStats.get(row.name) ?? { count: 0, total: 0 };
    productStats.set(row.name, {
      count: current.count + toNumber(row.quantity),
      total: current.total + toNumber(row.total),
    });
  }

  return {
    reportType: "orders_report" as const,
    title: batch.title,
    sourceSheet: batch.sourceSheet,
    importedRows: batch.importedRows,
    dateFrom: toIsoDate(batch.dateFrom),
    dateTo: toIsoDate(batch.dateTo),
    totals: {
      totalOrders: rows.length,
      deliveredOrders,
      cancelledOrders,
      grossRevenue,
      subtotalRevenue,
      freightRevenue,
      discountTotal,
    },
    topCouriers: [...courierStats.entries()]
      .map(([name, value]) => ({ name, count: value.count, total: value.total }))
      .sort((a, b) => b.count - a.count || b.total - a.total)
      .slice(0, 5),
    paymentMix: Object.fromEntries(paymentMix.entries()),
    topProducts: [...productStats.entries()]
      .map(([name, value]) => ({ name, count: value.count, total: value.total }))
      .sort((a, b) => b.total - a.total || b.count - a.count)
      .slice(0, 5),
  };
}

function buildDriversSummaryFromRows(
  batch: typeof importBatches.$inferSelect,
  rows: typeof importDriverRows.$inferSelect[]
) {
  const drivers = rows
    .map((row) => ({
      name: row.name,
      deliveredOrders: toNumber(row.deliveredOrders),
      cashTotal: toNumber(row.cashTotal),
      cardTotal: toNumber(row.cardTotal),
      onlineTotal: toNumber(row.onlineTotal),
      total: toNumber(row.total),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    reportType: "drivers_report" as const,
    title: batch.title,
    sourceSheet: batch.sourceSheet,
    importedRows: batch.importedRows,
    dateFrom: toIsoDate(batch.dateFrom),
    dateTo: toIsoDate(batch.dateTo),
    totals: {
      totalDrivers: drivers.length,
      deliveredOrders: drivers.reduce((sum, row) => sum + row.deliveredOrders, 0),
      cashTotal: drivers.reduce((sum, row) => sum + row.cashTotal, 0),
      cardTotal: drivers.reduce((sum, row) => sum + row.cardTotal, 0),
      onlineTotal: drivers.reduce((sum, row) => sum + row.onlineTotal, 0),
      grossRevenue: drivers.reduce((sum, row) => sum + row.total, 0),
    },
    drivers,
  };
}

function buildRestitutionSummaryFromRows(
  batch: typeof importBatches.$inferSelect,
  rows: typeof importRestitutionRows.$inferSelect[]
) {
  const normalizedRows = rows.map((row) => ({
    date: row.dateLabel,
    grossRevenue: toNumber(row.grossRevenue),
    storeCostTotal: toNumber(row.storeCostTotal),
    driverCostTotal: toNumber(row.driverCostTotal),
    finalCostAmount: toNumber(row.finalCostAmount),
    totalNetMargin: toNumber(row.totalNetMargin),
    netMarginPercent: toNumber(row.netMarginPercent),
    restitutionFreight: toNumber(row.restitutionFreight),
    restitutionMarkup: toNumber(row.restitutionMarkup),
    marketplaceCommission: toNumber(row.marketplaceCommission),
    restitutionPromotions: toNumber(row.restitutionPromotions),
    restitutionTotal: toNumber(row.restitutionTotal),
    manualAdjustments: toNumber(row.manualAdjustments),
  }));

  const totals = normalizedRows.reduce(
    (sum, row) => ({
      grossRevenue: sum.grossRevenue + row.grossRevenue,
      storeCostTotal: sum.storeCostTotal + row.storeCostTotal,
      driverCostTotal: sum.driverCostTotal + row.driverCostTotal,
      finalCostAmount: sum.finalCostAmount + row.finalCostAmount,
      totalNetMargin: sum.totalNetMargin + row.totalNetMargin,
      restitutionFreight: sum.restitutionFreight + row.restitutionFreight,
      restitutionMarkup: sum.restitutionMarkup + row.restitutionMarkup,
      marketplaceCommission: sum.marketplaceCommission + row.marketplaceCommission,
      restitutionPromotions: sum.restitutionPromotions + row.restitutionPromotions,
      restitutionTotal: sum.restitutionTotal + row.restitutionTotal,
    }),
    {
      grossRevenue: 0,
      storeCostTotal: 0,
      driverCostTotal: 0,
      finalCostAmount: 0,
      totalNetMargin: 0,
      restitutionFreight: 0,
      restitutionMarkup: 0,
      marketplaceCommission: 0,
      restitutionPromotions: 0,
      restitutionTotal: 0,
    }
  );

  return {
    reportType: "restitution_summary" as const,
    title: batch.title,
    sourceSheet: batch.sourceSheet,
    importedRows: batch.importedRows,
    dateFrom: toIsoDate(batch.dateFrom),
    dateTo: toIsoDate(batch.dateTo),
    totals,
    rows: normalizedRows,
  };
}

type RestitutionBatchLike = {
  importId: string;
  reportType?: string;
  fileName?: string;
  importedRows?: number;
  dateFrom?: Date | null;
  dateTo?: Date | null;
};

type RestitutionRowLike = {
  importId: string;
  dateLabel: string;
  grossRevenue?: unknown;
  storeCostTotal?: unknown;
  driverCostTotal?: unknown;
  finalCostAmount?: unknown;
  totalNetMargin?: unknown;
  netMarginPercent?: unknown;
  restitutionFreight?: unknown;
  restitutionMarkup?: unknown;
  marketplaceCommission?: unknown;
  restitutionPromotions?: unknown;
  restitutionTotal?: unknown;
  manualAdjustments?: unknown;
};

function parseImportDateLabel(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const brDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brDate) {
    const [, day, month, year] = brDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function buildMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildMonthlyRestitutionIntelligence(
  batches: RestitutionBatchLike[],
  rows: RestitutionRowLike[]
) {
  const restitutionBatches = batches.filter(
    (batch) => batch.reportType === "restitution_summary" || !batch.reportType
  );
  const validImportIds = new Set(restitutionBatches.map((batch) => batch.importId));
  const uniqueRowsByDate = new Map<string, RestitutionRowLike>();

  for (const row of rows) {
    if (!validImportIds.has(row.importId)) continue;
    const isoDate = parseImportDateLabel(row.dateLabel);
    if (!isoDate || uniqueRowsByDate.has(isoDate)) continue;
    uniqueRowsByDate.set(isoDate, row);
  }

  const datedRows = [...uniqueRowsByDate.entries()]
    .map(([date, row]) => ({ date, month: date.slice(0, 7), row }))
    .sort((left, right) => left.date.localeCompare(right.date));

  const months = new Map<
    string,
    {
      month: string;
      label: string;
      days: number;
      grossRevenue: number;
      storeCostTotal: number;
      driverCostTotal: number;
      finalCostAmount: number;
      totalNetMargin: number;
      restitutionTotal: number;
      marketplaceCommission: number;
    }
  >();

  for (const item of datedRows) {
    const current = months.get(item.month) ?? {
      month: item.month,
      label: buildMonthLabel(item.month),
      days: 0,
      grossRevenue: 0,
      storeCostTotal: 0,
      driverCostTotal: 0,
      finalCostAmount: 0,
      totalNetMargin: 0,
      restitutionTotal: 0,
      marketplaceCommission: 0,
    };

    current.days += 1;
    current.grossRevenue += toNumber(item.row.grossRevenue);
    current.storeCostTotal += toNumber(item.row.storeCostTotal);
    current.driverCostTotal += toNumber(item.row.driverCostTotal);
    current.finalCostAmount += toNumber(item.row.finalCostAmount);
    current.totalNetMargin += toNumber(item.row.totalNetMargin);
    current.restitutionTotal += toNumber(item.row.restitutionTotal);
    current.marketplaceCommission += toNumber(item.row.marketplaceCommission);
    months.set(item.month, current);
  }

  const monthRows = [...months.values()].map((month) => ({
    ...month,
    grossRevenue: roundMoney(month.grossRevenue),
    storeCostTotal: roundMoney(month.storeCostTotal),
    driverCostTotal: roundMoney(month.driverCostTotal),
    finalCostAmount: roundMoney(month.finalCostAmount),
    totalNetMargin: roundMoney(month.totalNetMargin),
    restitutionTotal: roundMoney(month.restitutionTotal),
    marketplaceCommission: roundMoney(month.marketplaceCommission),
    netMarginPercent: month.grossRevenue > 0 ? roundMoney((month.totalNetMargin / month.grossRevenue) * 100) : 0,
  }));

  if (monthRows.length < 2) return null;

  const totals = monthRows.reduce(
    (sum, month) => ({
      grossRevenue: roundMoney(sum.grossRevenue + month.grossRevenue),
      storeCostTotal: roundMoney(sum.storeCostTotal + month.storeCostTotal),
      driverCostTotal: roundMoney(sum.driverCostTotal + month.driverCostTotal),
      finalCostAmount: roundMoney(sum.finalCostAmount + month.finalCostAmount),
      totalNetMargin: roundMoney(sum.totalNetMargin + month.totalNetMargin),
      restitutionTotal: roundMoney(sum.restitutionTotal + month.restitutionTotal),
      marketplaceCommission: roundMoney(sum.marketplaceCommission + month.marketplaceCommission),
    }),
    {
      grossRevenue: 0,
      storeCostTotal: 0,
      driverCostTotal: 0,
      finalCostAmount: 0,
      totalNetMargin: 0,
      restitutionTotal: 0,
      marketplaceCommission: 0,
    }
  );
  const dateFrom = datedRows[0]?.date;
  const dateTo = datedRows[datedRows.length - 1]?.date;
  const importedRowsTotal = restitutionBatches.reduce((sum, batch) => sum + toNumber(batch.importedRows), 0);

  return {
    reportType: "monthly_restitution_intelligence" as const,
    dateFrom,
    dateTo,
    monthCount: monthRows.length,
    fileCount: restitutionBatches.length,
    totalRows: datedRows.length,
    uniqueDays: datedRows.length,
    importedRowsTotal,
    totals: {
      ...totals,
      netMarginPercent: totals.grossRevenue > 0 ? roundMoney((totals.totalNetMargin / totals.grossRevenue) * 100) : 0,
    },
    months: monthRows,
    story: `Base mensal consolidada de ${monthRows[0]?.label} a ${monthRows[monthRows.length - 1]?.label}.`,
  };
}

export async function getLatestImportedSummaries() {
  const db = await getDb();
  if (!db) return null;

  const batches = await db.select().from(importBatches).orderBy(desc(importBatches.importedAt)).limit(100);
  if (!batches.length) return null;

  const latestByType = new Map<string, (typeof batches)[number]>();
  for (const batch of batches) {
    if (!latestByType.has(batch.reportType)) {
      latestByType.set(batch.reportType, batch);
    }
  }

  const catalog = batches.map((batch) => ({
    importId: batch.importId,
    reportType: batch.reportType,
    fileName: batch.fileName,
    title: batch.title,
    sourceSheet: batch.sourceSheet,
    importedRows: batch.importedRows,
    dateFrom: toIsoDate(batch.dateFrom),
    dateTo: toIsoDate(batch.dateTo),
    importedAt: batch.importedAt.toISOString(),
  }));

  const lastResult = catalog[0] ?? null;
  const result: Record<string, unknown> = {
    "excel_ingest:catalog": catalog,
    "excel_ingest:last_result": lastResult,
  };

  const ordersBatch = latestByType.get("orders_report");
  if (ordersBatch) {
    const orderRows = await db
      .select()
      .from(importOrderRows)
      .where(eq(importOrderRows.importId, ordersBatch.importId));
    const productRows = await db
      .select()
      .from(importOrderProductRows)
      .where(eq(importOrderProductRows.importId, ordersBatch.importId));
    result["excel_ingest:orders_report"] = buildOrdersSummaryFromRows(ordersBatch, orderRows, productRows);
  }

  const driversBatch = latestByType.get("drivers_report");
  if (driversBatch) {
    const driverRows = await db
      .select()
      .from(importDriverRows)
      .where(eq(importDriverRows.importId, driversBatch.importId));
    result["excel_ingest:drivers_report"] = buildDriversSummaryFromRows(driversBatch, driverRows);
  }

  const restitutionBatch = latestByType.get("restitution_summary");
  if (restitutionBatch) {
    const restitutionRows = await db
      .select()
      .from(importRestitutionRows)
      .where(eq(importRestitutionRows.importId, restitutionBatch.importId));
    result["excel_ingest:restitution_summary"] = buildRestitutionSummaryFromRows(restitutionBatch, restitutionRows);
  }

  const restitutionBatches = batches.filter((batch) => batch.reportType === "restitution_summary");
  if (restitutionBatches.length > 0) {
    const allRestitutionRows = [];
    for (const batch of restitutionBatches) {
      const rows = await db
        .select()
        .from(importRestitutionRows)
        .where(eq(importRestitutionRows.importId, batch.importId));
      allRestitutionRows.push(...rows);
    }

    const monthlyIntelligence = buildMonthlyRestitutionIntelligence(restitutionBatches, allRestitutionRows);
    if (monthlyIntelligence) {
      result["excel_ingest:monthly_restitution_intelligence"] = monthlyIntelligence;
    }
  }

  return result;
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
