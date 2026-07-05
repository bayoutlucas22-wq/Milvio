import { describe, expect, it, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const fromMock = vi.fn();
const whereMock = vi.fn();

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: selectMock,
  })),
}));

import { buildExecutiveSummary, buildMonthlyRestitutionIntelligence, getCriticalStockProducts } from "./queries";

describe("getCriticalStockProducts", () => {
  beforeEach(() => {
    selectMock.mockReset();
    fromMock.mockReset();
    whereMock.mockReset();

    const query = {
      from: fromMock.mockReturnValue({
        where: whereMock.mockResolvedValue([{ id: 1 }]),
      }),
    };

    selectMock.mockReturnValue(query);
  });

  it("returns active products at or below minimum stock", async () => {
    const result = await getCriticalStockProducts();

    expect(result).toEqual([{ id: 1 }]);
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(whereMock).toHaveBeenCalledTimes(1);
  });
});

describe("buildExecutiveSummary", () => {
  it("derives the main trend and averages from persisted closings", () => {
    const summary = buildExecutiveSummary([
      {
        closingDate: new Date("2026-07-03T00:00:00Z"),
        totalOrders: 10,
        totalDeliveredOrders: 9,
        totalCancelledOrders: 1,
        grossRevenue: "1000.00",
        platformCommissions: "100.00",
        extraFees: "0.00",
        productCosts: "500.00",
        deliveryCosts: "50.00",
        packagingCosts: "0.00",
        discounts: "0.00",
        refunds: "0.00",
        totalNetMargin: "350.00",
        netMarginPercent: "35.00",
        ordersWithLoss: 1,
        averageDelayMinutes: 4,
        onTimeDeliveryPercent: "80.00",
      },
      {
        closingDate: new Date("2026-07-02T00:00:00Z"),
        totalOrders: 8,
        totalDeliveredOrders: 8,
        totalCancelledOrders: 0,
        grossRevenue: "900.00",
        platformCommissions: "90.00",
        extraFees: "0.00",
        productCosts: "430.00",
        deliveryCosts: "45.00",
        packagingCosts: "0.00",
        discounts: "0.00",
        refunds: "0.00",
        totalNetMargin: "335.00",
        netMarginPercent: "37.22",
        ordersWithLoss: 0,
        averageDelayMinutes: 2,
        onTimeDeliveryPercent: "90.00",
      },
    ] as any);

    expect(summary.latestClosing?.grossRevenue).toBe(1000);
    expect(summary.averageGrossRevenue).toBe(950);
    expect(summary.averageNetMarginPercent).toBeCloseTo(36.11, 2);
    expect(summary.trend).toBe("up");
    expect(summary.bestDay?.totalNetMargin).toBe(350);
    expect(summary.worstDay?.totalNetMargin).toBe(335);
  });
});

describe("buildMonthlyRestitutionIntelligence", () => {
  it("keeps only month-range restitution data and deduplicates repeated days", () => {
    const intelligence = buildMonthlyRestitutionIntelligence(
      [
        {
          importId: "feb-week",
          reportType: "restitution_summary",
          fileName: "feb.xlsx",
          importedRows: 2000,
          dateFrom: new Date("2026-02-24T00:00:00Z"),
          dateTo: new Date("2026-03-03T00:00:00Z"),
        },
        {
          importId: "mar-week",
          reportType: "restitution_summary",
          fileName: "mar.xlsx",
          importedRows: 3000,
          dateFrom: new Date("2026-03-03T00:00:00Z"),
          dateTo: new Date("2026-03-10T00:00:00Z"),
        },
      ] as any,
      [
        {
          importId: "feb-week",
          dateLabel: "2026-02-24",
          grossRevenue: "100.00",
          storeCostTotal: "40.00",
          driverCostTotal: "10.00",
          totalNetMargin: "50.00",
          restitutionTotal: "12.00",
          marketplaceCommission: "8.00",
        },
        {
          importId: "feb-week",
          dateLabel: "2026-02-24",
          grossRevenue: "999.00",
          storeCostTotal: "999.00",
          driverCostTotal: "999.00",
          totalNetMargin: "999.00",
          restitutionTotal: "999.00",
          marketplaceCommission: "999.00",
        },
        {
          importId: "mar-week",
          dateLabel: "2026-03-03",
          grossRevenue: "200.00",
          storeCostTotal: "80.00",
          driverCostTotal: "20.00",
          totalNetMargin: "100.00",
          restitutionTotal: "18.00",
          marketplaceCommission: "16.00",
        },
      ] as any
    );

    expect(intelligence).toMatchObject({
      reportType: "monthly_restitution_intelligence",
      dateFrom: "2026-02-24",
      dateTo: "2026-03-03",
      monthCount: 2,
      fileCount: 2,
      totalRows: 2,
      uniqueDays: 2,
      importedRowsTotal: 5000,
      totals: {
        grossRevenue: 300,
        storeCostTotal: 120,
        driverCostTotal: 30,
        totalNetMargin: 150,
        restitutionTotal: 30,
        marketplaceCommission: 24,
      },
    });
    expect(intelligence?.months.map((month) => month.month)).toEqual(["2026-02", "2026-03"]);
  });

  it("does not create monthly intelligence from a single-month range", () => {
    const intelligence = buildMonthlyRestitutionIntelligence(
      [
        {
          importId: "only-week",
          reportType: "restitution_summary",
          fileName: "week.xlsx",
          importedRows: 1,
          dateFrom: new Date("2026-07-01T00:00:00Z"),
          dateTo: new Date("2026-07-07T00:00:00Z"),
        },
      ] as any,
      [
        {
          importId: "only-week",
          dateLabel: "2026-07-01",
          grossRevenue: "100.00",
          totalNetMargin: "20.00",
        },
      ] as any
    );

    expect(intelligence).toBeNull();
  });
});
