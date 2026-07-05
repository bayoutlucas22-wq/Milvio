import type { OwnerDashboardModel } from "@/lib/owner-dashboard";
import type { OwnerMoneyAnalysis } from "@/lib/owner-money-analysis";
import type { OwnerStudy } from "@/lib/owner-study";
import type { ApiMasterclass } from "@/lib/api-masterclass";
import type { ZeOwnerSummary } from "@/lib/ze-delivery-summary";

type MaybeArray<T> = T[] | undefined | null;

type GuideKpiMetric = {
  value?: string;
};

type GuideKpiResponse = {
  kpis?: {
    general?: {
      validOrders?: GuideKpiMetric;
      fillRate?: GuideKpiMetric;
      merchantAvailabilityRate?: GuideKpiMetric;
    };
    turbo?: {
      validTurboOrders?: GuideKpiMetric;
    };
    updatedDate?: string;
  };
};

type GuideReimbursementResponse = {
  orders?: Array<{
    total?: {
      orderReimbursement?: {
        value?: number;
      };
    };
  }>;
};

type GuideHistoryResponse = {
  items?: Array<{
    number?: string;
    status?: string;
    total?: number;
    date?: string;
  }>;
};

type GuideWebhookConfig = {
  endpoint?: string;
  active?: boolean;
  subscriptions?: string[];
};

export type OwnerProfitGuideLever = {
  title: string;
  endpoint: string;
  whyItMatters: string;
  action: string;
  impact: string;
};

export type OwnerProfitGuideStep = {
  title: string;
  description: string;
  result: string;
};

export type OwnerProfitGuideIngestionStep = {
  title: string;
  endpoint: string;
  description: string;
  result: string;
};

export type OwnerProfitGuideProductItem = {
  name: string;
  note: string;
};

export type OwnerProfitGuideProductLens = {
  title: string;
  subtitle: string;
  items: OwnerProfitGuideProductItem[];
  rules: string[];
  endpoints: string[];
};

export type OwnerProfitGuide = {
  title: string;
  subtitle: string;
  heroNote: string;
  ingestionFlow: OwnerProfitGuideIngestionStep[];
  productLens: OwnerProfitGuideProductLens;
  keyLevers: OwnerProfitGuideLever[];
  weeklyPlan: OwnerProfitGuideStep[];
  simpleSteps: OwnerProfitGuideStep[];
  warnings: Array<{
    title: string;
    description: string;
  }>;
  closing: string;
};

type OwnerProfitGuideInput = {
  ownerModel: OwnerDashboardModel;
  apiSummary?: Pick<ZeOwnerSummary, "modeLabel"> | null;
  apiKpi?: GuideKpiResponse | null;
  reimbursements?: GuideReimbursementResponse | null;
  history?: GuideHistoryResponse | null;
  webhooks?: MaybeArray<GuideWebhookConfig>;
  apiMasterclass?: Pick<ApiMasterclass, "formula" | "modeLabel"> | null;
  moneyAnalysis?: Pick<OwnerMoneyAnalysis, "kpis" | "recommendations"> | null;
  ownerStudy?: Pick<OwnerStudy, "profitLab" | "productStudy"> | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

function formatSentence(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildOwnerProfitGuide({
  ownerModel,
  apiSummary,
  apiKpi,
  reimbursements,
  history,
  webhooks,
  apiMasterclass,
  moneyAnalysis,
  ownerStudy,
}: OwnerProfitGuideInput): OwnerProfitGuide {
  const fillRate = apiKpi?.kpis?.general?.fillRate?.value ?? "0";
  const availability = apiKpi?.kpis?.general?.merchantAvailabilityRate?.value ?? "0";
  const validOrders = apiKpi?.kpis?.general?.validOrders?.value ?? "0";
  const turboOrders = apiKpi?.kpis?.turbo?.validTurboOrders?.value ?? "0";
  const reimbursementTotal = (reimbursements?.orders ?? []).reduce(
    (sum, order) => sum + toNumber(order.total?.orderReimbursement?.value),
    0
  );
  const historyCount = history?.items?.length ?? 0;
  const activeWebhook = (webhooks ?? []).find((item) => item?.active);
  const webhookState = activeWebhook ? "ativo" : "desligado";
  const webhookEndpoint = activeWebhook?.endpoint ?? "sem webhook";
  const profitMargin = moneyAnalysis?.kpis?.profitMarginPercent ?? ownerModel.totals.netMarginPercent;
  const trend = moneyAnalysis?.kpis?.revenueTrendPercent ?? 0;
  const weeklyPotential = ownerStudy?.profitLab.weeklyPotential ?? formatMoney(0);
  const formula = apiMasterclass?.formula ?? "Lucro = faturamento - custo - perda";
  const modeLabel = apiSummary?.modeLabel ?? apiMasterclass?.modeLabel ?? "Modo mock";

  const ingestionFlow: OwnerProfitGuideIngestionStep[] = [
    {
      title: "1. Autenticar",
      endpoint: "POST /auth",
      description:
        "A entrada começa aqui. O app pega o token para acessar a API e saber se pode ler os dados da loja.",
      result: "Sem login técnico, não há ingestão confiável.",
    },
    {
      title: "2. Puxar os dados certos",
      endpoint: "GET /orders/{orderNumber}",
      description:
        "Depois da autenticação, o app busca o pedido, os sinais da loja e os indicadores que explicam a operação.",
      result: "É aqui que o dado bruto começa a virar leitura útil.",
    },
    {
      title: "3. Ouvir mudanças",
      endpoint: "PATCH /webhooks",
      description:
        "Quando o webhook está ativo, a API avisa o app na hora que algo muda. Se não estiver, o polling resolve o caminho.",
      result: "A ingestão fica mais rápida e o dono reage antes.",
    },
    {
      title: "4. Normalizar e mostrar",
      endpoint: "App + MySQL",
      description:
        "O sistema organiza o que veio da API, junta com os arquivos e mostra em linguagem de dono, não de técnico.",
      result: "O dado cru vira decisão simples na tela.",
    },
  ];

  const topProducts = ownerStudy?.productStudy?.rows ?? [];
  const productLensItems: OwnerProfitGuideProductItem[] = topProducts.length
    ? topProducts.slice(0, 4).map((row, index) => ({
        name: row.name,
        note:
          index === 0
            ? `Produto campeão do mix, com ${formatMoney(row.total)} e ${row.count} vendas.`
            : `${row.count} vendas e ticket médio de ${formatMoney(row.averageTicket)}.`,
      }))
    : [
        {
          name: "Doritos",
          note: "Exemplo de item de impulso que pode aparecer junto de cerveja, gelo ou petisco.",
        },
        {
          name: "Cerveja",
          note: "Produto de giro que ajuda a puxar volume e ticket.",
        },
        {
          name: "Gelo",
          note: "Item de apoio que vende porque resolve uma dor imediata do cliente.",
        },
        {
          name: "Água",
          note: "Item de reposição com venda constante e fácil de comparar com o restante do mix.",
        },
      ];

  const productLens: OwnerProfitGuideProductLens = {
    title: "O que vende dentro",
    subtitle:
      "A API também ajuda a enxergar o mix de produto. É assim que você entende o que gira, o que empurra caixa e o que precisa ficar disponível.",
    items: productLensItems,
    rules: [
      "Um produto pode aparecer em duas linhas quando existe promoção; a leitura certa usa produto + hasLimitedPromotion.",
      "GET /merchants/{merchantId}/menu/items mostra o catálogo que o cliente vê.",
      "POST /merchants/{merchantId}/products/availability desliga ou liga um item quando falta ou sobra.",
      "POST /merchants/{merchantId}/products/itemOffer ajuda a ajustar preço e oferta do item.",
    ],
    endpoints: [
      "GET /merchants/{merchantId}/menu/items",
      "POST /merchants/{merchantId}/products/availability",
      "POST /merchants/{merchantId}/products/itemOffer",
      "PUT /merchants/{merchantId}/products/items",
    ],
  };

  const keyLevers: OwnerProfitGuideLever[] = [
    {
      title: "1. Entrar na plataforma",
      endpoint: "POST /auth",
      whyItMatters:
        "Sem autenticação, a plataforma não libera a leitura completa nem as ações do app.",
      action:
        "Entenda primeiro o login técnico. É ele que abre o caminho para pedidos, KPIs, histórico e webhooks.",
      impact: "É a porta de entrada para tudo o que vem depois.",
    },
    {
      title: "2. Ver o pedido certo",
      endpoint: "GET /orders/{orderNumber}",
      whyItMatters:
        "Aqui você enxerga o pedido com detalhe antes de confirmar, cancelar ou restaurar.",
      action:
        "Use esse detalhe quando precisar tomar decisão sem adivinhar o status do pedido.",
      impact: "Evita decisão no escuro e reduz erro operacional.",
    },
    {
      title: "3. Ler os KPIs da loja",
      endpoint: "GET /merchants/{merchantId}/kpis",
      whyItMatters:
        `O fill rate está em ${formatPercent(fillRate)} e a disponibilidade em ${formatPercent(availability)}. Esses sinais dizem se a loja está deixando pedido escapar.`,
      action:
        "Abra esse número todo dia. Se cair, a prioridade é operação, estoque e tempo de resposta.",
      impact: "Mostra se a loja está pronta para vender ou só funcionando pela metade.",
    },
    {
      title: "4. Receber evento na hora",
      endpoint: "PATCH /webhooks",
      whyItMatters:
        `Webhook ${webhookState} em ${webhookEndpoint}. Isso ajuda a reagir sem esperar o painel atualizar.`,
      action:
        "Se o webhook estiver ativo, a loja reage mais rápido e com menos retrabalho.",
      impact: "Menos atraso, menos confusão e menos decisão tarde demais.",
    },
    {
      title: "5. Usar polling como plano B",
      endpoint: "GET /events:polling",
      whyItMatters:
        "Quando webhook ainda não está pronto, o polling mantém a leitura viva e evita que a loja fique cega.",
      action:
        "Leia os eventos e envie o acknowledgment depois de processar, para não ver a mesma coisa duas vezes.",
      impact: "Mantém a operação atualizada mesmo sem tempo real.",
    },
    {
      title: "6. Conferir repasses e histórico",
      endpoint: "GET /merchants/{merchantId}/reimbursements/orders/summaries",
      whyItMatters:
        `A restituição de hoje soma ${formatMoney(reimbursementTotal)} e o histórico já mostra ${historyCount} pedidos finalizados.`,
      action:
        "Use esse bloco para entender onde o dinheiro voltou, onde o pedido repetiu padrão e o que vale ajustar.",
      impact: "Ajuda a fechar a conta e repetir o que dá resultado.",
    },
    {
      title: "7. Proteger estoque e cardápio",
      endpoint: "POST /merchants/{merchantId}/availability",
      whyItMatters:
        "Quando produto some ou fica indisponível, o pedido trava e a margem vai embora sem barulho.",
      action:
        "Feche o que não pode vender, atualize itens e cuide dos campeões de venda primeiro.",
      impact: "Menos ruptura, menos pedido perdido e mais venda certa.",
    },
  ];

  const weeklyPlan: OwnerProfitGuideStep[] = [
    {
      title: "Entender a plataforma antes de mexer",
      description:
        "A primeira missão é saber o que a plataforma mostra: pedido, evento, repasse, histórico e KPI.",
      result: `Hoje a operação tem ${validOrders} pedidos válidos e ${turboOrders} turbo para acompanhar.`,
    },
    {
      title: "Usar a guia para achar o vazamento",
      description:
        `Se a margem está em ${formatPercent(String(profitMargin))}, cada vazamento pesa. A próxima ação é reduzir restituição, falha e atraso.`,
      result: "Você para de atacar tudo e foca no que tira dinheiro.",
    },
    {
      title: "Conectar a leitura certa no dia a dia",
      description:
        `Se o webhook estiver ${webhookState}, mantenha isso ativo. Se não, use /events:polling e confirme com /events/acknowledgment.`,
      result: "A operação reage mais rápido e com menos retrabalho.",
    },
    {
      title: "Revisar o ganho da semana",
      description:
        `Depois de sete dias, compare lucro, margem e receita. A projeção do estudo aponta potencial de ${weeklyPotential}.`,
      result: "Você enxerga o que melhorou e repete o acerto.",
    },
  ];

  const simpleSteps: OwnerProfitGuideStep[] = [
    {
      title: "Passo 1: entender a foto da loja",
      description:
        "Abra a visão principal e veja se a conta está fechada. Se estiver incompleta, não force leitura de lucro final.",
      result: `Use ${formatPercent(fillRate)} e a disponibilidade como termômetro.`,
    },
    {
      title: "Passo 2: achar onde o dinheiro sai",
      description: "Olhe restituição, entrega e histórico. É aqui que muita loja perde caixa sem perceber.",
      result: `A conta precisa explicar os ${formatMoney(reimbursementTotal)} e o custo da operação.`,
    },
    {
      title: "Passo 3: agir no que traz lucro",
      description: formatSentence(formula),
      result: "Menos perda, mais margem e mais clareza.",
    },
  ];

  const warnings = [
    {
      title: "Não corra para o pedido sem ler o detalhe",
      description:
        "Quando um pedido dá problema, use /orders/{orderNumber} antes de confirmar ou cancelar. Isso evita decisão no impulso.",
    },
    {
      title: "Não ignore eventos",
      description:
        "Se a loja depende de atualização rápida, polling sem acknowledgment pode te fazer ver a mesma coisa duas vezes.",
    },
    {
      title: "Não trate lucro como chute",
      description:
        "Se faltar base, o sistema já avisa. Melhor mostrar a verdade do que inventar número bonito.",
    },
  ];

  return {
    title: "O que a Zé API faz",
    subtitle: "Como a plataforma funciona",
    heroNote:
      "Tudo sem complicar: veja o que a plataforma entrega, como o app ajuda na leitura e por que isso melhora a decisão do dono.",
    ingestionFlow,
    productLens,
    keyLevers,
    weeklyPlan,
    simpleSteps,
    warnings,
    closing:
      `Quando você usa o aplicativo com calma, o lucro deixa de ser sorte. O modo atual está em ${modeLabel} e a próxima ação mais segura é proteger margem, reduzir perda e repetir o que já funciona.`,
  };
}
