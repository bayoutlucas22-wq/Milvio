import { describe, expect, it, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const fromMock = vi.fn();
const whereMock = vi.fn();

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: selectMock,
  })),
}));

import { buildExecutiveSummary, getCriticalStockProducts } from "./queries";

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
