import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  dailyClosings,
  systemSettings,
} from "../drizzle/schema";
import {
  extractNormalizedImportRows,
  parseDailyMetricsExcel,
  parseWorkbookImport,
} from "./excelIngest";
import { persistImportedWorkbook } from "./importPersistence";

type Db = any;

function buildDailyClosingValuesFromRestitutionRow(row: any) {
  return {
    closingDate: new Date(`${row.date}T00:00:00`),
    totalOrders: 0,
    totalDeliveredOrders: 0,
    totalCancelledOrders: 0,
    grossRevenue: (row.restitutionTotal ?? row.grossRevenue ?? 0).toString(),
    platformCommissions: (row.marketplaceCommission ?? 0).toString(),
    extraFees: "0",
    productCosts: (row.storeCostTotal ?? 0).toString(),
    deliveryCosts: (row.driverCostTotal ?? 0).toString(),
    packagingCosts: "0",
    discounts: (row.restitutionPromotions ?? 0).toString(),
    refunds: "0",
    totalNetMargin: (row.totalNetMargin ?? row.restitutionTotal ?? 0).toString(),
    netMarginPercent: (row.netMarginPercent ?? 0).toString(),
    ordersWithLoss: 0,
    averageDelayMinutes: 0,
    onTimeDeliveryPercent: "0",
  };
}

function buildDailyClosingValuesFromMetric(metric: ReturnType<typeof parseDailyMetricsExcel>[number]) {
  return {
    closingDate: metric.closingDate,
    totalOrders: metric.totalOrders,
    totalDeliveredOrders: metric.totalDeliveredOrders,
    totalCancelledOrders: metric.totalCancelledOrders,
    grossRevenue: metric.grossRevenue.toString(),
    platformCommissions: metric.platformCommissions.toString(),
    extraFees: metric.extraFees.toString(),
    productCosts: metric.storeCostTotal.toString(),
    deliveryCosts: metric.driverCostTotal.toString(),
    packagingCosts: metric.packagingCosts.toString(),
    discounts: metric.discounts.toString(),
    refunds: metric.refunds.toString(),
    totalNetMargin: metric.totalNetMargin.toString(),
    netMarginPercent: metric.netMarginPercent.toString(),
    ordersWithLoss: metric.ordersWithLoss,
    averageDelayMinutes: metric.averageDelayMinutes,
    onTimeDeliveryPercent: metric.onTimeDeliveryPercent.toString(),
  };
}

async function upsertDailyClosing(db: Db, values: Record<string, unknown>) {
  await db.insert(dailyClosings).values(values).onDuplicateKeyUpdate({
    set: values,
  });
}

async function updateImportSettings(db: Db, summary: Record<string, unknown>, importedReportType: string) {
  const storageKey =
    importedReportType === "orders_report"
      ? "excel_ingest:orders_report"
      : importedReportType === "drivers_report"
        ? "excel_ingest:drivers_report"
        : "excel_ingest:restitution_summary";

  await db
    .insert(systemSettings)
    .values({
      key: "excel_ingest:last_result",
      value: JSON.stringify(summary),
      description: "Ultimo resumo de importacao via Excel",
    })
    .onDuplicateKeyUpdate({
      set: {
        value: JSON.stringify(summary),
        description: "Ultimo resumo de importacao via Excel",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(systemSettings)
    .values({
      key: storageKey,
      value: JSON.stringify(summary),
      description: `Resumo de importacao ${importedReportType}`,
    })
    .onDuplicateKeyUpdate({
      set: {
        value: JSON.stringify(summary),
        description: `Resumo de importacao ${importedReportType}`,
        updatedAt: new Date(),
      },
    });

  const catalogSetting = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "excel_ingest:catalog"))
    .limit(1);
  const catalog = catalogSetting.length > 0 && catalogSetting[0]?.value ? JSON.parse(catalogSetting[0].value) : [];
  const nextCatalog = [
    summary,
    ...((Array.isArray(catalog) ? catalog : []).filter((item: any) => item?.importId !== summary.importId)),
  ].slice(0, 50);

  await db
    .insert(systemSettings)
    .values({
      key: "excel_ingest:catalog",
      value: JSON.stringify(nextCatalog),
      description: "Historico de importacoes via Excel",
    })
    .onDuplicateKeyUpdate({
      set: {
        value: JSON.stringify(nextCatalog),
        description: "Historico de importacoes via Excel",
        updatedAt: new Date(),
      },
    });
}

export async function importWorkbookIntoDatabase(db: Db, fileName: string, base64: string, importedAt = new Date()) {
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const imported = parseWorkbookImport(base64, fileName);
  const normalized = extractNormalizedImportRows(base64, fileName);
  const importedAtIso = importedAt.toISOString();
  const importId = `${imported.reportType}:${importedAtIso}:${fileName}`;

  await persistImportedWorkbook(db, imported, normalized, fileName, importId, importedAtIso);

  if (imported.reportType === "restitution_summary") {
    const rows = imported.rows ?? [];
    if (rows.length > 0) {
      for (const row of rows) {
        await upsertDailyClosing(db, buildDailyClosingValuesFromRestitutionRow(row));
      }
    } else {
      const metrics = parseDailyMetricsExcel(base64);
      if (metrics.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Excel sem linhas validas para importar",
        });
      }

      for (const metric of metrics) {
        await upsertDailyClosing(db, buildDailyClosingValuesFromMetric(metric));
      }
    }
  }

  const summary = {
    ...imported,
    importId,
    fileName,
    importedAt: importedAtIso,
  };

  await updateImportSettings(db, summary, imported.reportType);

  return summary;
}

export async function updateImportCatalogFromSummary(db: Db, summary: Record<string, unknown>, reportType: string) {
  await updateImportSettings(db, summary, reportType);
}

export async function syncImportedWorkbookRow(db: Db, fileName: string, base64: string, importedAt = new Date()) {
  return await importWorkbookIntoDatabase(db, fileName, base64, importedAt);
}
