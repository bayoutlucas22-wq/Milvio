import {
  importBatches,
  importDriverRows,
  importOrderProductRows,
  importOrderRows,
  importRestitutionRows,
} from "../drizzle/schema";
import type { WorkbookImportSummary, NormalizedImportRows } from "./excelIngest";
type Db = any;

function decimalString(value: number) {
  return value.toString();
}

export async function persistImportedWorkbook(
  db: Db,
  imported: WorkbookImportSummary,
  normalized: NormalizedImportRows,
  fileName: string,
  importId: string,
  importedAt: string
) {
  await db.insert(importBatches).values({
    importId,
    reportType: imported.reportType,
    fileName,
    title: imported.title,
    sourceSheet: imported.sourceSheet,
    importedRows: imported.importedRows,
    dateFrom: imported.dateFrom ? new Date(`${imported.dateFrom}T00:00:00`) : null,
    dateTo: imported.dateTo ? new Date(`${imported.dateTo}T00:00:00`) : null,
    importedAt: new Date(importedAt),
  });

  if (normalized.reportType === "orders_report") {
    if (normalized.orders.length > 0) {
      await db.insert(importOrderRows).values(
        normalized.orders.map((row) => ({
          importId,
          rowIndex: row.rowIndex,
          orderDateLabel: row.orderDateLabel || null,
          status: row.status || null,
          courierName: row.courierName || null,
          paymentMethod: row.paymentMethod || null,
          subtotal: decimalString(row.subtotal),
          discount: decimalString(row.discount),
          freight: decimalString(row.freight),
          total: decimalString(row.total),
          rawJson: row.rawJson,
        }))
      );
    }

    if (normalized.products.length > 0) {
      await db.insert(importOrderProductRows).values(
        normalized.products.map((row) => ({
          importId,
          rowIndex: row.rowIndex,
          name: row.name,
          quantity: row.quantity,
          total: decimalString(row.total),
          rawJson: row.rawJson,
        }))
      );
    }
  }

  if (normalized.reportType === "drivers_report") {
    if (normalized.drivers.length > 0) {
      await db.insert(importDriverRows).values(
        normalized.drivers.map((row) => ({
          importId,
          rowIndex: row.rowIndex,
          name: row.name,
          deliveredOrders: row.deliveredOrders,
          cashTotal: decimalString(row.cashTotal),
          cardTotal: decimalString(row.cardTotal),
          onlineTotal: decimalString(row.onlineTotal),
          total: decimalString(row.total),
          rawJson: row.rawJson,
        }))
      );
    }
  }

  if (normalized.reportType === "restitution_summary") {
    if (normalized.rows.length > 0) {
      await db.insert(importRestitutionRows).values(
        normalized.rows.map((row) => ({
          importId,
          rowIndex: row.rowIndex,
          dateLabel: row.dateLabel,
          grossRevenue: decimalString(row.grossRevenue),
          storeCostTotal: decimalString(row.storeCostTotal),
          driverCostTotal: decimalString(row.driverCostTotal),
          finalCostAmount: decimalString(row.finalCostAmount),
          totalNetMargin: decimalString(row.totalNetMargin),
          netMarginPercent: decimalString(row.netMarginPercent),
          restitutionFreight: decimalString(row.restitutionFreight),
          restitutionMarkup: decimalString(row.restitutionMarkup),
          marketplaceCommission: decimalString(row.marketplaceCommission),
          restitutionPromotions: decimalString(row.restitutionPromotions),
          restitutionTotal: decimalString(row.restitutionTotal),
          manualAdjustments: decimalString(row.manualAdjustments),
          rawJson: row.rawJson,
        }))
      );
    }
  }

  return {
    importId,
    importedAt,
  };
}
