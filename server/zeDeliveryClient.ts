import axios, { type AxiosInstance } from "axios";

export type ZeMerchantKpis = {
  grossRevenue: number;
  netMargin: number;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  platformCommissions: number;
  operationalCosts: number;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
};

export class ZeDeliveryClient {
  private http: AxiosInstance;
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    baseURL = "https://api.ze.delivery"
  ) {
    this.http = axios.create({ baseURL, timeout: 30_000 });
  }

  private async getToken() {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;

    const response = await this.http.post<TokenResponse>(
      "/oauth/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      { headers: { "content-type": "application/x-www-form-urlencoded" } }
    );

    this.token = response.data.access_token;
    this.tokenExpiresAt = Date.now() + Math.max(response.data.expires_in - 60, 60) * 1000;
    return this.token;
  }

  private async authedPost<T>(path: string, body: Record<string, unknown>) {
    const token = await this.getToken();
    const response = await this.http.post<T>(path, body, {
      headers: { authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async getMerchantKPIs(merchantId: string): Promise<ZeMerchantKpis> {
    return await this.authedPost<ZeMerchantKpis>("/reports/merchant-kpis", { merchantId });
  }

  async getOrderTransferSummary(merchantId: string) {
    return await this.authedPost("/reports/order-transfer-summary", { merchantId });
  }

  async getOperationalIncentives(merchantId: string) {
    return await this.authedPost("/reports/operational-incentives-summary", { merchantId });
  }

  async pollOrderEvents(merchantId: string, lastEventId?: string) {
    return await this.authedPost("/events:polling", { merchantId, lastEventId });
  }

  async acknowledgeEvent(merchantId: string, eventId: string) {
    return await this.authedPost("/events/acknowledgment", { merchantId, eventId });
  }
}

export function createZeDeliveryClient(clientId: string, clientSecret: string, baseURL?: string) {
  return new ZeDeliveryClient(clientId, clientSecret, baseURL);
}
