import { describe, expect, it } from "vitest";
import { buildOwnerStudy } from "@/lib/owner-study";

describe("buildOwnerStudy", () => {
  it("builds a product study and profit lab from workbook summaries", () => {
    const study = buildOwnerStudy({
      model: {
        totals: {
          grossRevenue: 14669.57,
          netMargin: 23292.29,
          netMarginPercent: 99.3,
          productCosts: 14870.53,
          deliveryCosts: 430.3,
          platformCommissions: 752.75,
          restitutionTotal: 752.75,
          finalOperationalCost: 15300.83,
          totalOrders: 155,
          deliveredOrders: 155,
          totalDrivers: 0,
          criticalStockCount: 0,
          totalOrdersToday: 0,
          activeOrders: 0,
          waitingOrders: 0,
          lateOrders: 0,
          capacityUsedPercent: 0,
          availableDrivers: 0,
          driversWithOne: 0,
          driversWithTwo: 0,
        },
      } as any,
      ordersSummary: {
        totals: {
          totalOrders: 155,
          grossRevenue: 14669.57,
        },
        topProducts: [
          { name: "Cerveja lata", count: 42, total: 1320 },
          { name: "Gelo", count: 26, total: 680 },
          { name: "Água", count: 18, total: 480 },
          { name: "Energético", count: 10, total: 320 },
        ],
      } as any,
      monthlyIntelligence: {
        monthCount: 3,
        fileCount: 23,
        importedRowsTotal: 20764,
        uniqueDays: 85,
        dateFrom: "2026-02-24",
        dateTo: "2026-04-14",
        totals: {
          grossRevenue: 18000,
          totalNetMargin: 3600,
          restitutionTotal: 900,
        },
        months: [
          { month: "2026-02", label: "02/2026", grossRevenue: 4000, totalNetMargin: 600, restitutionTotal: 300 },
          { month: "2026-03", label: "03/2026", grossRevenue: 9000, totalNetMargin: 2100, restitutionTotal: 450 },
          { month: "2026-04", label: "04/2026", grossRevenue: 5000, totalNetMargin: 900, restitutionTotal: 150 },
        ],
      } as any,
    });

    expect(study.productStudy.rows).toHaveLength(4);
    expect(study.productStudy.bestProduct?.name).toBe("Cerveja lata");
    expect(study.productStudy.weakestProduct?.name).toBe("Energético");
    expect(study.productStudy.coveragePercent).toBeGreaterThan(0);
    expect(study.monthlyTrend.isMonthRange).toBe(true);
    expect(study.monthlyTrend.months).toHaveLength(3);
    expect(study.monthlyTrend.bestMonth?.label).toBe("03/2026");
    expect(study.monthlyTrend.story).toContain("3 meses");
    expect(study.monthlyTrend.source).toMatchObject({
      fileCount: 23,
      importedRows: 20764,
      uniqueDays: 85,
    });
    expect(study.monthlyTrend.restitutionPer100Revenue).toBe(5);
    expect(study.monthlyTrend.averageDailyRestitution).toBe(10.59);
    expect(study.profitLab.cards).toHaveLength(3);
    expect(study.profitLab.cards[0]?.gain).toMatch(/^R\$/);
    expect(study.profitLab.playbook).toHaveLength(3);
  });

  it("falls back when the orders summary has no top products", () => {
    const study = buildOwnerStudy({
      model: {
        totals: {
          grossRevenue: 1000,
          netMargin: 200,
          netMarginPercent: 20,
          productCosts: 500,
          deliveryCosts: 100,
          platformCommissions: 50,
          restitutionTotal: 25,
          finalOperationalCost: 625,
          totalOrders: 10,
          deliveredOrders: 10,
          totalDrivers: 0,
          criticalStockCount: 0,
          totalOrdersToday: 0,
          activeOrders: 0,
          waitingOrders: 0,
          lateOrders: 0,
          capacityUsedPercent: 0,
          availableDrivers: 0,
          driversWithOne: 0,
          driversWithTwo: 0,
        },
      } as any,
      ordersSummary: {
        totals: {
          totalOrders: 10,
          grossRevenue: 1000,
        },
        topProducts: [],
      } as any,
    });

    expect(study.productStudy.rows).toHaveLength(1);
    expect(study.productStudy.bestProduct?.name).toBe("Mix principal");
    expect(study.productStudy.weakestProduct?.name).toBe("Mix principal");
    expect(study.monthlyTrend.isMonthRange).toBe(false);
  });
});
