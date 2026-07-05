import { describe, expect, it } from "vitest";
import { buildZeSwaggerDocument } from "./swagger";

describe("buildZeSwaggerDocument", () => {
  it("injects the local mock server and keeps the source contract intact", () => {
    const document = buildZeSwaggerDocument("/api/ze-mock");

    expect(document.openapi).toBe("3.0.3");
    expect(document.info?.title).toBe("Zé Seller Public API");
    expect(document.servers?.[0]).toEqual({
      url: "/api/ze-mock",
      description: "Local mock server for Swagger try-it-out",
    });
    expect(document.info?.description).toContain("Swagger UI is exposed locally");
    expect(document.paths?.["/orders/{orderNumber}"]).toBeDefined();
    expect(document.paths?.["/auth"]).toBeDefined();
    expect(document.paths?.["/events:polling"]).toBeDefined();
    expect(document.paths?.["/webhooks"]).toBeDefined();
    expect(document.paths?.["/merchants/{merchantId}/kpis"]).toBeDefined();
  });
});
