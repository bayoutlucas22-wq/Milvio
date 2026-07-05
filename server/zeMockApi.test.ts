import express from "express";
import { createServer } from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerZeMockApi } from "./zeMockApi";

describe("registerZeMockApi", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerZeMockApi(app);

    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Mock server did not start on an ephemeral port");
    }

    baseUrl = `http://127.0.0.1:${address.port}/api/ze-mock`;
  });

  afterAll(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it("exposes the swagger-backed endpoints used by the guide", async () => {
    const authResponse = await fetch(`${baseUrl}/auth`, { method: "POST" });
    expect(authResponse.status).toBe(200);
    await expect(authResponse.json()).resolves.toMatchObject({
      access_token: "mock-access-token",
      token_type: "bearer",
    });

    const kpiResponse = await fetch(`${baseUrl}/merchants/demo-merchant/kpis`);
    expect(kpiResponse.status).toBe(200);
    await expect(kpiResponse.json()).resolves.toMatchObject({
      kpis: {
        general: {
          validOrders: { value: "128" },
        },
      },
    });

    const orderResponse = await fetch(`${baseUrl}/orders/12345`);
    expect(orderResponse.status).toBe(200);
    await expect(orderResponse.json()).resolves.toMatchObject({
      displayId: "12345",
      status: "CONFIRMED",
    });

    const pollingResponse = await fetch(`${baseUrl}/events:polling`);
    expect(pollingResponse.status).toBe(200);
    await expect(pollingResponse.json()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "CONFIRMED",
        }),
      ])
    );

    const webhookResponse = await fetch(`${baseUrl}/webhooks`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    expect(webhookResponse.status).toBe(200);
    await expect(webhookResponse.json()).resolves.toMatchObject({
      active: false,
    });
  });
});
