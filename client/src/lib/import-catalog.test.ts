import { describe, expect, it } from "vitest";
import { mergeImportCatalog } from "@/lib/import-catalog";

describe("mergeImportCatalog", () => {
  it("merges imports by report type and keeps the latest file", () => {
    const merged = mergeImportCatalog([
      {
        importId: "a",
        reportType: "orders_report",
        fileName: "orders-1.xlsx",
        importedRows: 12,
        dateFrom: "2026-06-01",
        dateTo: "2026-06-07",
        importedAt: "2026-06-07T10:00:00.000Z",
      },
      {
        importId: "b",
        reportType: "orders_report",
        fileName: "orders-2.xlsx",
        importedRows: 15,
        dateFrom: "2026-06-08",
        dateTo: "2026-06-14",
        importedAt: "2026-06-14T10:00:00.000Z",
      },
      {
        importId: "c",
        reportType: "drivers_report",
        fileName: "drivers.xlsx",
        importedRows: 3,
        dateFrom: "2026-06-08",
        dateTo: "2026-06-14",
        importedAt: "2026-06-14T11:00:00.000Z",
      },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      reportType: "drivers_report",
      label: "Entregadores",
      fileCount: 1,
      totalRows: 3,
      latestFileName: "drivers.xlsx",
    });
    expect(merged[1]).toMatchObject({
      reportType: "orders_report",
      label: "Pedidos entregues",
      fileCount: 2,
      totalRows: 27,
      dateFrom: "2026-06-01",
      dateTo: "2026-06-14",
      latestFileName: "orders-2.xlsx",
    });
  });
});
