import { describe, expect, it } from "vitest";
import { buildOwnerDashboardModel, buildOwnerRecommendations } from "@/lib/owner-dashboard";

describe("buildOwnerDashboardModel", () => {
  it("normalizes missing sources to safe zero values", () => {
    const model = buildOwnerDashboardModel();

    expect(model.importCatalog).toEqual([]);
    expect(model.ordersSummary).toBeNull();
    expect(model.driversSummary).toBeNull();
    expect(model.restitutionSummary).toBeNull();
    expect(model.latestResult).toBeNull();
    expect(model.totals).toMatchObject({
      grossRevenue: 0,
      netMargin: 0,
      netMarginPercent: 0,
      productCosts: 0,
      deliveryCosts: 0,
      platformCommissions: 0,
      restitutionTotal: 0,
      finalOperationalCost: 0,
      criticalStockCount: 0,
      totalOrders: 0,
      deliveredOrders: 0,
      totalDrivers: 0,
      activeOrders: 0,
      waitingOrders: 0,
      lateOrders: 0,
      availableDrivers: 0,
      driversWithOne: 0,
      driversWithTwo: 0,
    });
  });

  it("merges the workbook summaries into one owner snapshot", () => {
    const model = buildOwnerDashboardModel({
      criticalStockCount: 4,
      operational: {
        activeOrders: 8,
        waitingOrders: 3,
        lateOrders: 1,
        availableDrivers: 5,
        driversWithOne: 2,
        driversWithTwo: 1,
      },
      financial: {
        grossRevenue: 14669.57,
        netMargin: 23292.29,
        netMarginPercent: 99.3,
        productCosts: 14870.53,
        deliveryCosts: 430.3,
        platformCommissions: 752.75,
      },
      summaries: {
        "excel_ingest:catalog": [
          { importId: "orders-1", reportType: "orders_report", fileName: "pedidos.xlsx" },
          { importId: "drivers-1", reportType: "drivers_report", fileName: "entregadores.xlsx" },
          { importId: "rest-1", reportType: "restitution_summary", fileName: "restituicao.xlsx" },
        ],
        "excel_ingest:orders_report": {
          totals: {
            totalOrders: 155,
            deliveredOrders: 155,
            grossRevenue: 11317.79,
          },
        },
        "excel_ingest:drivers_report": {
          totals: {
            totalDrivers: 12,
            grossRevenue: 23000,
            cashTotal: 1000,
            onlineTotal: 22000,
          },
        },
        "excel_ingest:restitution_summary": {
          totals: {
            restitutionTotal: 752.75,
            storeCostTotal: 14870.53,
            driverCostTotal: 430.3,
            grossRevenue: 14669.57,
            totalNetMargin: 23292.29,
            marketplaceCommission: 752.75,
          },
        },
        "excel_ingest:last_result": {
          importedRows: 155,
          reportType: "orders_report",
        },
      },
    });

    expect(model.importCatalog).toHaveLength(3);
    expect(model.latestResult).toMatchObject({
      importedRows: 155,
      reportType: "orders_report",
    });
    expect(model.totals).toMatchObject({
      grossRevenue: 14669.57,
      netMargin: 23292.29,
      netMarginPercent: 99.3,
      productCosts: 14870.53,
      deliveryCosts: 430.3,
      platformCommissions: 752.75,
      restitutionTotal: 752.75,
      finalOperationalCost: 15300.83,
      criticalStockCount: 4,
      totalOrders: 155,
      deliveredOrders: 155,
      totalDrivers: 12,
      activeOrders: 8,
      waitingOrders: 3,
      lateOrders: 1,
      availableDrivers: 5,
      driversWithOne: 2,
      driversWithTwo: 1,
    });
  });

  it("generates practical owner recommendations from the snapshot", () => {
    const model = buildOwnerDashboardModel({
      criticalStockCount: 3,
      operational: {
        totalOrdersToday: 12,
        activeOrders: 2,
        waitingOrders: 4,
        lateOrders: 2,
        availableDrivers: 1,
        driversWithOne: 1,
        driversWithTwo: 0,
        capacityUsedPercent: 78,
      },
      financial: {
        grossRevenue: 1000,
        netMargin: 120,
        netMarginPercent: 12,
        productCosts: 420,
        deliveryCosts: 260,
        platformCommissions: 100,
      },
      summaries: {
        "excel_ingest:restitution_summary": {
          totals: {
            restitutionTotal: 120,
            storeCostTotal: 420,
            driverCostTotal: 260,
          },
        },
      },
    });

    const recommendations = buildOwnerRecommendations(model);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.map((item) => item.tag)).toEqual(
      expect.arrayContaining(["margem", "estoque", "operação", "sla"])
    );
  });
});
