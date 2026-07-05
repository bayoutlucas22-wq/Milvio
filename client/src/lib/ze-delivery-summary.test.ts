import { describe, expect, it } from "vitest";
import { buildZeOwnerSummary } from "@/lib/ze-delivery-summary";

describe("buildZeOwnerSummary", () => {
  it("builds the four owner-facing summary cards from Zé API payloads", () => {
    const summary = buildZeOwnerSummary({
      mode: "mock",
      merchantId: "merchant-1",
      kpis: {
        kpis: {
          general: {
            validOrders: { type: "INTEGER", value: "128" },
            fillRate: { type: "PERCENTAGE", value: "96.4" },
            merchantAvailabilityRate: { type: "PERCENTAGE", value: "99.1" },
          },
          turbo: {
            validTurboOrders: { type: "INTEGER", value: "18" },
          },
          updatedDate: "2026-03-06T18:54:53.887Z",
        },
      },
      reimbursements: {
        merchantId: "merchant-1",
        startDate: "2026-03-01",
        endDate: "2026-03-07",
        orders: [
          {
            displayId: "877379758",
            createdAt: "2026-03-06T12:00:00",
            total: {
              otherFees: { value: 12.5, currency: "BRL" },
              discount: { value: 3.2, currency: "BRL" },
              orderReimbursement: { value: 9.3, currency: "BRL" },
            },
            otherFees: [],
            discounts: [],
            extensions: { financialDetails: { isoWeek: 10, isoYear: 2026 } },
          },
        ],
        pageInfo: {
          currentPage: 1,
          pageSize: 100,
          totalItems: 1,
          hasNextPage: false,
        },
      },
      history: {
        page: 1,
        pageSize: 20,
        hasNext: false,
        items: [
          {
            number: "123457890",
            date: "2026-03-06T12:30:00Z",
            customerName: "Cliente da Loja",
            status: "CONCLUDED",
            deliveryType: "DELIVERY",
            total: 89.9,
          },
        ],
      },
      webhooks: [
        {
          clientId: "a1b2c3",
          hash: "hash",
          endpoint: "https://partner.com/webhook",
          active: true,
          subscriptions: ["ORDER_EVENTS"],
        },
      ],
    });

    expect(summary.cards).toHaveLength(4);
    expect(summary.cards[0]).toMatchObject({
      title: "KPIs",
      value: "128 pedidos válidos",
    });
    expect(summary.cards[1]).toMatchObject({
      title: "Repasses",
      value: "R$ 9,30",
    });
    expect(summary.cards[2]).toMatchObject({
      title: "Histórico",
      value: "1 pedido finalizado",
    });
    expect(summary.cards[3]).toMatchObject({
      title: "Webhooks",
      value: "Webhook ativo",
    });
    expect(summary.modeLabel).toBe("Modo mock");
  });
});
