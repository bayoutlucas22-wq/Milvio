type MaybeArray<T> = T[] | undefined | null;

type SummaryCardTone = "default" | "good" | "risk";

type ZeMetric = {
  type?: string;
  value?: string;
};

type ZeMerchantKPIsResponse = {
  kpis?: {
    general?: {
      validOrders?: ZeMetric;
      fillRate?: ZeMetric;
      merchantAvailabilityRate?: ZeMetric;
      orderRating?: ZeMetric;
    };
    turbo?: {
      validTurboOrders?: ZeMetric;
    };
    updatedDate?: string;
  };
};

type ZeReimbursementSummary = {
  displayId?: string;
  total?: {
    orderReimbursement?: {
      value?: number;
      currency?: string;
    };
  };
  extensions?: {
    financialDetails?: {
      isoWeek?: number;
      isoYear?: number;
    };
  };
};

type ZeReimbursementsResponse = {
  merchantId?: string;
  startDate?: string;
  endDate?: string;
  orders?: ZeReimbursementSummary[];
  pageInfo?: {
    currentPage?: number;
    pageSize?: number;
    totalItems?: number;
    hasNextPage?: boolean;
  };
};

type ZeHistoryItem = {
  number?: string;
  date?: string;
  status?: string;
  total?: number;
};

type ZeOrderHistoryResponse = {
  page?: number;
  pageSize?: number;
  hasNext?: boolean;
  items?: ZeHistoryItem[];
};

type ZeWebhookConfig = {
  clientId?: string;
  hash?: string;
  endpoint?: string;
  active?: boolean;
  subscriptions?: string[];
};

export type ZeOwnerSummaryCard = {
  title: string;
  value: string;
  helper: string;
  tone: SummaryCardTone;
};

export type ZeOwnerSummary = {
  modeLabel: string;
  cards: ZeOwnerSummaryCard[];
};

export type ZeOwnerSummaryInput = {
  mode: "live" | "mock";
  merchantId: string;
  kpis?: ZeMerchantKPIsResponse | null;
  reimbursements?: ZeReimbursementsResponse | null;
  history?: ZeOrderHistoryResponse | null;
  webhooks?: MaybeArray<ZeWebhookConfig>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  })
    .format(Number.isFinite(value) ? value : 0)
    .replace(/\u00a0/g, " ");
}

function formatPercent(value?: string) {
  if (!value) return "0%";
  return `${value.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")}%`;
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildZeOwnerSummary(input: ZeOwnerSummaryInput): ZeOwnerSummary {
  const kpi = input.kpis?.kpis;
  const reimbursementOrders = input.reimbursements?.orders ?? [];
  const historyItems = input.history?.items ?? [];
  const activeWebhook = (input.webhooks ?? []).find((item) => item?.active);
  const modeLabel = input.mode === "live" ? "Modo live" : "Modo mock";

  const validOrders = kpi?.general?.validOrders?.value ?? "0";
  const fillRate = kpi?.general?.fillRate?.value ?? "0";
  const availability = kpi?.general?.merchantAvailabilityRate?.value ?? "0";
  const turboOrders = kpi?.turbo?.validTurboOrders?.value ?? "0";
  const updatedAtLabel = kpi?.updatedDate
    ? new Date(kpi.updatedDate).toLocaleString("pt-BR")
    : "sem atualização";

  const reimbursementTotal = reimbursementOrders.reduce(
    (sum, order) => sum + toNumber(order.total?.orderReimbursement?.value),
    0
  );
  const reimbursementWindow =
    input.reimbursements?.startDate && input.reimbursements?.endDate
      ? `${input.reimbursements.startDate} a ${input.reimbursements.endDate}`
      : "janela não informada";

  const historyCount = historyItems.length;
  const latestHistory = historyItems[0];
  const latestHistoryLabel = latestHistory
    ? `${latestHistory.number ?? "pedido"} · ${latestHistory.status ?? "sem status"}`
    : "sem pedidos";

  const webhookValue = activeWebhook ? "Webhook ativo" : "Webhook inativo";
  const webhookHelper = activeWebhook
    ? `${activeWebhook.endpoint ?? "endpoint não informado"} · ${(activeWebhook.subscriptions ?? []).length} assinatura(s)`
    : "Nenhuma rota cadastrada";

  return {
    modeLabel,
    cards: [
      {
        title: "KPIs",
        value: `${validOrders} ${pluralize(Number(validOrders), "pedido válido", "pedidos válidos")}`,
        helper: `Fill rate ${formatPercent(fillRate)} · disponibilidade ${formatPercent(availability)} · ${updatedAtLabel}`,
        tone: Number(fillRate) >= 95 ? "good" : "default",
      },
      {
        title: "Repasses",
        value: formatMoney(reimbursementTotal),
        helper: `${reimbursementOrders.length} ${pluralize(reimbursementOrders.length, "pedido na janela", "pedidos na janela")} · ${reimbursementWindow}`,
        tone: reimbursementTotal > 0 ? "good" : "default",
      },
      {
        title: "Histórico",
        value: `${historyCount} ${pluralize(historyCount, "pedido finalizado", "pedidos finalizados")}`,
        helper: `Último: ${latestHistoryLabel}`,
        tone: historyCount > 0 ? "default" : "risk",
      },
      {
        title: "Webhooks",
        value: webhookValue,
        helper: webhookHelper,
        tone: activeWebhook ? "good" : "risk",
      },
    ],
  };
}
