import { describe, expect, it } from "vitest";
import { buildApiMasterclass } from "@/lib/api-masterclass";

describe("buildApiMasterclass", () => {
  it("builds a mock-first lesson that teaches the owner how to profit", () => {
    const masterclass = buildApiMasterclass({
      ownerModel: {
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
          totalDrivers: 12,
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
      apiKpi: {
        kpis: {
          general: {
            validOrders: { value: "128" },
            fillRate: { value: "94.5" },
            merchantAvailabilityRate: { value: "98.2" },
            orderRating: { value: "4.9" },
          },
          turbo: {
            validTurboOrders: { value: "33" },
          },
          updatedDate: "2026-07-05T12:00:00.000Z",
        },
      } as any,
      apiSummary: {
        modeLabel: "Modo mock",
        cards: [],
      } as any,
    });

    expect(masterclass.title).toContain("API");
    expect(masterclass.modeLabel).toBe("Modo mock");
    expect(masterclass.cards).toHaveLength(4);
    expect(masterclass.cards.map((card) => card.title)).toEqual(
      expect.arrayContaining(["Pedidos válidos", "Fill rate", "Disponibilidade", "Lucro por pedido"])
    );
    expect(masterclass.scenarios).toHaveLength(3);
    expect(masterclass.scenarios.map((scenario) => scenario.title)).toEqual(
      expect.arrayContaining([
        "1 ponto de fill rate vale quanto?",
        "Reduzir 10% das perdas recupera caixa",
        "Economizar R$1 por pedido na entrega",
      ])
    );
    expect(masterclass.playbook[0]?.description).toContain("pedido");
    expect(masterclass.formula).toContain("Lucro =");
  });

  it("falls back to sensible mock numbers when the API is not available", () => {
    const masterclass = buildApiMasterclass({
      ownerModel: {
        totals: {
          grossRevenue: 1000,
          netMargin: 200,
          netMarginPercent: 20,
          productCosts: 520,
          deliveryCosts: 120,
          platformCommissions: 60,
          restitutionTotal: 40,
          finalOperationalCost: 640,
          totalOrders: 20,
          deliveredOrders: 18,
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

    expect(masterclass.cards[0]?.value).toContain("pedido");
    expect(masterclass.scenarios[0]?.gain).toMatch(/^R\$/);
  });
});
