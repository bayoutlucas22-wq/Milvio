import type { OwnerDashboardModel } from "@/lib/owner-dashboard";

type OwnerOrdersSummary = {
  totals?: {
    totalOrders?: number;
    grossRevenue?: number;
  };
  topProducts?: Array<{
    name?: string;
    count?: number;
    total?: number;
  }>;
  paymentMix?: Record<string, number>;
  topCouriers?: Array<{
    name?: string;
    count?: number;
    total?: number;
  }>;
};

type OwnerMonthlyIntelligence = {
  monthCount?: number;
  fileCount?: number;
  importedRowsTotal?: number;
  uniqueDays?: number;
  totalRows?: number;
  dateFrom?: string;
  dateTo?: string;
  totals?: {
    grossRevenue?: number;
    totalNetMargin?: number;
    restitutionTotal?: number;
  };
  months?: Array<{
    month?: string;
    label?: string;
    grossRevenue?: number;
    totalNetMargin?: number;
    restitutionTotal?: number;
    netMarginPercent?: number;
  }>;
};

export type OwnerStudyProductRow = {
  name: string;
  count: number;
  total: number;
  share: number;
  averageTicket: number;
};

export type OwnerStudyScenario = {
  title: string;
  gain: string;
  description: string;
  tone: "good" | "default" | "risk";
};

export type OwnerStudyMonthRow = {
  month: string;
  label: string;
  grossRevenue: number;
  totalNetMargin: number;
  restitutionTotal: number;
  netMarginPercent: number;
};

export type OwnerStudy = {
  productStudy: {
    rows: OwnerStudyProductRow[];
    bestProduct: OwnerStudyProductRow | null;
    weakestProduct: OwnerStudyProductRow | null;
    coveragePercent: number;
    story: string;
  };
  monthlyTrend: {
    isMonthRange: boolean;
    dateFrom?: string;
    dateTo?: string;
    source: {
      fileCount: number;
      importedRows: number;
      uniqueDays: number;
    };
    months: OwnerStudyMonthRow[];
    bestMonth: OwnerStudyMonthRow | null;
    weakestMonth: OwnerStudyMonthRow | null;
    restitutionPer100Revenue: number;
    averageDailyRestitution: number;
    story: string;
  };
  profitLab: {
    cards: OwnerStudyScenario[];
    playbook: Array<{
      title: string;
      description: string;
    }>;
    weeklyPotential: string;
  };
};

type OwnerStudyInput = {
  model: OwnerDashboardModel;
  ordersSummary?: OwnerOrdersSummary | null;
  monthlyIntelligence?: OwnerMonthlyIntelligence | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  })
    .format(Number.isFinite(value) ? value : 0)
    .replace(/\u00a0/g, " ");
}

function pct(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

export function buildOwnerStudy({ model, ordersSummary, monthlyIntelligence }: OwnerStudyInput): OwnerStudy {
  const totalRevenue =
    toNumber(ordersSummary?.totals?.grossRevenue) ||
    toNumber(model.totals.grossRevenue) ||
    1;
  const totalOrders =
    Math.max(toNumber(ordersSummary?.totals?.totalOrders), 0) ||
    Math.max(toNumber(model.totals.totalOrders || model.totals.deliveredOrders), 1);
  const totalMargin = toNumber(model.totals.netMargin);
  const marginPercent = totalRevenue > 0 ? totalMargin / totalRevenue : 0;
  const topProducts = (ordersSummary?.topProducts ?? [])
    .map((item) => ({
      name: String(item?.name ?? "").trim(),
      count: toNumber(item?.count),
      total: toNumber(item?.total),
    }))
    .filter((item) => item.name.length > 0)
    .sort((left, right) => right.total - left.total || right.count - left.count);

  const productRows = topProducts.length
    ? topProducts.map((product) => ({
        ...product,
        share: round((product.total / totalRevenue) * 100),
        averageTicket: product.count > 0 ? round(product.total / product.count) : 0,
      }))
    : [
        {
          name: "Mix principal",
          count: totalOrders,
          total: totalRevenue,
          share: 100,
          averageTicket: round(totalRevenue / Math.max(totalOrders, 1)),
        },
      ];

  const bestProduct = productRows[0] ?? null;
  const weakestProduct = productRows[productRows.length - 1] ?? null;
  const coveragePercent = round(
    productRows.reduce((sum, row) => sum + row.share, 0)
  );
  const monthRows = (monthlyIntelligence?.months ?? [])
    .map((month) => {
      const grossRevenue = toNumber(month.grossRevenue);
      const totalNetMargin = toNumber(month.totalNetMargin);
      return {
        month: String(month.month ?? ""),
        label: String(month.label ?? month.month ?? ""),
        grossRevenue,
        totalNetMargin,
        restitutionTotal: toNumber(month.restitutionTotal),
        netMarginPercent: toNumber(month.netMarginPercent) || (grossRevenue > 0 ? round((totalNetMargin / grossRevenue) * 100) : 0),
      };
    })
    .filter((month) => month.month.length > 0)
    .sort((left, right) => left.month.localeCompare(right.month));
  const isMonthRange = toNumber(monthlyIntelligence?.monthCount) >= 2 && monthRows.length >= 2;
  const sourceUniqueDays = toNumber(monthlyIntelligence?.uniqueDays || monthlyIntelligence?.totalRows || monthRows.reduce((sum, month) => sum + 1, 0));
  const source = {
    fileCount: toNumber(monthlyIntelligence?.fileCount),
    importedRows: toNumber(monthlyIntelligence?.importedRowsTotal),
    uniqueDays: sourceUniqueDays,
  };
  const monthlyGrossRevenue =
    toNumber(monthlyIntelligence?.totals?.grossRevenue) ||
    monthRows.reduce((sum, month) => sum + month.grossRevenue, 0);
  const monthlyRestitution =
    toNumber(monthlyIntelligence?.totals?.restitutionTotal) ||
    monthRows.reduce((sum, month) => sum + month.restitutionTotal, 0);
  const restitutionPer100Revenue = monthlyGrossRevenue > 0 ? round((monthlyRestitution / monthlyGrossRevenue) * 100) : 0;
  const averageDailyRestitution = sourceUniqueDays > 0 ? round(monthlyRestitution / sourceUniqueDays) : 0;
  const bestMonth = isMonthRange
    ? monthRows.reduce<OwnerStudyMonthRow | null>((best, month) => {
        if (!best || month.totalNetMargin > best.totalNetMargin) return month;
        return best;
      }, null)
    : null;
  const weakestMonth = isMonthRange
    ? monthRows.reduce<OwnerStudyMonthRow | null>((weakest, month) => {
        if (!weakest || month.totalNetMargin < weakest.totalNetMargin) return month;
        return weakest;
      }, null)
    : null;

  const deliverySaving = totalOrders * 1;
  const restitutionSaving = toNumber(model.totals.restitutionTotal) * 0.1;
  const ticketLiftRevenue = totalRevenue * 0.05;
  const ticketLiftProfit = ticketLiftRevenue * marginPercent;
  const weeklyPotential = money(deliverySaving + restitutionSaving + ticketLiftProfit);

  const cards: OwnerStudyScenario[] = [
    {
      title: "Cortar R$1 da entrega por pedido",
      gain: money(deliverySaving),
      description: `Com ${totalOrders} pedidos no período, o lucro sobe sem mudar o volume.`,
      tone: "good",
    },
    {
      title: "Reduzir 10% das perdas",
      gain: money(restitutionSaving),
      description: "Menos erro, menos cancelamento e menos reembolso viram caixa direto.",
      tone: "good",
    },
    {
      title: "Aumentar o ticket em 5%",
      gain: money(ticketLiftProfit),
      description: "Se a venda sobe sem a mesma alta de custo, a margem cresce junto.",
      tone: marginPercent > 0 ? "good" : "default",
    },
  ];

  return {
    productStudy: {
      rows: productRows,
      bestProduct,
      weakestProduct,
      coveragePercent,
      story:
        topProducts.length > 0
          ? `Os produtos mais fortes já representam ${pct(coveragePercent)} do valor do mix importado.`
          : "Sem ranking de produtos no XLS, o estudo usa o mix principal como referência.",
    },
    monthlyTrend: {
      isMonthRange,
      dateFrom: monthlyIntelligence?.dateFrom,
      dateTo: monthlyIntelligence?.dateTo,
      source,
      months: isMonthRange ? monthRows : [],
      bestMonth,
      weakestMonth,
      restitutionPer100Revenue,
      averageDailyRestitution,
      story:
        isMonthRange && bestMonth
          ? `Leitura de ${monthRows.length} meses: ${bestMonth.label} foi o melhor mês de lucro dentro dos XLS.`
          : "Sem intervalo mensal suficiente; a inteligência usa apenas o recorte atual.",
    },
    profitLab: {
      cards,
      playbook: [
        {
          title: "1. Defender o campeão",
          description: "Não deixar o produto que mais vende faltar na hora da saída.",
        },
        {
          title: "2. Cortar o vazamento",
          description: "A economia mais rápida vem de entrega, perda e retrabalho.",
        },
        {
          title: "3. Aumentar o ticket com mix certo",
          description: "O dono ganha quando vende melhor, não só quando vende mais.",
        },
      ],
      weeklyPotential,
    },
  };
}
