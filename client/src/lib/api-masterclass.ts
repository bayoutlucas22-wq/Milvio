import type { OwnerDashboardModel } from "@/lib/owner-dashboard";

type Metric = {
  value?: string;
};

type ApiKpiResponse = {
  kpis?: {
    general?: {
      validOrders?: Metric;
      fillRate?: Metric;
      merchantAvailabilityRate?: Metric;
      orderRating?: Metric;
    };
    turbo?: {
      validTurboOrders?: Metric;
    };
  };
};

type ApiSummary = {
  modeLabel?: string;
};

export type ApiMasterclassCard = {
  title: string;
  value: string;
  helper: string;
  tone: "good" | "default" | "risk";
};

export type ApiMasterclassScenario = {
  title: string;
  gain: string;
  description: string;
};

export type ApiMasterclassPlaybookItem = {
  title: string;
  description: string;
};

export type ApiMasterclass = {
  title: string;
  subtitle: string;
  modeLabel: string;
  cards: ApiMasterclassCard[];
  scenarios: ApiMasterclassScenario[];
  playbook: ApiMasterclassPlaybookItem[];
  formula: string;
};

type ApiMasterclassInput = {
  ownerModel: OwnerDashboardModel;
  apiKpi?: ApiKpiResponse | null;
  apiSummary?: ApiSummary | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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

function getMockValue(value: string | undefined, fallback: number) {
  const parsed = toNumber(value);
  return parsed > 0 ? parsed : fallback;
}

export function buildApiMasterclass({
  ownerModel,
  apiKpi,
  apiSummary,
}: ApiMasterclassInput): ApiMasterclass {
  const totals = ownerModel.totals;
  const revenue = toNumber(totals.grossRevenue);
  const profit = toNumber(totals.netMargin);
  const orders = Math.max(toNumber(totals.totalOrders || totals.deliveredOrders), 1);
  const averageTicket = revenue / orders || 0;
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  const validOrders = getMockValue(apiKpi?.kpis?.general?.validOrders?.value, Math.max(Math.round(orders * 0.83), 1));
  const fillRate = getMockValue(apiKpi?.kpis?.general?.fillRate?.value, 94.5);
  const availability = getMockValue(apiKpi?.kpis?.general?.merchantAvailabilityRate?.value, 98.2);
  const turboOrders = getMockValue(apiKpi?.kpis?.turbo?.validTurboOrders?.value, Math.max(Math.round(validOrders * 0.26), 1));

  const fillRateOpportunity = Math.max(0, 95 - fillRate);
  const lostOrders = Math.max(0, Math.round((fillRateOpportunity / 100) * validOrders));
  const recoveredRevenue = lostOrders * averageTicket;
  const recoveredProfit = recoveredRevenue * (marginPercent / 100);
  const deliverySaving = orders * 1;
  const restitutionSaving = toNumber(totals.restitutionTotal) * 0.1;

  return {
    title: "API Masterclass",
    subtitle:
      "A API não serve só para ver pedido. Ela mostra onde o dinheiro entra, onde ele some e qual ajuste traz lucro mais rápido.",
    modeLabel: apiSummary?.modeLabel ?? "Modo mock",
    cards: [
      {
        title: "Pedidos válidos",
        value: `${validOrders} pedidos`,
        helper: "o que realmente está entrando na operação",
        tone: "good",
      },
      {
        title: "Fill rate",
        value: pct(fillRate),
        helper: "quanto do volume está sendo atendido sem quebra",
        tone: fillRate >= 95 ? "good" : "risk",
      },
      {
        title: "Disponibilidade",
        value: pct(availability),
        helper: "quanto a loja ficou pronta para vender",
        tone: availability >= 98 ? "good" : "default",
      },
      {
        title: "Lucro por pedido",
        value: money(profit / orders),
        helper: "quanto sobra, em média, em cada venda",
        tone: profit >= 0 ? "good" : "risk",
      },
    ],
    scenarios: [
      {
        title: "1 ponto de fill rate vale quanto?",
        gain: money(recoveredProfit),
        description: `Se a operação recuperar ${pct(fillRateOpportunity)} do fill rate para bater 95%, o caso mock salva ${lostOrders} pedidos e cerca de ${money(recoveredRevenue)} em receita.`,
      },
      {
        title: "Economizar R$1 por pedido na entrega",
        gain: money(deliverySaving),
        description: "Pequena economia por pedido vira caixa no fim do mês. O ganho vem de rota melhor, escala melhor e menos retrabalho.",
      },
      {
        title: "Reduzir 10% das perdas recupera caixa",
        gain: money(restitutionSaving),
        description: "Quando a restituição cai, o lucro sobe sem precisar vender mais. Menos cancelamento e menos erro é dinheiro direto no caixa.",
      },
    ],
    playbook: [
      {
        title: "1. Ler o sinal",
        description: "Se o fill rate cai, o problema não é só técnico. É pedido perdido antes de virar faturamento.",
      },
      {
        title: "2. Cortar o vazamento",
        description: "O lucro sobe quando entrega, restituição e atraso perdem peso mais rápido que a receita cresce.",
      },
      {
        title: "3. Repetir a conta",
        description: "A cada semana, o dono olha a mesma fórmula: entrada, gasto e perda. O resto é execução.",
      },
    ],
    formula: "Lucro = faturamento - custo da loja - entrega - taxa da plataforma - perdas",
  };
}
