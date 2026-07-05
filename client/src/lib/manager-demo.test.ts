import { describe, expect, it } from "vitest";
import { buildManagerDemoSnapshot } from "@/lib/manager-demo";

describe("buildManagerDemoSnapshot", () => {
  it("creates a simple mock story for a store manager", () => {
    const snapshot = buildManagerDemoSnapshot();

    expect(snapshot.title).toBe("Painel do gestor");
    expect(snapshot.subtitle).toContain("quanto entra");
    expect(snapshot.kpis).toHaveLength(4);
    expect(snapshot.kpis[0]).toMatchObject({
      label: "Vendas de hoje",
      value: "R$ 18.450,00",
    });
    expect(snapshot.kpis[1]).toMatchObject({
      label: "Lucro estimado",
      value: "R$ 4.880,00",
    });
    expect(snapshot.actions[0]?.description).toContain("cancelamentos");
    expect(snapshot.playbook).toHaveLength(3);
  });

  it("derives the story from imported workbook totals when available", () => {
    const snapshot = buildManagerDemoSnapshot({
      ownerModel: {
        totals: {
          grossRevenue: 11317.79,
          netMargin: 4890,
          netMarginPercent: 43.2,
          productCosts: 8420,
          deliveryCosts: 880,
          platformCommissions: 2890,
          restitutionTotal: 1117.9,
          criticalStockCount: 2,
          lateOrders: 5,
          waitingOrders: 1,
        },
      } as any,
    });

    expect(snapshot.subtitle).toContain("R$ 11.317,79");
    expect(snapshot.subtitle).toContain("R$ 4.890,00");
    expect(snapshot.kpis[0]?.value).toBe("R$ 11.317,79");
    expect(snapshot.kpis[1]?.value).toBe("R$ 4.890,00");
    expect(snapshot.actions[0]?.description).toContain("5");
    expect(snapshot.actions[1]?.description).toContain("880");
  });
});
