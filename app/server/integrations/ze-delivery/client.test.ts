import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { ZeDeliveryClient } from "./client";

vi.mock("axios", () => ({
  default: {
    create: vi.fn(),
  },
}));

describe("ZeDeliveryClient", () => {
  const postMock = vi.fn();

  beforeEach(() => {
    postMock.mockReset();
    (axios.create as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      post: postMock,
    });
  });

  it("fetches and caches a token using client credentials", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        access_token: "token-1",
        expires_in: 3600,
      },
    });
    postMock.mockResolvedValueOnce({
      data: {
        grossRevenue: 100,
        netMargin: 25,
        totalOrders: 10,
        deliveredOrders: 9,
        cancelledOrders: 1,
        platformCommissions: 12,
        operationalCosts: 40,
      },
    });

    const client = new ZeDeliveryClient("client-id", "client-secret", "https://api.example.com");
    await client.getMerchantKPIs("merchant-1");

    expect(postMock).toHaveBeenCalledWith("/oauth/token", expect.any(URLSearchParams), expect.anything());
    expect(postMock).toHaveBeenCalledWith(
      "/reports/merchant-kpis",
      expect.objectContaining({
        merchantId: "merchant-1",
      }),
      expect.anything()
    );
  });

  it("exposes report and event methods", () => {
    const client = new ZeDeliveryClient("client-id", "client-secret");

    expect(typeof client.getMerchantKPIs).toBe("function");
    expect(typeof client.getOrderTransferSummary).toBe("function");
    expect(typeof client.getOperationalIncentives).toBe("function");
    expect(typeof client.pollOrderEvents).toBe("function");
    expect(typeof client.acknowledgeEvent).toBe("function");
  });
});
