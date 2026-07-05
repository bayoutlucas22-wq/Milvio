import type { OwnerDashboardModel } from "@/lib/owner-dashboard";

type MaybeDate = string | Date | null | undefined;

export type OwnerMoneyHistoryRow = {
  closingDate?: MaybeDate;
  totalOrders?: number;
  grossRevenue?: number;
  productCosts?: number;
  deliveryCosts?: number;
  platformCommissions?: number;
  refunds?: number;
  totalNetMargin?: number;
  netMarginPercent?: number;
};

export type OwnerMoneyBucket = {
  key: "productCosts" | "deliveryCosts" | "platformCommissions" | "refunds" | "netMargin";
  label: string;
  amount: number;
  share: number;
  per100: number;
  tone: "good" | "default" | "risk";
  helper: string;
};

export type OwnerMoneyChartRow = {
  date: string;
  label: string;
  orders: number;
  revenue: number;
  productCosts: number;
  deliveryCosts: number;
  platformCommissions: number;
  refunds: number;
  profit: number;
  marginPercent: number;
};

export type OwnerMoneyRecommendation = {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  tag: string;
};

export type OwnerMoneyAnalysis = {
  chartRows: OwnerMoneyChartRow[];
  buckets: OwnerMoneyBucket[];
  recommendations: OwnerMoneyRecommendation[];
  kpis: {
    revenueTotal: number;
    profitTotal: number;
    averageOrders: number;
    profitMarginPercent: number;
    revenueTrendPercent: number;
    profitTrendPercent: number;
  };
};

type OwnerMoneyAnalysisInput = {
  model: OwnerDashboardModel;
  history?: OwnerMoneyHistoryRow[];
  limit?: number;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function formatShortDate(value: Date) {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function parseDate(value: MaybeDate) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function buildBaseRow(model: OwnerDashboardModel): OwnerMoneyChartRow {
  return {
    date: "hoje",
    label: "Hoje",
    orders: toNumber(model.totals.totalOrders || model.totals.deliveredOrders || 0),
    revenue: toNumber(model.totals.grossRevenue),
    productCosts: toNumber(model.totals.productCosts),
    deliveryCosts: toNumber(model.totals.deliveryCosts),
    platformCommissions: toNumber(model.totals.platformCommissions),
    refunds: toNumber(model.totals.restitutionTotal),
    profit: toNumber(model.totals.netMargin),
    marginPercent: toNumber(model.totals.netMarginPercent),
  };
}

export function buildOwnerMoneyAnalysis({
  model,
  history = [],
  limit = 7,
}: OwnerMoneyAnalysisInput): OwnerMoneyAnalysis {
  const timeline = history
    .map((row) => {
      const closingDate = parseDate(row.closingDate);
      return {
        closingDate,
        totalOrders: toNumber(row.totalOrders),
        grossRevenue: toNumber(row.grossRevenue),
        productCosts: toNumber(row.productCosts),
        deliveryCosts: toNumber(row.deliveryCosts),
        platformCommissions: toNumber(row.platformCommissions),
        refunds: toNumber(row.refunds),
        totalNetMargin: toNumber(row.totalNetMargin),
        netMarginPercent: toNumber(row.netMarginPercent),
      };
    })
    .filter((row) => row.closingDate)
    .sort((left, right) => left.closingDate!.getTime() - right.closingDate!.getTime())
    .slice(-Math.max(limit, 1));

  const chartRows: OwnerMoneyChartRow[] = timeline.length
    ? timeline.map((row) => ({
        date: row.closingDate ? row.closingDate.toISOString().slice(0, 10) : "",
        label: row.closingDate ? formatShortDate(row.closingDate) : "Hoje",
        orders: row.totalOrders,
        revenue: row.grossRevenue,
        productCosts: row.productCosts,
        deliveryCosts: row.deliveryCosts,
        platformCommissions: row.platformCommissions,
        refunds: row.refunds,
        profit: row.totalNetMargin,
        marginPercent: row.netMarginPercent,
      }))
    : [buildBaseRow(model)];

  const revenueSeries = chartRows.map((row) => row.revenue);
  const profitSeries = chartRows.map((row) => row.profit);
  const ordersSeries = chartRows.map((row) => row.orders);

  const revenueTotal = round(sum(revenueSeries) || toNumber(model.totals.grossRevenue));
  const productCostsTotal = round(sum(chartRows.map((row) => row.productCosts)) || toNumber(model.totals.productCosts));
  const deliveryCostsTotal = round(sum(chartRows.map((row) => row.deliveryCosts)) || toNumber(model.totals.deliveryCosts));
  const platformCommissionsTotal = round(
    sum(chartRows.map((row) => row.platformCommissions)) || toNumber(model.totals.platformCommissions)
  );
  const refundsTotal = round(sum(chartRows.map((row) => row.refunds)) || toNumber(model.totals.restitutionTotal));
  const profitTotal = round(sum(profitSeries) || toNumber(model.totals.netMargin));

  const latest = chartRows[chartRows.length - 1] ?? buildBaseRow(model);
  const earliest = chartRows[0] ?? latest;
  const latestRevenue = latest.revenue || revenueTotal || 0;
  const bucketBase = revenueTotal > 0 ? revenueTotal : latestRevenue || 1;

  const buckets = [
    {
      key: "productCosts",
      label: "Custo da loja",
      amount: productCostsTotal,
      share: round((productCostsTotal / bucketBase) * 100),
      per100: round((productCostsTotal / bucketBase) * 100),
      tone: "risk",
      helper: "Compra, insumo e perda de produto.",
    },
    {
      key: "deliveryCosts",
      label: "Entrega",
      amount: deliveryCostsTotal,
      share: round((deliveryCostsTotal / bucketBase) * 100),
      per100: round((deliveryCostsTotal / bucketBase) * 100),
      tone: "risk",
      helper: "Frete, motoboy e custo operacional de saída.",
    },
    {
      key: "platformCommissions",
      label: "Plataforma",
      amount: platformCommissionsTotal,
      share: round((platformCommissionsTotal / bucketBase) * 100),
      per100: round((platformCommissionsTotal / bucketBase) * 100),
      tone: "risk",
      helper: "Taxa da operação e repasses do canal.",
    },
    {
      key: "refunds",
      label: "Perdas / restituição",
      amount: refundsTotal,
      share: round((refundsTotal / bucketBase) * 100),
      per100: round((refundsTotal / bucketBase) * 100),
      tone: "risk",
      helper: "Cancelamentos, correções e dinheiro que volta.",
    },
    {
      key: "netMargin",
      label: "Lucro líquido",
      amount: profitTotal,
      share: round((profitTotal / bucketBase) * 100),
      per100: round((profitTotal / bucketBase) * 100),
      tone: "good",
      helper: "O que realmente sobra para o dono.",
    },
  ] satisfies OwnerMoneyBucket[];

  buckets.sort((left, right) => right.amount - left.amount);

  const profitMarginPercent = revenueTotal > 0 ? round((profitTotal / revenueTotal) * 100) : 0;
  const revenueTrendPercent =
    earliest.revenue > 0 ? round(((latest.revenue - earliest.revenue) / earliest.revenue) * 100) : 0;
  const profitTrendPercent =
    earliest.profit > 0 ? round(((latest.profit - earliest.profit) / earliest.profit) * 100) : 0;
  const averageOrders = round(sum(ordersSeries) / (chartRows.length || 1));

  const recommendations: OwnerMoneyRecommendation[] = [];

  if (profitMarginPercent < 15) {
    recommendations.push({
      title: "Proteger a margem",
      description:
        "A margem está apertada. Antes de vender mais, vale reduzir custo de produto, entrega e perda.",
      priority: "high",
      tag: "margem",
    });
  } else {
    recommendations.push({
      title: "Manter a margem saudável",
      description:
        "A operação está sobrando dinheiro. Agora o foco é não deixar o custo esconder o crescimento.",
      priority: "low",
      tag: "margem",
    });
  }

  if ((productCostsTotal / bucketBase) * 100 >= 55) {
    recommendations.push({
      title: "Rever custo da loja",
      description:
        "O custo de produto está alto demais no faturamento. Comprar melhor e precificar certo pode destravar lucro rápido.",
      priority: "high",
      tag: "produto",
    });
  }

  if ((deliveryCostsTotal / bucketBase) * 100 >= 12) {
    recommendations.push({
      title: "Encurtar custo da entrega",
      description:
        "A entrega está com peso relevante no caixa. Melhor rota, escala e repasse ajudam a ganhar mais por pedido.",
      priority: "high",
      tag: "entrega",
    });
  }

  if ((refundsTotal / bucketBase) * 100 >= 5) {
    recommendations.push({
      title: "Cortar perdas",
      description:
        "A restituição está comendo margem. Reduzir cancelamentos, erros e rupturas vira ganho direto.",
      priority: "high",
      tag: "perdas",
    });
  }

  if (revenueTrendPercent < 0 || profitTrendPercent < 0) {
    recommendations.push({
      title: "Reativar a curva de ganho",
      description:
        "Se a receita ou o lucro estão caindo, a próxima ação é puxar ticket médio, mix de venda e pedidos mais rentáveis.",
      priority: "medium",
      tag: "tendencia",
    });
  }

  return {
    chartRows,
    buckets,
    recommendations: recommendations.slice(0, 4),
    kpis: {
      revenueTotal,
      profitTotal,
      averageOrders,
      profitMarginPercent,
      revenueTrendPercent,
      profitTrendPercent,
    },
  };
}
