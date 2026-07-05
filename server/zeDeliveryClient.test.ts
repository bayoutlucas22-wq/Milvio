import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZeDeliveryClient } from "./zeDeliveryClient";

vi.mock("axios", () => ({
  default: {
    create: vi.fn(),
  },
}));

describe("ZeDeliveryClient", () => {
  const postMock = vi.fn();
  const requestMock = vi.fn();

  beforeEach(() => {
    postMock.mockReset();
    requestMock.mockReset();
    (axios.create as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      post: postMock,
      request: requestMock,
    });
  });

  it("authenticates and fetches merchant KPIs from the public API", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        access_token: "token-1",
        expire_in: 3600,
      },
    });
    requestMock.mockResolvedValueOnce({
      data: {
        kpis: {
          general: {
            validOrders: { type: "INTEGER", value: "10" },
            fillRate: { type: "PERCENTAGE", value: "92.5" },
          },
          updatedDate: "2026-03-06T18:54:53.887Z",
        },
      },
    });

    const client = new ZeDeliveryClient("client-id", "client-secret", "https://api.example.com");
    const response = await client.getMerchantKPIs("merchant-1", {
      granularity: "DAY",
      referenceDate: "2026-03-06",
    });

    expect(postMock).toHaveBeenCalledWith(
      "/auth",
      expect.any(URLSearchParams),
      expect.objectContaining({
        params: {
          grant_type: "client_credentials",
          scope: "orders/read",
        },
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      })
    );
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "get",
        url: "/merchants/merchant-1/kpis",
        params: expect.any(URLSearchParams),
        headers: expect.objectContaining({
          authorization: "Bearer token-1",
        }),
      })
    );
    expect(response.kpis.general.validOrders?.value).toBe("10");
  });

  it("returns mock data when credentials are not available yet", async () => {
    const client = new ZeDeliveryClient("", "");
    const response = await client.getMerchantKPIs("merchant-1");

    expect(response.kpis.general.validOrders?.value).toBe("128");
    expect(response.kpis.general.fillRate?.value).toBe("96.4");
  });

  it("exposes the main integration methods", () => {
    const client = new ZeDeliveryClient("client-id", "client-secret");

    expect(typeof client.getMerchantKPIs).toBe("function");
    expect(typeof client.getOrderReimbursementSummaries).toBe("function");
    expect(typeof client.getOperationalIncentives).toBe("function");
    expect(typeof client.getOrderHistory).toBe("function");
    expect(typeof client.pollOrderEvents).toBe("function");
    expect(typeof client.acknowledgeEvents).toBe("function");
    expect(typeof client.getWebhooks).toBe("function");
    expect(typeof client.upsertWebhook).toBe("function");
  });
});
