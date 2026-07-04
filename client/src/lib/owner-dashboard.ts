type SummaryMap = Record<string, unknown>;

type NumericBag = Record<string, unknown> | null | undefined;

export type OwnerDashboardInputs = {
  summaries?: SummaryMap;
  operational?: NumericBag;
  financial?: NumericBag;
  criticalStockCount?: number;
};

export type OwnerDashboardModel = {
  importCatalog: any[];
  ordersSummary: any | null;
  driversSummary: any | null;
  restitutionSummary: any | null;
  latestResult: any | null;
  totals: {
    totalOrdersToday: number;
    grossRevenue: number;
    netMargin: number;
    netMarginPercent: number;
    productCosts: number;
    deliveryCosts: number;
    platformCommissions: number;
    restitutionTotal: number;
    finalOperationalCost: number;
    criticalStockCount: number;
    totalOrders: number;
    deliveredOrders: number;
    totalDrivers: number;
    activeOrders: number;
    waitingOrders: number;
    lateOrders: number;
    capacityUsedPercent: number;
    availableDrivers: number;
    driversWithOne: number;
    driversWithTwo: number;
  };
};

export type OwnerRecommendation = {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  tag: string;
};

export function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildOwnerDashboardModel({
  summaries = {},
  operational = {},
  financial = {},
  criticalStockCount = 0,
}: OwnerDashboardInputs = {}): OwnerDashboardModel {
  const importCatalog = Array.isArray(summaries["excel_ingest:catalog"])
    ? (summaries["excel_ingest:catalog"] as any[])
    : [];
  const ordersSummary = (summaries["excel_ingest:orders_report"] as any) ?? null;
  const driversSummary = (summaries["excel_ingest:drivers_report"] as any) ?? null;
  const restitutionSummary = (summaries["excel_ingest:restitution_summary"] as any) ?? null;
  const latestResult = (summaries["excel_ingest:last_result"] as any) ?? null;

  const grossRevenue = toNumber(
    financial?.grossRevenue ?? restitutionSummary?.totals?.grossRevenue ?? ordersSummary?.totals?.grossRevenue
  );
  const netMargin = toNumber(financial?.netMargin ?? restitutionSummary?.totals?.totalNetMargin);
  const netMarginPercent = toNumber(
    financial?.netMarginPercent ?? restitutionSummary?.totals?.netMarginPercent
  );
  const productCosts = toNumber(financial?.productCosts ?? restitutionSummary?.totals?.storeCostTotal);
  const deliveryCosts = toNumber(financial?.deliveryCosts ?? restitutionSummary?.totals?.driverCostTotal);
  const platformCommissions = toNumber(
    financial?.platformCommissions ?? restitutionSummary?.totals?.marketplaceCommission
  );
  const restitutionTotal = toNumber(restitutionSummary?.totals?.restitutionTotal);
  const finalOperationalCost =
    toNumber(restitutionSummary?.totals?.storeCostTotal) +
    toNumber(restitutionSummary?.totals?.driverCostTotal);

  return {
    importCatalog,
    ordersSummary,
    driversSummary,
    restitutionSummary,
    latestResult,
    totals: {
      totalOrdersToday: toNumber(operational?.totalOrdersToday),
      grossRevenue,
      netMargin,
      netMarginPercent,
      productCosts,
      deliveryCosts,
      platformCommissions,
      restitutionTotal,
      finalOperationalCost,
      criticalStockCount: toNumber(criticalStockCount),
      totalOrders: toNumber(ordersSummary?.totals?.totalOrders),
      deliveredOrders: toNumber(ordersSummary?.totals?.deliveredOrders),
      totalDrivers: toNumber(driversSummary?.totals?.totalDrivers),
      activeOrders: toNumber(operational?.activeOrders),
      waitingOrders: toNumber(operational?.waitingOrders),
      lateOrders: toNumber(operational?.lateOrders),
      capacityUsedPercent: toNumber(operational?.capacityUsedPercent),
      availableDrivers: toNumber(operational?.availableDrivers),
      driversWithOne: toNumber(operational?.driversWithOne),
      driversWithTwo: toNumber(operational?.driversWithTwo),
    },
  };
}

export function buildOwnerRecommendations(model: OwnerDashboardModel): OwnerRecommendation[] {
  const recommendations: OwnerRecommendation[] = [];
  const margin = model.totals.netMarginPercent;
  const grossRevenue = model.totals.grossRevenue;
  const deliveryCosts = model.totals.deliveryCosts;
  const productCosts = model.totals.productCosts;
  const availableDrivers = model.totals.availableDrivers;
  const criticalStockCount = model.totals.criticalStockCount;
  const lateOrders = model.totals.lateOrders;
  const waitingOrders = model.totals.waitingOrders;
  const restitutionTotal = model.totals.restitutionTotal;

  if (margin < 20) {
    recommendations.push({
      title: "Aumentar margem por pedido",
      description:
        "A margem está abaixo do nível saudável. O próximo ganho vem de reduzir custo de produto, frete ou comissão antes de crescer volume.",
      priority: "high",
      tag: "margem",
    });
  } else {
    recommendations.push({
      title: "Proteger a margem atual",
      description:
        "A operação está com margem boa. O foco agora é manter o custo estável enquanto cresce o faturamento sem aumentar perda.",
      priority: "low",
      tag: "margem",
    });
  }

  if (criticalStockCount > 0) {
    recommendations.push({
      title: "Repor estoque crítico",
      description:
        "Há itens em nível crítico. Se faltar produto, a loja perde pedido, margem e velocidade de saída.",
      priority: "high",
      tag: "estoque",
    });
  }

  if (waitingOrders > 0 || availableDrivers <= 1) {
    recommendations.push({
      title: "Aumentar folga de motoboys",
      description:
        "A fila está apertada. Mais folga operacional reduz atraso e evita perder pedido por falta de entrega.",
      priority: "high",
      tag: "operação",
    });
  }

  if (lateOrders > 0) {
    recommendations.push({
      title: "Atacar atrasos primeiro",
      description:
        "Pedidos atrasados corroem reputação e aumentam custo oculto. Ajuste preparação, saída e despacho para proteger lucro.",
      priority: "medium",
      tag: "sla",
    });
  }

  if (restitutionTotal > grossRevenue * 0.05 && grossRevenue > 0) {
    recommendations.push({
      title: "Reduzir restituições",
      description:
        "A restituição está pesada no caixa. Rever ruptura, cancelamentos e erros de separação tende a melhorar lucro rápido.",
      priority: "high",
      tag: "perdas",
    });
  }

  if (deliveryCosts > productCosts * 0.5 && productCosts > 0) {
    recommendations.push({
      title: "Renegociar custo logístico",
      description:
        "O custo de entrega está consumindo uma fatia alta da operação. Rever zona, escala e repasse pode aumentar a margem.",
      priority: "medium",
      tag: "custo",
    });
  }

  return recommendations.slice(0, 4);
}
