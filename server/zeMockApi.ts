import { getISOWeek, getISOWeekYear } from "date-fns";
import type { Express, Request, Response } from "express";
import { Router } from "express";

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(days = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - Math.max(days - 1, 0));
  return {
    startDate: formatDateOnly(startDate),
    endDate: formatDateOnly(endDate),
  };
}

function currentIsoWeek() {
  const date = new Date();
  return {
    isoYear: getISOWeekYear(date),
    isoWeek: getISOWeek(date),
  };
}

function buildMerchantKpis() {
  return {
    kpis: {
      general: {
        validOrders: { type: "INTEGER", value: "128" },
        fillRate: { type: "PERCENTAGE", value: "96.4" },
        promoSellerActivationRate: { type: "PERCENTAGE", value: "12.5" },
        merchantAvailabilityRate: { type: "PERCENTAGE", value: "99.1" },
        tenMinutesDeliveryReleaseRate: { type: "PERCENTAGE", value: "84.2" },
        deliveryTrackingAccuracyRate: { type: "PERCENTAGE", value: "91.7" },
        thirtyFiveMinutesDeliveryAccurateRate: { type: "PERCENTAGE", value: "88.3" },
        deliveryOrderAggroupmentRate3More: { type: "PERCENTAGE", value: "7.4" },
        orderRating: { type: "FLOAT", value: "4.8" },
        idealPortfolioRate: { type: "PERCENTAGE", value: "36.8" },
      },
      turbo: {
        validTurboOrders: { type: "INTEGER", value: "18" },
        turboOrderRating: { type: "FLOAT", value: "4.9" },
        turboFillRate: { type: "PERCENTAGE", value: "100" },
        turboTrackingAccuracyRate: { type: "PERCENTAGE", value: "98.6" },
        fiveMinutesTurboDeliveryReleaseRate: { type: "PERCENTAGE", value: "52.1" },
        fifteenMinutesTurboAccurateRate: { type: "PERCENTAGE", value: "93.4" },
      },
      updatedDate: new Date().toISOString(),
    },
  };
}

function buildReimbursementSummaries(merchantId: string) {
  const { startDate, endDate } = getDateRange(7);
  return {
    merchantId,
    startDate,
    endDate,
    orders: [
      {
        displayId: "877379758",
        createdAt: new Date().toISOString().slice(0, 19),
        total: {
          otherFees: { value: 12.5, currency: "BRL" },
          discount: { value: 3.2, currency: "BRL" },
          orderReimbursement: { value: 9.3, currency: "BRL" },
        },
        otherFees: [
          { type: "DELIVERY_FEE", price: { value: 8.5, currency: "BRL" } },
          { type: "SERVICE_FEE", price: { value: 4, currency: "BRL" } },
        ],
        discounts: [{ description: "COUPON", amount: { value: 3.2, currency: "BRL" } }],
        extensions: { financialDetails: { isoWeek: currentIsoWeek().isoWeek, isoYear: currentIsoWeek().isoYear } },
      },
    ],
    pageInfo: {
      currentPage: 1,
      pageSize: 100,
      totalItems: 1,
      hasNextPage: false,
    },
  };
}

function buildOperationalIncentives() {
  return {
    operationalIncentives: [
      {
        amountPerOrder: { value: 2.5, currency: "BRL" },
        totalAmount: { value: 250, currency: "BRL" },
        validOrders: 100,
      },
    ],
  };
}

function buildOrderHistory(merchantId: string) {
  return {
    page: 1,
    pageSize: 20,
    hasNext: false,
    items: [
      {
        number: "123457890",
        date: new Date().toISOString(),
        customerName: "Cliente da Loja",
        status: "CONCLUDED",
        deliveryType: "DELIVERY",
        payment: { method: "PIX", type: "PREPAID" },
        total: 89.9,
      },
    ],
  };
}

function buildEventPolling() {
  return [
    {
      eventId: "3e7224ac-bec0-4fe1-88d1-6348c8149c44",
      orderId: 123456789,
      orderURL: "https://seller-public-api.ze.delivery/orders/123456789",
      eventType: "CONFIRMED",
      sourceAppId: "demo-owner-app",
      createdAt: new Date().toISOString(),
    },
  ];
}

function buildWebhookConfig() {
  return [
    {
      clientId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6ab",
      endpoint: "https://partner.com/webhook",
      active: true,
      subscriptions: ["ORDER_EVENTS"],
    },
  ];
}

function buildOrderDetail(orderNumber: string) {
  return {
    displayId: orderNumber,
    status: "CONFIRMED",
    createdAt: new Date().toISOString(),
    merchant: { id: 12345 },
  };
}

export function registerZeMockApi(app: Express) {
  const router = Router();

  router.post("/auth", (_req: Request, res: Response) => {
    res.json({
      access_token: "mock-access-token",
      expire_in: 86400,
      token_type: "bearer",
    });
  });

  router.get("/merchants/:merchantId/kpis", (_req: Request, res: Response) => {
    res.json(buildMerchantKpis());
  });

  router.get("/merchants/:merchantId/reimbursements/orders/summaries", (req: Request, res: Response) => {
    res.json(buildReimbursementSummaries(String(req.params.merchantId)));
  });

  router.get("/merchants/:merchantId/reports/operational-incentives", (_req: Request, res: Response) => {
    res.json(buildOperationalIncentives());
  });

  router.get("/merchants/:merchantId/orders/history", (req: Request, res: Response) => {
    res.json(buildOrderHistory(String(req.params.merchantId)));
  });

  router.get("/orders/:orderNumber", (req: Request, res: Response) => {
    res.json(buildOrderDetail(String(req.params.orderNumber)));
  });

  router.post("/orders/:orderNumber/confirm", (req: Request, res: Response) => {
    res.status(202).json({ accepted: true, orderNumber: String(req.params.orderNumber), body: req.body ?? {} });
  });

  router.post("/orders/:orderNumber/requestCancellation", (req: Request, res: Response) => {
    res.status(202).json({ accepted: true, orderNumber: String(req.params.orderNumber), body: req.body ?? {} });
  });

  router.post("/orders/:orderNumber/cancel", (req: Request, res: Response) => {
    res.status(202).json({ accepted: true, orderNumber: String(req.params.orderNumber), body: req.body ?? {} });
  });

  router.post("/orders/:orderNumber/restore", (_req: Request, res: Response) => {
    res.status(202).json({ accepted: true });
  });

  router.get(/^\/events:polling$/, (_req: Request, res: Response) => {
    res.json(buildEventPolling());
  });

  router.post("/events/acknowledgment", (req: Request, res: Response) => {
    res.json({ accepted: true, events: req.body ?? [] });
  });

  router.get("/webhooks", (_req: Request, res: Response) => {
    res.json(buildWebhookConfig());
  });

  router.patch("/webhooks", (req: Request, res: Response) => {
    res.json({
      ...buildWebhookConfig()[0],
      ...(req.body ?? {}),
    });
  });

  app.use("/api/ze-mock", router);
}
