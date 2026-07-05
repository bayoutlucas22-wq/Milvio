import { describe, expect, it } from "vitest";
import { buildOwnerProfitGuide } from "@/lib/owner-profit-guide";

describe("buildOwnerProfitGuide", () => {
  it("explains what the platform does and how to use the app", () => {
    const guide = buildOwnerProfitGuide({
      ownerModel: {
        readingMode: "lucro_real",
        totals: {
          grossRevenue: 11317.79,
          netMargin: 200,
          netMarginPercent: 20,
          restitutionTotal: 600,
          finalOperationalCost: 11163.57,
          totalOrders: 48,
          deliveredOrders: 48,
          productCosts: 420,
          deliveryCosts: 180,
          platformCommissions: 900,
          criticalStockCount: 0,
          totalOrdersToday: 0,
          totalDrivers: 0,
          activeOrders: 0,
          waitingOrders: 0,
          lateOrders: 0,
          capacityUsedPercent: 0,
          availableDrivers: 0,
          driversWithOne: 0,
          driversWithTwo: 0,
        },
        importCatalog: [],
        ordersSummary: null,
        driversSummary: null,
        restitutionSummary: null,
        latestResult: null,
        sources: {
          hasOrdersReport: true,
          hasDriversReport: true,
          hasRestitutionReport: true,
          hasOperationalData: true,
          hasFinancialData: true,
          hasValidatedCore: true,
        },
      },
      apiSummary: {
        modeLabel: "Modo mock",
        cards: [],
      },
      apiKpi: {
        kpis: {
          general: {
            validOrders: { value: "128" },
            fillRate: { value: "96.4" },
            merchantAvailabilityRate: { value: "99.1" },
            orderRating: { value: "4.8" },
          },
          turbo: { validTurboOrders: { value: "18" } },
          updatedDate: "2026-07-05T00:00:00.000Z",
        },
      },
      reimbursements: {
        merchantId: "demo-merchant",
        startDate: "2026-06-29",
        endDate: "2026-07-05",
        orders: [
          {
            total: {
              orderReimbursement: { value: 9.3, currency: "BRL" },
            },
          },
        ],
        pageInfo: {
          currentPage: 1,
          pageSize: 5,
          totalItems: 1,
          hasNextPage: false,
        },
      },
      history: {
        page: 1,
        pageSize: 5,
        hasNext: false,
        items: [
          {
            number: "123456",
            date: "2026-07-05T00:00:00.000Z",
            status: "CONCLUDED",
            total: 89.9,
          },
        ],
      },
      webhooks: [
        {
          clientId: "client-1",
          endpoint: "https://example.com/webhook",
          active: false,
          subscriptions: [],
        },
      ],
      ownerStudy: {
        productStudy: {
          rows: [],
          bestProduct: null,
          weakestProduct: null,
          coveragePercent: 0,
          story: "Sem ranking de produtos no XLS, o estudo usa o mix principal como referência.",
        },
        profitLab: {
          cards: [],
          playbook: [],
          weeklyPotential: "R$ 0,00",
        },
      },
    });

    expect(guide.title).toBe("O que a Zé API faz");
    expect(guide.subtitle).toBe("Como a plataforma funciona");
    expect(guide.ingestionFlow.map((step) => step.endpoint)).toEqual([
      "POST /auth",
      "GET /orders/{orderNumber}",
      "PATCH /webhooks",
      "App + MySQL",
    ]);
    expect(guide.productLens.items[0]?.name).toBe("Doritos");
    expect(guide.productLens.endpoints).toEqual(
      expect.arrayContaining([
        "GET /merchants/{merchantId}/menu/items",
        "POST /merchants/{merchantId}/products/availability",
        "POST /merchants/{merchantId}/products/itemOffer",
      ])
    );
    expect(guide.keyLevers[0].title.toLowerCase()).toContain("entrar");
    expect(guide.keyLevers.map((item) => item.endpoint)).toEqual(
      expect.arrayContaining([
        "POST /auth",
        "GET /orders/{orderNumber}",
        "GET /merchants/{merchantId}/kpis",
        "GET /merchants/{merchantId}/reimbursements/orders/summaries",
        "GET /events:polling",
        "PATCH /webhooks",
        "POST /merchants/{merchantId}/availability",
      ])
    );
    expect(guide.weeklyPlan[0].title.toLowerCase()).toContain("entender");
    expect(guide.closing).toContain("lucro");
  });
});
