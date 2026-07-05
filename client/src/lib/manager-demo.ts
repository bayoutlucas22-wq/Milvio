export type ManagerDemoKpi = {
  label: string;
  value: string;
  helper: string;
  tone: "good" | "risk" | "default";
};

export type ManagerDemoAction = {
  title: string;
  description: string;
};

export type ManagerDemoSnapshot = {
  title: string;
  subtitle: string;
  kpis: ManagerDemoKpi[];
  actions: ManagerDemoAction[];
  playbook: Array<{
    step: string;
    description: string;
  }>;
};

export type ManagerDemoInput = {
  ownerModel?: {
    totals: {
      grossRevenue: number;
      netMargin: number;
      netMarginPercent: number;
      productCosts: number;
      deliveryCosts: number;
      platformCommissions: number;
      restitutionTotal: number;
      criticalStockCount: number;
      lateOrders: number;
      waitingOrders: number;
      totalOrders?: number;
      totalOrdersToday?: number;
    };
  };
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace(/\u00a0/g, " ");
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function buildFallbackSnapshot(): ManagerDemoSnapshot {
  const sales = 18450;
  const productCost = 8420;
  const deliveryCost = 880;
  const platformFees = 2890;
  const losses = 1380;
  const profit = sales - productCost - deliveryCost - platformFees - losses;
  const margin = (profit / sales) * 100;
  const problemOrders = 7;

  return {
    title: "Painel do gestor",
    subtitle: "Mostra quanto entra, quanto sai e onde mexer para sobrar mais dinheiro no fim do dia.",
    kpis: [
      {
        label: "Vendas de hoje",
        value: formatMoney(sales),
        helper: "dinheiro que entrou no caixa",
        tone: "good",
      },
      {
        label: "Lucro estimado",
        value: formatMoney(profit),
        helper: "o que sobra depois de pagar tudo",
        tone: profit >= 0 ? "good" : "risk",
      },
      {
        label: "Pedidos com problema",
        value: String(problemOrders),
        helper: "cancelados, atrasados ou com falta de produto",
        tone: problemOrders > 0 ? "risk" : "good",
      },
      {
        label: "Margem média",
        value: formatPercent(margin),
        helper: "quanto fica de cada R$ 100 vendidos",
        tone: margin >= 20 ? "good" : "default",
      },
    ],
    actions: [
      {
        title: "Reduzir cancelamentos",
        description: "Hoje existem 7 pedidos com problema. Reduzir cancelamentos, rever estoque, confirmar rápido e evitar erro de separação traz ganho direto.",
      },
      {
        title: "Evitar atraso na entrega",
        description: "Quando a entrega atrasa, o cliente reclama e a margem cai. O foco aqui é preparar antes e sair no horário.",
      },
      {
        title: "Vender mais produtos de boa margem",
        description: "Os itens certos dão mais lucro. Destaque produtos que vendem bem e deixam mais dinheiro para a loja.",
      },
    ],
    playbook: [
      {
        step: "1. Proteger o que já entra",
        description: "Primeiro não perder pedido: estoque certo, pedido certo e entrega certa.",
      },
      {
        step: "2. Cortar o que sobra menos",
        description: "Depois reduzir frete, taxa e desperdício para cada venda render mais.",
      },
      {
        step: "3. Crescer com controle",
        description: "Só então vender mais, porque crescer sem controle aumenta o trabalho e não aumenta o lucro.",
      },
    ],
  };
}

export function buildManagerDemoSnapshot(input?: ManagerDemoInput): ManagerDemoSnapshot {
  const totals = input?.ownerModel?.totals;
  if (!totals) return buildFallbackSnapshot();

  const sales = totals.grossRevenue;
  const profit = totals.netMargin;
  const margin = totals.netMarginPercent;
  const operationalSpend = totals.productCosts + totals.deliveryCosts + totals.platformCommissions;
  const problemOrders = totals.lateOrders + totals.waitingOrders + totals.criticalStockCount;
  const deliveryShare = sales > 0 ? (totals.deliveryCosts / sales) * 100 : 0;
  const platformShare = sales > 0 ? (totals.platformCommissions / sales) * 100 : 0;
  const recoveredShare = sales > 0 ? (totals.restitutionTotal / sales) * 100 : 0;

  return {
    title: "Painel do gestor",
    subtitle: `Nos arquivos importados, entraram ${formatMoney(sales)} e sobraram ${formatMoney(profit)}. A leitura mostra onde o dinheiro saiu e o que mexer para sobrar mais.`,
    kpis: [
      {
        label: "Vendas do período",
        value: formatMoney(sales),
        helper: "dinheiro que entrou no caixa",
        tone: "good",
      },
      {
        label: "Lucro estimado",
        value: formatMoney(profit),
        helper: "o que sobra depois de pagar tudo",
        tone: profit >= 0 ? "good" : "risk",
      },
      {
        label: "Custo operacional",
        value: formatMoney(operationalSpend),
        helper: "produto + entrega + taxa de plataforma",
        tone: operationalSpend > sales * 0.8 ? "risk" : "default",
      },
      {
        label: "Pedidos com problema",
        value: String(problemOrders),
        helper: "atrasos, fila e estoque crítico",
        tone: problemOrders > 0 ? "risk" : "good",
      },
    ],
    actions: [
      {
        title: "Reduzir cancelamentos",
        description: `Há ${totals.lateOrders} pedidos atrasados e ${totals.waitingOrders} esperando saída. Menos problema significa mais caixa no fim do dia.`,
      },
      {
        title: "Diminuir custo de entrega",
        description: `A entrega consome ${formatMoney(totals.deliveryCosts)} do resultado, cerca de ${formatPercent(deliveryShare)} do faturamento. Ganho rápido vem de sair mais certo e com menos retrabalho.`,
      },
      {
        title: "Proteger a margem",
        description: `A taxa de plataforma pesa ${formatPercent(platformShare)} e a restituição recupera ${formatPercent(recoveredShare)}. O lucro melhora quando o custo cai antes do volume crescer.`,
      },
    ],
    playbook: [
      {
        step: "1. Proteger o que já entra",
        description: `O caixa hoje vendeu ${formatMoney(sales)}. O foco é não perder pedido, porque cada erro vira custo.`,
      },
      {
        step: "2. Cortar o que sobra menos",
        description: `Com ${formatMoney(totals.productCosts)} em produto e ${formatMoney(totals.deliveryCosts)} em entrega, a economia mais rápida vem de reduzir perda e atraso.`,
      },
      {
        step: "3. Crescer com controle",
        description: `Só depois vale aumentar volume. Com margem de ${formatPercent(margin)}, crescer sem controle pode aumentar movimento sem aumentar lucro.`,
      },
    ],
  };
}
