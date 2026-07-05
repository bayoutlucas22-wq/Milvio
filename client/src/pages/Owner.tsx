import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { dateRangeLabel, money, pct } from "@/features/profit/format";
import { buildApiMasterclass } from "@/lib/api-masterclass";
import { mergeImportCatalog } from "@/lib/import-catalog";
import { buildOwnerDashboardModel, buildOwnerRecommendations } from "@/lib/owner-dashboard";
import { buildOwnerMoneyAnalysis } from "@/lib/owner-money-analysis";
import { buildOwnerProfitGuide } from "@/lib/owner-profit-guide";
import { buildOwnerStudy } from "@/lib/owner-study";
import {
  clearOwnerTourCompleted,
  clearOwnerGuideTourCompleted,
  markOwnerGuideTourCompleted,
  markOwnerTourCompleted,
  OWNER_GUIDE_TOUR_STEPS,
  OWNER_TOUR_STEPS,
  shouldAutoStartOwnerTour,
} from "@/lib/owner-tour";
import { trpc } from "@/lib/trpc";
import {
  Boxes,
  ChevronRight,
  DollarSign,
  Info,
  History,
  Lightbulb,
  ExternalLink,
  Route,
  RefreshCcw,
  TrendingUp,
  Webhook,
  Truck,
  Warehouse,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { buildManagerDemoSnapshot } from "@/lib/manager-demo";
import { buildZeOwnerSummary } from "@/lib/ze-delivery-summary";
import { OwnerTourBot } from "@/components/owner-tour-bot";

function StatCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: typeof TrendingUp;
  tone?: "default" | "good" | "risk";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "risk"
        ? "border-red-200 bg-red-50/70"
        : "border-stone-200 bg-white";

  return (
    <Card className={`rounded-xl shadow-none ${toneClass}`}>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
        <div className="space-y-1">
          <CardDescription className="text-xs font-semibold uppercase tracking-wider">
            {title}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{helper}</CardContent>
    </Card>
  );
}

function count(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function buildRollingWindow(days = 7) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(days - 1, 0));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function Owner() {
  const { isAuthenticated } = useAuth();
  const [showBasePartialHelp, setShowBasePartialHelp] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [merchantIds, setMerchantIds] = useState("");
  const [tourIndex, setTourIndex] = useState(-1);
  const [guideTourIndex, setGuideTourIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<"summary" | "guide">("summary");

  const summariesQuery = trpc.imports.getLatestSummaries.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const executiveQuery = trpc.dashboard.getExecutiveSummary.useQuery(
    { limit: 7 },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const operationalQuery = trpc.dashboard.getOperationalMetrics.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const financialQuery = trpc.dashboard.getFinancialMetrics.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const criticalStockQuery = trpc.products.getCritical.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const apiCredentialsQuery = trpc.api.getCredentials.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const apiConnectionMode = apiCredentialsQuery.data
    ? apiCredentialsQuery.data.clientId && apiCredentialsQuery.data.clientSecret
      ? "live"
      : "mock"
    : "mock";
  const merchantId = apiCredentialsQuery.data?.merchantIds?.[0] ?? "demo-merchant";
  const apiKpiQuery = trpc.api.getMerchantKPIs.useQuery(
    { merchantId, forceRefresh: false },
    {
      enabled: isAuthenticated && Boolean(merchantId),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const reimbursementWindow = buildRollingWindow(7);
  const reimbursementQuery = trpc.api.getReimbursementSummaries.useQuery(
    {
      merchantId,
      startDate: reimbursementWindow.startDate,
      endDate: reimbursementWindow.endDate,
      page: 1,
      pageSize: 5,
    },
    {
      enabled: isAuthenticated && Boolean(merchantId),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const historyQuery = trpc.api.getOrderHistory.useQuery(
    {
      merchantId,
      page: 1,
      pageSize: 5,
      sort: "desc",
    },
    {
      enabled: isAuthenticated && Boolean(merchantId),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const webhooksQuery = trpc.api.getWebhooks.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const saveCredentialsMutation = trpc.api.setCredentials.useMutation({
    onSuccess: async () => {
      await apiCredentialsQuery.refetch();
    },
  });
  const verifyCredentialsMutation = trpc.api.verifyCredentials.useMutation();

  const summaries = summariesQuery.data ?? {};
  const ownerModel = buildOwnerDashboardModel({
    summaries,
    operational: operationalQuery.data,
    financial: financialQuery.data,
    criticalStockCount: criticalStockQuery.data?.length ?? 0,
  });
  const recommendations = buildOwnerRecommendations(ownerModel);
  const latestClosing = executiveQuery.data?.latestClosing;
  const mergedFiles = mergeImportCatalog(ownerModel.importCatalog);
  const validationTone = ownerModel.readingMode === "lucro_real" ? "good" : "risk";
  const apiKpi = apiKpiQuery.data;
  const apiSummary = buildZeOwnerSummary({
    mode: apiConnectionMode,
    merchantId,
    kpis: apiKpiQuery.data,
    reimbursements: reimbursementQuery.data,
    history: historyQuery.data,
    webhooks: webhooksQuery.data?.webhooks,
  });
  const managerDemo = buildManagerDemoSnapshot({ ownerModel });
  const apiMasterclass = buildApiMasterclass({
    ownerModel,
    apiSummary,
    apiKpi: apiKpiQuery.data,
  });
  const moneyAnalysis = buildOwnerMoneyAnalysis({
    model: ownerModel,
    history: executiveQuery.data?.history ?? [],
  });
  const monthlyIntelligence = (summaries["excel_ingest:monthly_restitution_intelligence"] as any) ?? null;
  const ownerStudy = buildOwnerStudy({
    model: ownerModel,
    ordersSummary: ownerModel.ordersSummary,
    monthlyIntelligence,
  });
  const profitGuide = buildOwnerProfitGuide({
    ownerModel,
    apiSummary,
    apiKpi: apiKpiQuery.data,
    reimbursements: reimbursementQuery.data,
    history: historyQuery.data,
    webhooks: webhooksQuery.data?.webhooks,
    apiMasterclass,
    moneyAnalysis,
    ownerStudy,
  });
  const studyOrderCount = Math.max(
    ownerModel.totals.totalOrders || ownerModel.totals.deliveredOrders || latestClosing?.totalOrders || moneyAnalysis.chartRows[0]?.orders || 1,
    1
  );
  const studyMetrics = [
    {
      title: "Lucro por pedido",
      value: money(ownerModel.totals.netMargin / studyOrderCount),
      helper: "quanto sobra em cada venda",
      icon: DollarSign,
      tone: ownerModel.totals.netMargin >= 0 ? "good" : "risk",
    },
    {
      title: "Custo por pedido",
      value: money(ownerModel.totals.finalOperationalCost / studyOrderCount),
      helper: "quanto custa operar cada pedido",
      icon: Truck,
      tone: "risk",
    },
    {
      title: "Perda por pedido",
      value: money(ownerModel.totals.restitutionTotal / studyOrderCount),
      helper: "cancelamento, correção e devolução",
      icon: Info,
      tone: "risk",
    },
    {
      title: "Ticket médio",
      value: money(ownerModel.totals.grossRevenue / studyOrderCount),
      helper: "receita média por pedido",
      icon: Boxes,
      tone: "good",
    },
  ] as const;
  const summaryIconByTitle: Record<string, typeof TrendingUp> = {
    KPIs: TrendingUp,
    Repasses: DollarSign,
    Histórico: History,
    Webhooks: Webhook,
  };
  const moneyTrendConfig = {
    revenue: {
      label: "Faturamento",
      color: "hsl(var(--chart-2))",
    },
    profit: {
      label: "Lucro",
      color: "hsl(var(--chart-4))",
    },
  } as const;
  const moneyBucketConfig = {
    productCosts: {
      label: "Custo da loja",
      color: "hsl(var(--chart-3))",
    },
    deliveryCosts: {
      label: "Entrega",
      color: "hsl(var(--chart-2))",
    },
    platformCommissions: {
      label: "Plataforma",
      color: "hsl(var(--chart-5))",
    },
    refunds: {
      label: "Perdas / restituição",
      color: "hsl(var(--chart-1))",
    },
    netMargin: {
      label: "Lucro líquido",
      color: "hsl(var(--chart-4))",
    },
  } as const;
  const productStudyConfig = {
    total: {
      label: "Receita por produto",
      color: "hsl(var(--chart-2))",
    },
  } as const;
  const monthlyStudyConfig = {
    totalNetMargin: {
      label: "Lucro",
      color: "hsl(var(--chart-4))",
    },
    restitutionTotal: {
      label: "Restituição",
      color: "hsl(var(--chart-1))",
    },
  } as const;
  const tourActive = tourIndex >= 0;
  const activeTourStep = tourActive ? OWNER_TOUR_STEPS[tourIndex] : null;
  const guideTourActive = guideTourIndex >= 0;
  const activeGuideTourStep = guideTourActive ? OWNER_GUIDE_TOUR_STEPS[guideTourIndex] : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (shouldAutoStartOwnerTour(window.localStorage)) {
      setTourIndex(0);
    }
  }, []);

  useEffect(() => {
    if (!tourActive || !activeTourStep) return;
    const target = document.querySelector(`[data-owner-tour-target="${activeTourStep.target}"]`) as HTMLElement | null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeTourStep, tourActive]);

  useEffect(() => {
    if (!guideTourActive || !activeGuideTourStep) return;
    const target = document.querySelector(`[data-owner-tour-target="${activeGuideTourStep.target}"]`) as HTMLElement | null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeGuideTourStep, guideTourActive]);

  const finishTour = () => {
    if (typeof window !== "undefined") {
      markOwnerTourCompleted(window.localStorage);
    }
    setTourIndex(-1);
  };

  const finishGuideTour = () => {
    if (typeof window !== "undefined") {
      markOwnerGuideTourCompleted(window.localStorage);
    }
    setGuideTourIndex(-1);
  };

  const closeTour = () => {
    finishTour();
  };

  const closeGuideTour = () => {
    finishGuideTour();
  };

  const nextTourStep = () => {
    if (tourIndex >= OWNER_TOUR_STEPS.length - 1) {
      finishTour();
      return;
    }
    setTourIndex((current) => Math.min(current + 1, OWNER_TOUR_STEPS.length - 1));
  };

  const nextGuideTourStep = () => {
    if (guideTourIndex >= OWNER_GUIDE_TOUR_STEPS.length - 1) {
      finishGuideTour();
      return;
    }
    setGuideTourIndex((current) => Math.min(current + 1, OWNER_GUIDE_TOUR_STEPS.length - 1));
  };

  const previousTourStep = () => {
    setTourIndex((current) => Math.max(current - 1, 0));
  };

  const previousGuideTourStep = () => {
    setGuideTourIndex((current) => Math.max(current - 1, 0));
  };

  const restartTour = () => {
    if (typeof window !== "undefined") {
      clearOwnerTourCompleted(window.localStorage);
    }
    setTourIndex(0);
  };

  const restartGuideTour = () => {
    if (typeof window !== "undefined") {
      clearOwnerGuideTourCompleted(window.localStorage);
    }
    setGuideTourIndex(0);
  };

  const startTour = () => {
    if (typeof window !== "undefined") {
      clearOwnerTourCompleted(window.localStorage);
    }
    setGuideTourIndex(-1);
    setActiveTab("summary");
    setTourIndex(0);
  };

  const startGuideTour = () => {
    if (typeof window !== "undefined") {
      clearOwnerGuideTourCompleted(window.localStorage);
    }
    setTourIndex(-1);
    setActiveTab("guide");
    setGuideTourIndex(0);
  };

  const tourTargetClass = (target: string) =>
    activeTourStep?.target === target && tourActive
      ? "ring-2 ring-sky-400 ring-offset-4 ring-offset-stone-50 shadow-[0_0_0_1px_rgba(14,165,233,0.2)]"
      : "";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_24%),linear-gradient(180deg,#fbfaf7_0%,#f4efe6_100%)] text-stone-950">
      <div className="pointer-events-none absolute left-[-6rem] top-20 h-64 w-64 rounded-full bg-amber-200/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-4rem] top-32 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header
          data-owner-tour-target="hero"
          className={`flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-center lg:justify-between ${tourTargetClass("hero")}`}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" className="h-8 rounded-full bg-emerald-600 px-3 text-white hover:bg-emerald-700">
                <a href="/api/docs" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
                  Swagger
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={validationTone === "good" ? "secondary" : "outline"} className="cursor-help">
                    {ownerModel.readingMode === "lucro_real" ? "Conta fechada" : "Conta incompleta"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {ownerModel.readingMode === "lucro_real"
                    ? "Os arquivos principais já estão dentro."
                    : "Falta um arquivo importante para fechar a conta."}
                </TooltipContent>
              </Tooltip>
              <Badge variant="outline">
                {ownerModel.importCatalog.length} arquivos importados
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Resumo do dono</h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Esta é a página para entender, em poucos segundos, se o negócio está dando lucro ou só fazendo movimento.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={startTour}>
              <Route className="h-4 w-4" />
              Tour
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void summariesQuery.refetch();
                void executiveQuery.refetch();
                void operationalQuery.refetch();
                void financialQuery.refetch();
                void criticalStockQuery.refetch();
              }}
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "summary" | "guide")} className="space-y-5">
          <TabsList className="w-fit rounded-full border border-stone-200 bg-white/85 p-1 shadow-sm">
            <TabsTrigger value="summary">Resumo do dono</TabsTrigger>
            <TabsTrigger value="guide">Guia da operação</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
        <Card
          data-owner-tour-target="metrics"
          className={`rounded-2xl border-emerald-200 bg-emerald-50/80 shadow-none ${tourTargetClass("metrics")}`}
        >
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="rounded-full cursor-help">
                      {ownerModel.readingMode === "lucro_real" ? "Conta fechada" : "Conta incompleta"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {ownerModel.readingMode === "lucro_real"
                      ? "Pode confiar mais no número."
                      : "A tela ainda ajuda, mas não fecha o lucro final."}
                  </TooltipContent>
                </Tooltip>
                <span className="text-sm font-medium text-stone-700">
                  {ownerModel.readingMode === "lucro_real"
                    ? "Conta fechada. Os arquivos principais já estão dentro."
                    : "Ainda falta arquivo importante. A tela ajuda, mas não fecha o lucro final."}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setShowBasePartialHelp(true)}>
                <Info className="h-4 w-4" />
                Entender
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Lucro"
            value={money(latestClosing?.totalNetMargin ?? ownerModel.totals.netMargin)}
            helper="o que sobra depois de pagar tudo"
            icon={TrendingUp}
            tone={ownerModel.totals.netMargin >= 0 ? "good" : "risk"}
          />
          <StatCard
            title="Margem"
            value={pct(latestClosing?.netMarginPercent ?? ownerModel.totals.netMarginPercent)}
            helper="quanto fica de cada venda"
            icon={DollarSign}
            tone={ownerModel.totals.netMarginPercent >= 10 ? "good" : "risk"}
          />
          <StatCard
            title="Faturamento"
            value={money(ownerModel.totals.grossRevenue || latestClosing?.grossRevenue || 0)}
            helper="dinheiro que entrou"
            icon={Boxes}
          />
          <StatCard
            title="Custo final"
            value={money(ownerModel.totals.finalOperationalCost || 0)}
            helper="gasto da loja + entrega"
            icon={Truck}
          />
        </section>

        <section
          data-owner-tour-target="manager-story"
          className={`space-y-4 rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-none ${tourTargetClass("manager-story")}`}
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge className="w-fit rounded-full bg-amber-600 px-3 py-1 text-white">Mock data do gestor</Badge>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">{managerDemo.title}</h2>
                <p className="max-w-3xl text-sm text-stone-700">{managerDemo.subtitle}</p>
              </div>
            </div>
            <p className="max-w-xl text-sm text-stone-600">
              Aqui a gente não fala em KPI difícil. A ideia é mostrar onde o dinheiro entra, onde ele some e o que fazer para sobrar mais.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {managerDemo.kpis.map((kpi) => (
              <StatCard
                key={kpi.label}
                title={kpi.label}
                value={kpi.value}
                helper={kpi.helper}
                tone={kpi.tone}
                icon={kpi.label === "Lucro estimado" ? DollarSign : kpi.label === "Pedidos com problema" ? Truck : kpi.label === "Margem média" ? TrendingUp : Boxes}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
            <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
              <CardHeader>
                <CardTitle>O que fazer para ganhar mais</CardTitle>
                <CardDescription>Passos simples para um gestor tomar decisão hoje.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {managerDemo.actions.map((action) => (
                  <div key={action.title} className="rounded-xl border bg-stone-50 p-4">
                    <p className="font-semibold">{action.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
              <CardHeader>
                <CardTitle>Plano simples</CardTitle>
                <CardDescription>Três passos para melhorar o ganho sem complicar a operação.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {managerDemo.playbook.map((item) => (
                  <div key={item.step} className="flex gap-3 rounded-xl border bg-stone-50 p-4">
                    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold">{item.step}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section
          data-owner-tour-target="xls-study"
          className={`space-y-4 rounded-3xl border border-amber-200 bg-gradient-to-br from-white via-amber-50/70 to-sky-50/50 p-5 shadow-none ${tourTargetClass("xls-study")}`}
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge className="w-fit rounded-full bg-amber-600 px-3 py-1 text-white">Estudo dos XLS</Badge>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Como cada pedido ensina a loja a lucrar</h2>
                <p className="max-w-3xl text-sm text-stone-700">
                  Esta parte traduz os arquivos em aula de gestão: quanto sobra por pedido, quanto custa operar e onde o caixa escapa.
                </p>
              </div>
            </div>
            <div className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700">
              {ownerModel.importCatalog.length} arquivos · {studyOrderCount} pedidos
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {studyMetrics.map((metric) => (
              <StatCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                helper={metric.helper}
                icon={metric.icon}
                tone={metric.tone}
              />
            ))}
          </div>

          {ownerStudy.monthlyTrend.isMonthRange ? (
            <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
              <CardHeader>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Leitura por meses</CardTitle>
                    <CardDescription>
                      Apenas os XLS com janela de meses entram aqui; recorte curto fica como apoio operacional.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {dateRangeLabel(ownerStudy.monthlyTrend.dateFrom, ownerStudy.monthlyTrend.dateTo)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Base lida</p>
                    <p className="mt-2 text-2xl font-semibold">{count(ownerStudy.monthlyTrend.source.fileCount)} arquivos</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {count(ownerStudy.monthlyTrend.source.importedRows)} linhas processadas
                    </p>
                  </div>
                  <div className="rounded-xl border bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dias confiáveis</p>
                    <p className="mt-2 text-2xl font-semibold">{count(ownerStudy.monthlyTrend.source.uniqueDays)} dias</p>
                    <p className="mt-1 text-sm text-muted-foreground">Depois de remover repetição de semanas.</p>
                  </div>
                  <div className="rounded-xl border bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Perda por R$100</p>
                    <p className="mt-2 text-2xl font-semibold">{money(ownerStudy.monthlyTrend.restitutionPer100Revenue)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Quanto a restituição pesa a cada R$100 vendidos.</p>
                  </div>
                  <div className="rounded-xl border bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Média diária</p>
                    <p className="mt-2 text-2xl font-semibold">{money(ownerStudy.monthlyTrend.averageDailyRestitution)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Valor médio de restituição por dia analisado.</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
                  <ChartContainer config={monthlyStudyConfig} className="h-[260px] w-full">
                    <LineChart data={ownerStudy.monthlyTrend.months} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => money(Number(value))}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        dataKey="totalNetMargin"
                        type="monotone"
                        stroke="var(--color-totalNetMargin)"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                      <Line
                        dataKey="restitutionTotal"
                        type="monotone"
                        stroke="var(--color-restitutionTotal)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ChartContainer>

                  <div className="grid gap-3">
                  <div className="rounded-xl border bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Melhor mês</p>
                    <p className="mt-2 font-semibold">
                      {ownerStudy.monthlyTrend.bestMonth?.label} · {money(ownerStudy.monthlyTrend.bestMonth?.totalNetMargin ?? 0)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use esse mês como modelo: mix, custo e perda estavam mais favoráveis.
                    </p>
                  </div>
                  <div className="rounded-xl border bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mês para corrigir</p>
                    <p className="mt-2 font-semibold">
                      {ownerStudy.monthlyTrend.weakestMonth?.label} · {money(ownerStudy.monthlyTrend.weakestMonth?.totalNetMargin ?? 0)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{ownerStudy.monthlyTrend.story}</p>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
            <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
              <CardHeader>
                <CardTitle>Os três movimentos que aumentam lucro</CardTitle>
                <CardDescription>O ganho vem quando o dono mexe no custo certo, na hora certa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">1. Vender melhor</p>
                  <p className="mt-2 font-semibold">
                    Cada pedido traz em média {money(ownerModel.totals.grossRevenue / studyOrderCount)}.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Se o ticket sobe sem aumentar o custo no mesmo ritmo, o lucro acompanha.
                  </p>
                </div>
                <div className="rounded-xl border bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">2. Gastar menos</p>
                  <p className="mt-2 font-semibold">
                    O custo final por pedido fica em {money(ownerModel.totals.finalOperationalCost / studyOrderCount)}.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Melhor rota, compra melhor e menos retrabalho deixam mais dinheiro no caixa.
                  </p>
                </div>
                <div className="rounded-xl border bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">3. Perder menos</p>
                  <p className="mt-2 font-semibold">
                    A restituição pesa {money(ownerModel.totals.restitutionTotal / studyOrderCount)} por pedido.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Menos cancelamento, menos erro e menos ruptura viram lucro sem vender mais.
                  </p>
                </div>
                <div className="rounded-xl border border-dashed bg-amber-50 p-4 text-sm text-amber-900">
                  Um real economizado por pedido vira aproximadamente {money(moneyAnalysis.kpis.averageOrders * 7)} por semana.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
              <CardHeader>
                <CardTitle>Produtos que puxam o caixa</CardTitle>
                <CardDescription>Quem vende mais ajuda a revelar onde vale insistir e onde vale ajustar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ChartContainer config={productStudyConfig} className="h-[280px] w-full">
                  <BarChart
                    data={[...ownerStudy.productStudy.rows].slice(0, 5).reverse()}
                    layout="vertical"
                    margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => money(Number(value))}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <Bar dataKey="total" radius={[0, 10, 10, 0]}>
                      {[...ownerStudy.productStudy.rows].slice(0, 5).reverse().map((row) => (
                        <Cell key={row.name} fill="var(--color-total)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>

                <div className="grid gap-3">
                  <div className="rounded-xl border bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Produto campeão</p>
                    <p className="mt-2 font-semibold">
                      {ownerStudy.productStudy.bestProduct?.name ?? "Sem dados"} · {money(ownerStudy.productStudy.bestProduct?.total ?? 0)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {ownerStudy.productStudy.bestProduct
                        ? `${ownerStudy.productStudy.bestProduct.count} vendas · ticket médio de ${money(ownerStudy.productStudy.bestProduct.averageTicket)}`
                        : "Não há produto suficiente para estudar."}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Produto para recuperar</p>
                    <p className="mt-2 font-semibold">
                      {ownerStudy.productStudy.weakestProduct?.name ?? "Sem dados"} · {money(ownerStudy.productStudy.weakestProduct?.total ?? 0)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{ownerStudy.productStudy.story}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
              <CardHeader>
                <CardTitle>Profit Lab</CardTitle>
                <CardDescription>Simulações para mostrar onde o lucro cresce mais rápido.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ownerStudy.profitLab.cards.map((scenario) => (
                  <div key={scenario.title} className="rounded-xl border bg-stone-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">{scenario.title}</p>
                      <Badge variant={scenario.tone === "good" ? "secondary" : "outline"}>{scenario.gain}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{scenario.description}</p>
                  </div>
                ))}
                <div className="rounded-xl border border-dashed bg-amber-50 p-4 text-sm text-amber-900">
                  Potencial combinado no estudo: {ownerStudy.profitLab.weeklyPotential}
                </div>
                <div className="space-y-3 pt-2">
                  {ownerStudy.profitLab.playbook.map((item) => (
                    <div key={item.title} className="rounded-xl border bg-white p-4">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
            <CardHeader>
              <CardTitle>Como os XLS entram na leitura</CardTitle>
              <CardDescription>Os relatórios certos fecham a conta sem adivinhação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mergedFiles.slice(0, 4).map((file) => (
                <div key={file.reportType} className="rounded-xl border bg-stone-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold">{file.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.fileCount} arquivos · {file.totalRows} linhas · {dateRangeLabel(file.dateFrom, file.dateTo)}
                      </p>
                    </div>
                    <Badge variant="outline">{file.reportType}</Badge>
                  </div>
                </div>
              ))}
              {!mergedFiles.length ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhum XLS consolidado ainda.
                </div>
              ) : null}
              <div className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">
                A leitura fica mais forte quando o import entrega pedidos, entregadores e restituição no mesmo painel.
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 text-sky-700">
                Análise do dinheiro
              </Badge>
              <h2 className="text-2xl font-semibold tracking-tight">Onde entra, onde sai e o que sobrar</h2>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Aqui o gestor enxerga o filme inteiro: vendas ao longo do tempo, peso dos custos e as alavancas que mais ajudam a ganhar.
              </p>
            </div>
            <div className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
              {moneyAnalysis.chartRows.length} dias analisados
            </div>
          </div>

          <Card className="rounded-3xl border-sky-100 shadow-none">
            <CardHeader>
              <CardTitle>Faturamento e lucro na linha do tempo</CardTitle>
              <CardDescription>
                A receita mostra o movimento. O lucro mostra quanto realmente sobra.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChartContainer config={moneyTrendConfig} className="h-[320px] w-full">
                <LineChart data={moneyAnalysis.chartRows} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={80}
                    tickFormatter={(value) => money(Number(value))}
                  />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Faturamento"
                    stroke="var(--color-revenue)"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Lucro"
                    stroke="var(--color-profit)"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Receita total
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{money(moneyAnalysis.kpis.revenueTotal)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Média diária de {money(moneyAnalysis.kpis.revenueTotal / Math.max(moneyAnalysis.chartRows.length, 1))}
                  </p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lucro total</p>
                  <p className="mt-2 text-2xl font-semibold">{money(moneyAnalysis.kpis.profitTotal)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cada R$ 100 vendidos deixam {pct(moneyAnalysis.kpis.profitMarginPercent)} de margem
                  </p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tendência de receita
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{pct(moneyAnalysis.kpis.revenueTrendPercent)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {moneyAnalysis.kpis.averageOrders} pedidos médios por dia no período
                  </p>
                </div>
            </div>
          </CardContent>
        </Card>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-3xl shadow-none">
              <CardHeader>
                <CardTitle>Para onde vai cada R$ 100</CardTitle>
                <CardDescription>O donut mostra o peso de cada categoria no caixa do período.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ChartContainer config={moneyBucketConfig} className="h-[300px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                    <Pie
                      data={moneyAnalysis.buckets}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius={72}
                      outerRadius={112}
                      strokeWidth={2}
                      paddingAngle={2}
                    >
                      {moneyAnalysis.buckets.map((bucket) => (
                        <Cell key={bucket.key} fill={`var(--color-${bucket.key})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="space-y-3">
                  {moneyAnalysis.buckets.map((bucket) => (
                    <div key={bucket.key} className="rounded-2xl border bg-stone-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{bucket.label}</p>
                          <p className="text-sm text-muted-foreground">{bucket.helper}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{money(bucket.amount)}</p>
                          <p className="text-sm text-muted-foreground">{pct(bucket.share)}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(bucket.share, 4)}%`,
                            backgroundColor: `var(--color-${bucket.key})`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-none">
              <CardHeader>
                <CardTitle>Como ganhar mais</CardTitle>
                <CardDescription>O que mexer primeiro para aumentar lucro sem complicar o dia a dia.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {moneyAnalysis.recommendations.map((item, index) => (
                  <div key={`${item.tag}-${item.title}`} className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-700">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{item.title}</p>
                          <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>{item.tag}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {!moneyAnalysis.recommendations.length ? (
                  <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                    Sem alerta agora. A operação está estável.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>

        <section
          data-owner-tour-target="api-masterclass"
          className={`space-y-4 rounded-3xl border border-sky-200 bg-sky-50/60 p-5 shadow-none ${tourTargetClass("api-masterclass")}`}
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge className="w-fit rounded-full bg-sky-600 px-3 py-1 text-white">API Masterclass</Badge>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">{apiMasterclass.title}</h2>
                <p className="max-w-3xl text-sm text-slate-700">{apiMasterclass.subtitle}</p>
              </div>
            </div>
            <div className="rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700">
              {apiMasterclass.modeLabel}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {apiMasterclass.cards.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                helper={card.helper}
                icon={card.title === "Lucro por pedido" ? DollarSign : card.title === "Fill rate" ? TrendingUp : card.title === "Disponibilidade" ? Warehouse : Boxes}
                tone={card.tone}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
              <CardHeader>
                <CardTitle>Quando a API vira lucro</CardTitle>
                <CardDescription>O que a Zé API ensina para o dono ganhar mais sem adivinhar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {apiMasterclass.scenarios.map((scenario) => (
                  <div key={scenario.title} className="rounded-xl border bg-stone-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">{scenario.title}</p>
                      <Badge variant="secondary">{scenario.gain}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{scenario.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
              <CardHeader>
                <CardTitle>Playbook do dono</CardTitle>
                <CardDescription>Como ler a API sem ficar preso no técnico.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fórmula</p>
                  <p className="mt-2 text-sm font-semibold">{apiMasterclass.formula}</p>
                </div>
                {apiMasterclass.playbook.map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-xl border bg-stone-50 p-4">
                    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-dashed bg-sky-50 p-4 text-sm text-sky-900">
                  Se você quer lucro, a leitura certa é: pedido bom, taxa baixa, perda pequena e entrega sob controle.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Card
            data-owner-tour-target="files"
            className={`rounded-2xl shadow-none ${tourTargetClass("files")}`}
          >
            <CardHeader>
              <CardTitle>Arquivos usados</CardTitle>
              <CardDescription>Os arquivos que fazem a conta andar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mergedFiles.length ? (
                mergedFiles.map((file) => (
                  <div key={file.reportType} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{file.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {file.fileCount} arquivos · {file.totalRows} linhas · {dateRangeLabel(file.dateFrom, file.dateTo)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Último usado: {file.latestFileName ?? "sem nome"}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhum arquivo entrou ainda.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-none">
            <CardHeader>
              <CardTitle>Fala curta para reunião</CardTitle>
              <CardDescription>Texto simples para explicar sem enrolar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                O sistema responde três perguntas: quanto entrou, quanto saiu e quanto sobrou.
              </p>
              <p>
                Quando a conta está fechada, a leitura mostra o lucro. Quando falta arquivo, o sistema avisa que a conta ainda não fechou.
              </p>
              <p>
                A ordem é simples: vender bem, gastar menos e evitar perda.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card
            data-owner-tour-target="ze-connector"
            className={`rounded-2xl shadow-none ${tourTargetClass("ze-connector")}`}
          >
            <CardHeader>
              <CardTitle>Conector Zé Delivery</CardTitle>
              <CardDescription>Credenciais e leitura direta da API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-xl border bg-white p-4">
                <p className="font-medium">Status</p>
                <p className="text-muted-foreground">
                  {apiConnectionMode === "live" ? "Credenciais salvas" : "Modo demo ativo"}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="font-medium">Merchant atual</p>
                <p className="text-muted-foreground">{merchantId || "Nenhum merchant configurado"}</p>
              </div>
              <div className="grid gap-3">
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Client ID
                  </span>
                  <Input
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    placeholder="Cole o client id"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Client Secret
                  </span>
                  <Input
                    value={clientSecret}
                    onChange={(event) => setClientSecret(event.target.value)}
                    type="password"
                    placeholder="Cole o client secret"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Merchant IDs
                  </span>
                  <Input
                    value={merchantIds}
                    onChange={(event) => setMerchantIds(event.target.value)}
                    placeholder="merchant-1, merchant-2"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Valide os dados no portal do vendedor:
                  {" "}
                  <a
                    href="https://seu.ze.delivery"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-sky-700 underline-offset-4 hover:underline"
                  >
                    seu.ze.delivery
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={!clientId || !clientSecret || !merchantIds}
                  onClick={() =>
                    saveCredentialsMutation.mutate({
                      clientId,
                      clientSecret,
                      merchantIds: merchantIds.split(",").map((item) => item.trim()).filter(Boolean),
                    })
                  }
                >
                  Salvar credenciais
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!clientId || !clientSecret || !merchantId}
                  onClick={() =>
                    verifyCredentialsMutation.mutate({
                      clientId,
                      clientSecret,
                      merchantId: merchantId || "demo-merchant",
                    })
                  }
                >
                  Validar API
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href="/api/docs" target="_blank" rel="noreferrer">
                    Swagger
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => void apiCredentialsQuery.refetch()}>
                  Recarregar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-none">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>KPI da API</CardTitle>
                  <CardDescription>Leitura direta do contrato público da Zé Seller API.</CardDescription>
                </div>
                <Badge variant="outline">{apiSummary.modeLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <StatCard
                title="Pedidos válidos"
                value={apiKpi?.kpis.general.validOrders?.value ?? "0"}
                helper={apiKpi?.kpis.updatedDate ? `Atualizado em ${new Date(apiKpi.kpis.updatedDate).toLocaleString("pt-BR")}` : "vindo da API"}
                icon={Boxes}
              />
              <StatCard
                title="Fill rate"
                value={`${apiKpi?.kpis.general.fillRate?.value ?? "0"}%`}
                helper="eficiência operacional"
                icon={TrendingUp}
              />
              <StatCard
                title="Disponibilidade"
                value={`${apiKpi?.kpis.general.merchantAvailabilityRate?.value ?? "0"}%`}
                helper="tempo online do merchant"
                icon={Warehouse}
              />
              <StatCard
                title="Turbo válido"
                value={apiKpi?.kpis.turbo?.validTurboOrders?.value ?? "0"}
                helper={`Canal Turbo${apiKpi?.kpis.general.orderRating?.value ? ` · nota ${apiKpi.kpis.general.orderRating.value}` : ""}`}
                icon={Truck}
              />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Resumo Zé Delivery</h2>
              <p className="text-sm text-muted-foreground">
                KPIs, repasses, histórico e webhook em uma leitura só para o dono da loja.
              </p>
            </div>
            <Badge variant="secondary">{merchantId}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {apiSummary.cards.map((card) => {
              const Icon = summaryIconByTitle[card.title] ?? Boxes;
              return (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  helper={card.helper}
                  tone={card.tone}
                  icon={Icon}
                />
              );
            })}
          </div>
        </section>

          </TabsContent>

          <TabsContent value="guide" className="space-y-6">
            <section data-owner-tour-target="guide-hero" className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-none">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <div data-owner-tour-target="guide-swagger" className="flex flex-wrap items-center gap-2">
                    <Badge className="w-fit rounded-full bg-emerald-600 px-3 py-1 text-white">Guia da operação</Badge>
                    <Badge asChild variant="outline" className="rounded-full border-emerald-200 bg-white px-3 py-1 text-emerald-700">
                      <a href="/api/docs" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                        Validado no Swagger
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Badge>
                    <Button asChild variant="outline" size="sm" className="h-8 rounded-full border-emerald-200 bg-white px-3 text-emerald-700 hover:bg-emerald-50">
                      <a href="/api/docs" target="_blank" rel="noreferrer">
                        Ver documentação
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <a
                      href="/api/docs"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-1 text-2xl font-semibold tracking-tight text-stone-950 underline-offset-4 hover:underline"
                    >
                      {profitGuide.title}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <p className="max-w-3xl text-sm text-stone-700">{profitGuide.subtitle}</p>
                    <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                      Fonte: contrato Swagger da Zé Seller API
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700">
                    {apiSummary.modeLabel}
                  </div>
                  <Button variant="outline" size="sm" onClick={startGuideTour} className="gap-2 rounded-full border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50">
                    <Route className="h-4 w-4" />
                    Tour da operação
                  </Button>
                </div>
              </div>

              <p className="max-w-4xl text-sm text-stone-700">{profitGuide.heroNote}</p>

              <Card data-owner-tour-target="guide-ingestion" className="rounded-2xl border-emerald-100 bg-white/90 shadow-none">
                <CardHeader>
                  <CardTitle>Como a ingestão da API acontece</CardTitle>
                  <CardDescription>
                    Primeiro entra a credencial, depois vêm os dados, e por fim o app traduz isso para linguagem de dono.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                  {profitGuide.ingestionFlow.map((step) => (
                    <div key={step.endpoint} className="rounded-xl border bg-stone-50 p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold">{step.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {step.endpoint}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        <p className="text-sm font-medium text-emerald-700">{step.result}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card data-owner-tour-target="guide-products" className="rounded-2xl border-emerald-100 bg-white/90 shadow-none">
                <CardHeader>
                  <CardTitle>{profitGuide.productLens.title}</CardTitle>
                  <CardDescription>{profitGuide.productLens.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {profitGuide.productLens.items.map((item) => (
                      <div key={item.name} className="rounded-xl border bg-stone-50 p-4">
                        <p className="font-semibold">{item.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-2xl border bg-emerald-50/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Regra de leitura</p>
                      <div className="mt-3 space-y-2 text-sm text-stone-700">
                        {profitGuide.productLens.rules.map((rule) => (
                          <p key={rule}>• {rule}</p>
                        ))}
                      </div>
                    </div>
                    <div data-owner-tour-target="guide-rules" className="rounded-2xl border bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Endpoints de produto
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profitGuide.productLens.endpoints.map((endpoint) => (
                          <Badge key={endpoint} variant="outline" className="text-xs">
                            {endpoint}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Use isso para entender catálogo, disponibilidade e oferta. É aqui que o Doritos, a cerveja e o gelo viram leitura de negócio.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Lucro"
                  value={money(ownerModel.totals.netMargin)}
                  helper="quanto sobra no fim"
                  icon={TrendingUp}
                  tone={ownerModel.totals.netMargin >= 0 ? "good" : "risk"}
                />
                <StatCard
                  title="Margem"
                  value={pct(ownerModel.totals.netMarginPercent)}
                  helper="quanto fica de cada venda"
                  icon={DollarSign}
                  tone={ownerModel.totals.netMarginPercent >= 10 ? "good" : "risk"}
                />
                <StatCard
                  title="Fill rate"
                  value={`${apiKpi?.kpis?.general?.fillRate?.value ?? "0"}%`}
                  helper="se o pedido entra ou escapa"
                  icon={Boxes}
                  tone={Number(apiKpi?.kpis?.general?.fillRate?.value ?? 0) >= 95 ? "good" : "risk"}
                />
                <StatCard
                  title="Perda"
                  value={money(ownerModel.totals.restitutionTotal)}
                  helper="dinheiro que voltou para fora"
                  icon={Truck}
                  tone={ownerModel.totals.restitutionTotal > 0 ? "risk" : "good"}
                />
              </div>

              <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
                <CardHeader>
                  <CardTitle>Onde a Zé API ajuda a ganhar mais</CardTitle>
                  <CardDescription>O que observar primeiro, em linguagem simples.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 lg:grid-cols-2">
                  {profitGuide.keyLevers.map((lever) => (
                    <div key={lever.endpoint} className="rounded-xl border bg-stone-50 p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">{lever.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {lever.endpoint}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{lever.whyItMatters}</p>
                        <p className="text-sm text-stone-700">{lever.action}</p>
                        <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                          {lever.impact}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
                  <CardHeader>
                    <CardTitle>Plano da semana</CardTitle>
                    <CardDescription>Quatro passos pequenos, sem complicar a cabeça.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profitGuide.weeklyPlan.map((step) => (
                      <div key={step.title} className="rounded-xl border bg-stone-50 p-4">
                        <p className="font-semibold">{step.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-wider text-sky-700">
                          {step.result}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
                  <CardHeader>
                    <CardTitle>Jeito fácil de pensar</CardTitle>
                    <CardDescription>Para quem quer entender sem linguagem técnica.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profitGuide.simpleSteps.map((step) => (
                      <div key={step.title} className="rounded-xl border bg-stone-50 p-4">
                        <p className="font-semibold">{step.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-wider text-emerald-700">
                          {step.result}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <Card className="rounded-2xl border-white/80 bg-white/90 shadow-none">
                  <CardHeader>
                    <CardTitle>O que evitar</CardTitle>
                    <CardDescription>Coisas que parecem pequenas, mas tiram dinheiro da operação.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profitGuide.warnings.map((warning) => (
                      <div key={warning.title} className="rounded-xl border bg-stone-50 p-4">
                        <p className="font-semibold">{warning.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{warning.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card data-owner-tour-target="guide-close" className="rounded-2xl border-white/80 bg-white/90 shadow-none">
                  <CardHeader>
                    <CardTitle>Resumo para o dono</CardTitle>
                    <CardDescription>Uma frase curta para lembrar na correria.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <p>{profitGuide.closing}</p>
                    <div className="rounded-xl border border-dashed bg-emerald-50 p-4 text-emerald-900">
                      O atalho para ganhar mais é sempre o mesmo: vender bem, perder menos e reagir cedo.
                    </div>
                    <div className="rounded-xl border bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Fórmula simples
                      </p>
                      <p className="mt-2 font-semibold text-stone-900">
                        {apiMasterclass.formula}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Potencial combinado
                      </p>
                      <p className="mt-2 text-lg font-semibold text-stone-900">
                        {ownerStudy.profitLab.weeklyPotential}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showBasePartialHelp} onOpenChange={setShowBasePartialHelp}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Conta fechada ou incompleta?</DialogTitle>
            <DialogDescription>
              Essa janela explica a leitura em palavras simples.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-stone-900">Conta fechada</strong> quer dizer que os arquivos principais já estão dentro.
            </p>
            <p>
              <strong className="text-stone-900">Conta incompleta</strong> quer dizer que falta um arquivo importante.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {activeTourStep ? (
        <OwnerTourBot
          open={tourActive}
          step={activeTourStep}
          index={tourIndex}
          total={OWNER_TOUR_STEPS.length}
          onNext={nextTourStep}
          onPrev={previousTourStep}
          onClose={closeTour}
          onRestart={restartTour}
        />
      ) : null}

      {activeGuideTourStep ? (
        <OwnerTourBot
          open={guideTourActive}
          step={activeGuideTourStep}
          index={guideTourIndex}
          total={OWNER_GUIDE_TOUR_STEPS.length}
          onNext={nextGuideTourStep}
          onPrev={previousGuideTourStep}
          onClose={closeGuideTour}
          onRestart={restartGuideTour}
        />
      ) : null}
    </main>
  );
}
