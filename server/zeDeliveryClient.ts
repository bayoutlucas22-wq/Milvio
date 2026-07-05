import axios, { type AxiosInstance } from "axios";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { ENV } from "./_core/env";

type HttpMethod = "get" | "post" | "patch";

export type ZeMetricType = "INTEGER" | "PERCENTAGE" | "FLOAT";
export type ZeOrderStatus = "CREATED" | "CONFIRMED" | "DISPATCHED" | "CANCELLED" | "CONCLUDED" | "EDITED";
export type ZeWebhookSubscriptionType = "ORDER_EVENTS";
export type ZeWebhookEventType = ZeOrderStatus | "READY_FOR_PICKUP";

export type ZeMetric = {
  type: ZeMetricType;
  value: string;
};

export type ZeMerchantKPIsResponse = {
  kpis: {
    general: {
      validOrders?: ZeMetric;
      fillRate?: ZeMetric;
      promoSellerActivationRate?: ZeMetric;
      merchantAvailabilityRate?: ZeMetric;
      tenMinutesDeliveryReleaseRate?: ZeMetric;
      deliveryTrackingAccuracyRate?: ZeMetric;
      thirtyFiveMinutesDeliveryAccurateRate?: ZeMetric;
      deliveryOrderAggroupmentRate3More?: ZeMetric;
      orderRating?: ZeMetric;
      idealPortfolioRate?: ZeMetric;
    };
    turbo?: {
      validTurboOrders?: ZeMetric;
      turboOrderRating?: ZeMetric;
      turboFillRate?: ZeMetric;
      turboTrackingAccuracyRate?: ZeMetric;
      fiveMinutesTurboDeliveryReleaseRate?: ZeMetric;
      fifteenMinutesTurboAccurateRate?: ZeMetric;
    };
    updatedDate: string;
  };
};

export type ZeCurrency = {
  value: number;
  currency: string;
};

export type ZeOrderReimbursementSummary = {
  displayId: string;
  createdAt: string;
  total: {
    otherFees: ZeCurrency;
    discount: ZeCurrency;
    orderReimbursement: ZeCurrency;
  };
  otherFees: Array<{
    type: "DELIVERY_FEE" | "SERVICE_FEE" | "SAMPLING_GIFTS" | "MARKUP" | "TAKE_RATE" | "MARKETPLACE_DISCOUNT";
    price: ZeCurrency;
  }>;
  discounts: Array<{
    description: string;
    amount: ZeCurrency;
  }>;
  extensions: {
    financialDetails: {
      isoWeek: number;
      isoYear: number;
    };
  };
};

export type ZeOrderReimbursementSummariesResponse = {
  merchantId: string;
  startDate: string;
  endDate: string;
  orders: ZeOrderReimbursementSummary[];
  pageInfo: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    hasNextPage: boolean;
  };
};

export type ZeOperationalIncentivesResponse = {
  operationalIncentives: Array<{
    amountPerOrder: ZeCurrency;
    totalAmount: ZeCurrency;
    validOrders: number;
  }>;
};

export type ZeOrderHistoryResponse = {
  page: number;
  pageSize: number;
  hasNext: boolean;
  items: Array<{
    number: string;
    date: string;
    customerName?: string;
    status: ZeOrderStatus;
    deliveryType: "DELIVERY" | "TAKEOUT" | "TURBO";
    payment?: {
      method?: string;
      type?: string;
    };
    total?: number;
  }>;
};

export type ZeEventPollingOutput = {
  eventId: string;
  orderId: number;
  orderURL: string;
  eventType: ZeOrderStatus;
  sourceAppId: string;
  createdAt: string;
};

export type ZeEventAcknowledgementInput = {
  id: string;
  orderId: number;
  eventType: ZeOrderStatus;
};

export type ZeWebhookDeliveryPayload = {
  clientId: string;
  eventType: ZeWebhookSubscriptionType;
  correlationId: string;
  data: {
    eventId: string;
    eventType: ZeWebhookEventType;
    orderId: number;
    createdAt: string;
    merchantId: string;
  };
};

export type ZeWebhookConfig = {
  clientId: string;
  hash?: string;
  endpoint: string;
  active: boolean;
  subscriptions: ZeWebhookSubscriptionType[];
};

export type ZeOrderDetail = {
  displayId: string;
  status: ZeOrderStatus;
  createdAt: string;
  merchant?: { id: number };
};

type TokenResponse = {
  access_token: string;
  expire_in?: number;
  expires_in?: number;
  token_type?: string;
};

type RequestOptions = {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
};

function isDefined(value: unknown) {
  return value !== undefined && value !== null && value !== "";
}

function toQueryParams(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!isDefined(value)) continue;
    if (Array.isArray(value)) {
      for (const item of value) searchParams.append(key, String(item));
      continue;
    }
    searchParams.append(key, String(value));
  }
  return searchParams;
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultDateRange(days = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - Math.max(days - 1, 0));
  return {
    startDate: formatDateOnly(startDate),
    endDate: formatDateOnly(endDate),
  };
}

function getCurrentIsoWeek() {
  const date = new Date();
  return {
    isoYear: getISOWeekYear(date),
    isoWeek: getISOWeek(date),
  };
}

function createMockMerchantKpis(): ZeMerchantKPIsResponse {
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

function createMockReimbursementSummaries(merchantId: string): ZeOrderReimbursementSummariesResponse {
  const { startDate, endDate } = getDefaultDateRange(7);
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
        extensions: { financialDetails: { isoWeek: getCurrentIsoWeek().isoWeek, isoYear: getCurrentIsoWeek().isoYear } },
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

function createMockOperationalIncentives(): ZeOperationalIncentivesResponse {
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

function createMockOrderHistory(merchantId: string): ZeOrderHistoryResponse {
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

function createMockEvents(merchantId: string): ZeEventPollingOutput[] {
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

function createMockWebhookConfig(): ZeWebhookConfig[] {
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

function createMockOrderDetail(orderNumber: string): ZeOrderDetail {
  return {
    displayId: orderNumber,
    status: "CONFIRMED",
    createdAt: new Date().toISOString(),
    merchant: { id: 12345 },
  };
}

export class ZeDeliveryClient {
  private http: AxiosInstance;
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly baseURL = ENV.zeDeliveryApiBaseUrl || "https://seller-public-api.release.ze.delivery",
    private readonly mockResponses = ENV.zeDeliveryUseMocks === "true" || !clientId || !clientSecret
  ) {
    this.http = axios.create({ baseURL, timeout: 30_000 });
  }

  get isMockMode() {
    return this.mockResponses;
  }

  private async getToken() {
    if (this.mockResponses) return "mock-token";
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;

    const response = await this.http.post<TokenResponse>(
      "/auth",
      toQueryParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      {
        params: {
          grant_type: "client_credentials",
          scope: "orders/read",
        },
        headers: { "content-type": "application/x-www-form-urlencoded" },
      }
    );

    const expiresIn = response.data.expire_in ?? response.data.expires_in ?? 24 * 60 * 60;
    this.token = response.data.access_token;
    this.tokenExpiresAt = Date.now() + Math.max(expiresIn - 60, 60) * 1000;
    return this.token;
  }

  private async request<T>(method: HttpMethod, path: string, options: RequestOptions = {}) {
    if (this.mockResponses) {
      throw new Error("Mock request shortcut should be handled by the public method");
    }

    const token = await this.getToken();
    const response = await this.http.request<T>({
      method,
      url: path,
      data: options.body,
      params: options.params ? toQueryParams(options.params) : undefined,
      headers: {
        authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    return response.data;
  }

  async getMerchantKPIs(
    merchantId: string,
    options: { granularity?: "HOUR" | "DAY" | "WEEK" | "MONTH"; referenceDate?: string } = {}
  ): Promise<ZeMerchantKPIsResponse> {
    if (this.mockResponses) return createMockMerchantKpis();

    return await this.request<ZeMerchantKPIsResponse>("get", `/merchants/${merchantId}/kpis`, {
      params: {
        granularity: options.granularity ?? "DAY",
        referenceDate: options.referenceDate ?? formatDateOnly(new Date()),
      },
    });
  }

  async getOrderReimbursementSummaries(
    merchantId: string,
    options: {
      startDate: string;
      endDate: string;
      page?: number;
      pageSize?: number;
      orderNumber?: string;
    }
  ): Promise<ZeOrderReimbursementSummariesResponse> {
    if (this.mockResponses) return createMockReimbursementSummaries(merchantId);

    return await this.request<ZeOrderReimbursementSummariesResponse>(
      "get",
      `/merchants/${merchantId}/reimbursements/orders/summaries`,
      {
        params: {
          startDate: options.startDate,
          endDate: options.endDate,
          page: options.page ?? 1,
          pageSize: options.pageSize ?? 100,
          orderNumber: options.orderNumber,
        },
      }
    );
  }

  async getOperationalIncentives(
    merchantId: string,
    options: { isoYear: number; isoWeek: number }
  ): Promise<ZeOperationalIncentivesResponse> {
    if (this.mockResponses) return createMockOperationalIncentives();

    return await this.request<ZeOperationalIncentivesResponse>(
      "get",
      `/merchants/${merchantId}/reports/operational-incentives`,
      {
        params: {
          isoYear: options.isoYear,
          isoWeek: options.isoWeek,
        },
      }
    );
  }

  async getOrderHistory(
    merchantId: string,
    options: {
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
      sort?: "asc" | "desc";
    } = {}
  ): Promise<ZeOrderHistoryResponse> {
    if (this.mockResponses) return createMockOrderHistory(merchantId);

    return await this.request<ZeOrderHistoryResponse>("get", `/merchants/${merchantId}/orders/history`, {
      params: {
        startDate: options.startDate,
        endDate: options.endDate,
        page: options.page ?? 1,
        pageSize: options.pageSize ?? 20,
        sort: options.sort ?? "desc",
      },
    });
  }

  async getOrderByNumber(orderNumber: string): Promise<ZeOrderDetail> {
    if (this.mockResponses) return createMockOrderDetail(orderNumber);

    return await this.request<ZeOrderDetail>("get", `/orders/${orderNumber}`);
  }

  async confirmOrder(
    orderNumber: string,
    body: { reason?: string; orderExternalCode?: string; createdAt?: string; preparationTime?: number } = {}
  ) {
    if (this.mockResponses) return { accepted: true as const, orderNumber };

    return await this.request("post", `/orders/${orderNumber}/confirm`, { body });
  }

  async requestOrderCancellation(orderNumber: string, code: string) {
    if (this.mockResponses) return { accepted: true as const, orderNumber, code };

    return await this.request("post", `/orders/${orderNumber}/requestCancellation`, {
      body: { code },
    });
  }

  async cancelOrder(orderNumber: string, code: string) {
    if (this.mockResponses) return { accepted: true as const, orderNumber, code };

    return await this.request("post", `/orders/${orderNumber}/cancel`, { body: { code } });
  }

  async restoreOrder(orderNumber: string) {
    if (this.mockResponses) return { accepted: true as const, orderNumber };

    return await this.request("post", `/orders/${orderNumber}/restore`);
  }

  async pollOrderEvents(
    merchantIds: string[] | string,
    options: { eventTypes?: ZeOrderStatus[] } = {}
  ): Promise<ZeEventPollingOutput[]> {
    const merchants = Array.isArray(merchantIds) ? merchantIds : [merchantIds];
    if (this.mockResponses) return createMockEvents(merchants.join(","));

    return await this.request<ZeEventPollingOutput[]>("get", "/events:polling", {
      headers: {
        "x-polling-merchants": merchants.join(","),
      },
      params: {
        eventType: options.eventTypes,
      },
    });
  }

  async acknowledgeEvents(events: ZeEventAcknowledgementInput[]) {
    if (this.mockResponses) return { accepted: true as const, events };

    return await this.request("post", "/events/acknowledgment", {
      body: events,
    });
  }

  async acknowledgeEvent(
    merchantId: string,
    eventId: string,
    eventType?: ZeOrderStatus,
    orderId?: number
  ) {
    if (!eventType || !orderId) {
      if (this.mockResponses) return { accepted: true as const, merchantId, eventId };
      throw new Error("acknowledgeEvent now expects an eventType and orderId; use acknowledgeEvents for the full payload");
    }

    return await this.acknowledgeEvents([{ id: eventId, orderId, eventType }]);
  }

  async getWebhooks() {
    if (this.mockResponses) return createMockWebhookConfig();

    return await this.request<ZeWebhookConfig[]>("get", "/webhooks");
  }

  async upsertWebhook(body: { endpoint: string; active?: boolean; subscribedEvents?: ZeWebhookSubscriptionType[] }) {
    if (this.mockResponses) return createMockWebhookConfig()[0];

    return await this.request<ZeWebhookConfig>("patch", "/webhooks", {
      body: {
        endpoint: body.endpoint,
        active: body.active ?? false,
        subscribedEvents: body.subscribedEvents ?? [],
      },
    });
  }
}

export function createZeDeliveryClient(clientId: string, clientSecret: string, baseURL?: string) {
  return new ZeDeliveryClient(clientId, clientSecret, baseURL);
}
