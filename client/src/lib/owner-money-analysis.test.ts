import { describe, expect, it } from "vitest";
import { buildOwnerMoneyAnalysis } from "@/lib/owner-money-analysis";

describe("buildOwnerMoneyAnalysis", () => {
  it("turns executive history into a readable money story", () => {
    const analysis = buildOwnerMoneyAnalysis({
      model: {
        totals: {
          grossRevenue: 3300,
          netMargin: 442,
          netMarginPercent: 13.39,
          productCosts: 2000,
          deliveryCosts: 450,
          platformCommissions: 198,
          restitutionTotal: 210,
          finalOperationalCost: 2448,
          totalOrders: 33,
          deliveredOrders: 31,
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
      history: [
        {
          closingDate: "2026-07-01T00:00:00.000Z",
          totalOrders: 10,
          grossRevenue: 1000,
          productCosts: 620,
          deliveryCosts: 140,
          platformCommissions: 60,
          refunds: 70,
          totalNetMargin: 110,
          netMarginPercent: 11,
        },
        {
          closingDate: "2026-07-02T00:00:00.000Z",
          totalOrders: 11,
          grossRevenue: 1200,
          productCosts: 700,
          deliveryCosts: 160,
          platformCommissions: 72,
          refunds: 70,
          totalNetMargin: 198,
          netMarginPercent: 16.5,
        },
        {
          closingDate: "2026-07-03T00:00:00.000Z",
          totalOrders: 12,
          grossRevenue: 1100,
          productCosts: 680,
          deliveryCosts: 150,
          platformCommissions: 66,
          refunds: 70,
          totalNetMargin: 134,
          netMarginPercent: 12.18,
        },
      ],
    });

    expect(analysis.chartRows).toHaveLength(3);
    expect(analysis.chartRows[0]).toMatchObject({
      label: "01/07",
      revenue: 1000,
      profit: 110,
    });
    expect(analysis.chartRows[2]).toMatchObject({
      label: "03/07",
      revenue: 1100,
      profit: 134,
    });

    expect(analysis.buckets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "productCosts",
          label: "Custo da loja",
          amount: 2000,
          share: 60.61,
          per100: 60.61,
        }),
        expect.objectContaining({
          key: "deliveryCosts",
          label: "Entrega",
          amount: 450,
          share: 13.64,
          per100: 13.64,
        }),
        expect.objectContaining({
          key: "refunds",
          label: "Perdas / restituição",
          amount: 210,
          share: 6.36,
          per100: 6.36,
        }),
        expect.objectContaining({
          key: "netMargin",
          label: "Lucro líquido",
          amount: 442,
          share: 13.39,
          per100: 13.39,
        }),
      ])
    );

    expect(analysis.kpis).toMatchObject({
      averageOrders: 11,
      revenueTotal: 3300,
      profitTotal: 442,
      profitMarginPercent: 13.39,
      revenueTrendPercent: 10,
      profitTrendPercent: 21.82,
    });

    expect(analysis.recommendations.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Rever custo da loja",
        "Encurtar custo da entrega",
        "Cortar perdas",
        "Proteger a margem",
      ])
    );
  });

  it("falls back to the current owner snapshot when history is missing", () => {
    const analysis = buildOwnerMoneyAnalysis({
      model: {
        totals: {
          grossRevenue: 1250,
          netMargin: 250,
          netMarginPercent: 20,
          productCosts: 700,
          deliveryCosts: 160,
          platformCommissions: 80,
          restitutionTotal: 40,
          finalOperationalCost: 900,
          totalOrders: 21,
          deliveredOrders: 20,
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
    });

    expect(analysis.chartRows).toHaveLength(1);
    expect(analysis.chartRows[0]).toMatchObject({
      label: "Hoje",
      revenue: 1250,
      profit: 250,
    });
    expect(analysis.buckets[0].amount).toBeGreaterThan(0);
  });
});
