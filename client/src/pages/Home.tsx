import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { asNumber, dateRangeLabel, money, pct } from "@/features/profit/format";
import { buildOwnerDashboardModel, buildOwnerRecommendations } from "@/lib/owner-dashboard";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Bike,
  Boxes,
  BarChart3,
  Clock3,
  DollarSign,
  FileUp,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  LogIn,
  PackageCheck,
  RefreshCcw,
  Route,
  ShoppingCart,
  Smartphone,
  Truck,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function MetricCard({
  title,
  value,
  helper,
  tone = "default",
  icon: Icon,
}: {
  title: string;
  value: string | number;
  helper: string;
  tone?: "default" | "risk" | "good";
  icon: typeof Bike;
}) {
  const toneClass =
    tone === "risk"
      ? "border-red-200 bg-red-50/70"
      : tone === "good"
        ? "border-emerald-200 bg-emerald-50/70"
        : "border-stone-200 bg-white";

  return (
    <Card className={`gap-4 rounded-lg py-4 shadow-none ${toneClass}`}>
      <CardHeader className="flex-row items-center justify-between gap-3 px-4">
        <div className="space-y-1">
          <CardDescription className="text-xs font-medium uppercase tracking-normal">
            {title}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="px-4 text-sm text-muted-foreground">
        {helper}
      </CardContent>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-32 rounded-lg" />
      ))}
    </div>
  );
}

function SectionLabel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function ImportPicker({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: Array<{ importId: string; fileName: string; importedAt: string; dateFrom?: string; dateTo?: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-stone-700">{title}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.importId} value={option.importId}>
            {option.fileName} | {dateRangeLabel(option.dateFrom, option.dateTo)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastImport, setLastImport] = useState<any>(null);
  const [selectedOrderImportId, setSelectedOrderImportId] = useState("");
  const [selectedDriverImportId, setSelectedDriverImportId] = useState("");
  const [selectedRestitutionImportId, setSelectedRestitutionImportId] = useState("");
  const [showImportSelectors, setShowImportSelectors] = useState(false);

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
  const executiveQuery = trpc.dashboard.getExecutiveSummary.useQuery(
    { limit: 7 },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const summariesQuery = trpc.imports.getLatestSummaries.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const closingsHistoryQuery = trpc.dailyClosings.history.useQuery(
    { limit: 30 },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const importMutation = trpc.imports.dailyExcel.useMutation({
    onSuccess: (result) => {
      setLastImport(result);
      void summariesQuery.refetch();
      void closingsHistoryQuery.refetch();
      if (isAuthenticated) {
        void operationalQuery.refetch();
        void financialQuery.refetch();
        void criticalStockQuery.refetch();
      }
    },
  });

  const operational = operationalQuery.data;
  const financial = financialQuery.data;
  const criticalStockCount = criticalStockQuery.data?.length ?? 0;
  const isLoading =
    operationalQuery.isLoading ||
    financialQuery.isLoading ||
    criticalStockQuery.isLoading ||
    executiveQuery.isLoading;

  const summaries = summariesQuery.data ?? {};
  const importCatalog = (summaries["excel_ingest:catalog"] as any[]) ?? [];
  const orderOptions = importCatalog.filter((item) => item?.reportType === "orders_report");
  const driverOptions = importCatalog.filter((item) => item?.reportType === "drivers_report");
  const restitutionOptions = importCatalog.filter((item) => item?.reportType === "restitution_summary");
  const ordersSummary =
    orderOptions.find((item) => item.importId === selectedOrderImportId) ??
    (summaries["excel_ingest:orders_report"] as any);
  const driversSummary =
    driverOptions.find((item) => item.importId === selectedDriverImportId) ??
    (summaries["excel_ingest:drivers_report"] as any);
  const restitutionSummary =
    restitutionOptions.find((item) => item.importId === selectedRestitutionImportId) ??
    (summaries["excel_ingest:restitution_summary"] as any);
  const latestResult = summaries["excel_ingest:last_result"] as any;
  const closingsHistory = closingsHistoryQuery.data ?? [];
  const ownerModel = buildOwnerDashboardModel({
    summaries: {
      ...summaries,
      "excel_ingest:orders_report": ordersSummary,
      "excel_ingest:drivers_report": driversSummary,
      "excel_ingest:restitution_summary": restitutionSummary,
    },
    operational,
    financial,
    criticalStockCount,
  });
  const ownerRecommendations = buildOwnerRecommendations(ownerModel);
  const executiveSummary = executiveQuery.data;
  const latestClosing = executiveSummary?.latestClosing;
  const latestClosingStoreCost = asNumber(latestClosing?.productCosts);
  const latestClosingDeliveryCost = asNumber(latestClosing?.deliveryCosts);
  const latestClosingNetMargin = asNumber(latestClosing?.totalNetMargin);
  const latestClosingNetMarginPercent = asNumber(latestClosing?.netMarginPercent);
  const hasFinancialSnapshot =
    ownerModel.sources.hasFinancialData || ownerModel.sources.hasRestitutionReport || Boolean(latestClosing);
  const trendData = (executiveSummary?.history ?? []).slice().reverse().map((row) => ({
    date: new Date(row.closingDate).toLocaleDateString("pt-BR"),
    margem: row.totalNetMargin,
    faturamento: row.grossRevenue,
  }));

  useEffect(() => {
    if (!selectedOrderImportId && orderOptions[0]?.importId) {
      setSelectedOrderImportId(orderOptions[0].importId);
    }
  }, [orderOptions, selectedOrderImportId]);

  useEffect(() => {
    if (!selectedDriverImportId && driverOptions[0]?.importId) {
      setSelectedDriverImportId(driverOptions[0].importId);
    }
  }, [driverOptions, selectedDriverImportId]);

  useEffect(() => {
    if (!selectedRestitutionImportId && restitutionOptions[0]?.importId) {
      setSelectedRestitutionImportId(restitutionOptions[0].importId);
    }
  }, [restitutionOptions, selectedRestitutionImportId]);

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-stone-300 bg-white">
                Operacao
              </Badge>
              <Badge variant={isAuthenticated ? "secondary" : "outline"}>
                {isAuthenticated ? user?.name || "Online" : "Local"}
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-normal">
              Delivery Margin Control
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Painel consolidado com leitura executiva, dados dos XLS e visao detalhada nas tabs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/owner">
              <Button variant="secondary" size="sm">
                <TrendingUp className="h-4 w-4" />
                Aba do owner
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void summariesQuery.refetch();
                void operationalQuery.refetch();
                void financialQuery.refetch();
                void criticalStockQuery.refetch();
                void executiveQuery.refetch();
              }}
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </Button>
            {!isAuthenticated ? (
              <Button size="sm" onClick={() => (window.location.href = "/login")}>
                <LogIn className="h-4 w-4" />
                Entrar
              </Button>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const base64 = await fileToBase64(file);
                await importMutation.mutateAsync({
                  fileName: file.name,
                  base64,
                });
                event.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              <FileUp className="h-4 w-4" />
              Importar Excel
            </Button>
          </div>
        </header>

        {importMutation.error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {importMutation.error.message}
          </section>
        ) : null}

        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionLabel
              title="Resumo executivo"
              description="Tudo que o dono precisa ver em segundos, com cada XLS refletido na leitura principal."
            />
            <Badge variant="secondary" className="rounded-full">
              {ownerModel.importCatalog.length} arquivos importados
            </Badge>
          </div>

          <Card className="rounded-lg border-emerald-200 bg-emerald-50/70 shadow-none">
            <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {ownerModel.readingMode === "lucro_real" ? "Lucro real" : "Base parcial"}
                  </Badge>
                  <span className="text-sm font-medium text-stone-700">
                    {ownerModel.readingMode === "lucro_real"
                      ? "A leitura está validada pelos arquivos essenciais."
                      : "A leitura ainda depende de um arquivo faltar para fechar o lucro real."}
                  </span>
                </div>
                <p className="text-sm text-stone-600">
                  Regra simples: pedidos mostram receita, restituição fecha custo e o histórico persistido confirma a tendência.
                  Se um dos pilares faltar, o painel não inventa lucro e marca a visão como base parcial.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Badge variant={ownerModel.sources.hasOrdersReport ? "secondary" : "outline"} className="justify-center py-2">
                  Receita: {ownerModel.sources.hasOrdersReport ? "ok" : "falta"}
                </Badge>
                <Badge variant={ownerModel.sources.hasRestitutionReport ? "secondary" : "outline"} className="justify-center py-2">
                  Custo: {ownerModel.sources.hasRestitutionReport ? "ok" : "falta"}
                </Badge>
                <Badge variant={ownerModel.sources.hasValidatedCore ? "secondary" : "outline"} className="justify-center py-2">
                  Base: {ownerModel.sources.hasValidatedCore ? "validada" : "parcial"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Pedidos analisados"
              value={ownerModel.sources.hasOrdersReport ? ownerModel.totals.totalOrders : "Sem dados"}
              helper={
                ownerModel.sources.hasOrdersReport
                  ? `${ownerModel.totals.deliveredOrders} entregues no workbook`
                  : "importe o relatório de pedidos para calcular faturamento real"
              }
              icon={PackageCheck}
              tone={ownerModel.sources.hasOrdersReport ? "good" : "risk"}
            />
            <MetricCard
              title="Margem liquida"
              value={hasFinancialSnapshot ? pct(latestClosing ? latestClosingNetMarginPercent : ownerModel.totals.netMarginPercent) : "Sem base"}
              helper={
                hasFinancialSnapshot
                  ? money(latestClosing ? latestClosingNetMargin : ownerModel.totals.netMargin)
                  : "importe pedidos e fechamento para calcular margem"
              }
              icon={TrendingUp}
              tone={
                hasFinancialSnapshot &&
                (latestClosing ? latestClosingNetMarginPercent : ownerModel.totals.netMarginPercent) >= 10
                  ? "good"
                  : "risk"
              }
            />
            <MetricCard
              title="Faturamento"
              value={ownerModel.sources.hasOrdersReport ? money(ownerModel.totals.grossRevenue) : "Sem dados"}
              helper={
                ownerModel.sources.hasOrdersReport
                  ? `${ownerModel.totals.totalOrders} pedidos importados`
                  : "sem workbook de pedidos, não existe faturamento analisado"
              }
              icon={DollarSign}
              tone={ownerModel.sources.hasOrdersReport ? "good" : "risk"}
            />
            <MetricCard
              title="Custo final"
              value={
                ownerModel.sources.hasRestitutionReport
                  ? money(ownerModel.totals.finalOperationalCost)
                  : "Sem base"
              }
              helper={
                ownerModel.sources.hasRestitutionReport
                  ? "custo da loja + custo dos motoboys"
                  : "importe o resumo de restituição para fechar o custo real"
              }
              icon={Truck}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>Resumo importado</CardTitle>
                    <CardDescription>
                      Os três arquivos alimentam a leitura sem precisar trocar de tela.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImportSelectors((value) => !value)}
                  >
                    {showImportSelectors ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Fechar opcoes
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Ver opcoes
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {showImportSelectors ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    {orderOptions.length ? (
                      <ImportPicker
                        title="Excel de pedidos"
                        value={selectedOrderImportId}
                        options={orderOptions}
                        onChange={setSelectedOrderImportId}
                      />
                    ) : null}
                    {driverOptions.length ? (
                      <ImportPicker
                        title="Excel de entregadores"
                        value={selectedDriverImportId}
                        options={driverOptions}
                        onChange={setSelectedDriverImportId}
                      />
                    ) : null}
                    {restitutionOptions.length ? (
                      <ImportPicker
                        title="Excel de restituicao"
                        value={selectedRestitutionImportId}
                        options={restitutionOptions}
                        onChange={setSelectedRestitutionImportId}
                      />
                    ) : null}
                  </div>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-3">
                  <Badge variant={ownerModel.sources.hasOrdersReport ? "secondary" : "outline"} className="justify-center py-2">
                    Pedidos: {ownerModel.sources.hasOrdersReport ? "ok" : "falta"}
                  </Badge>
                  <Badge variant={ownerModel.sources.hasDriversReport ? "secondary" : "outline"} className="justify-center py-2">
                    Entregadores: {ownerModel.sources.hasDriversReport ? "ok" : "falta"}
                  </Badge>
                  <Badge variant={ownerModel.sources.hasRestitutionReport ? "secondary" : "outline"} className="justify-center py-2">
                    Restituição: {ownerModel.sources.hasRestitutionReport ? "ok" : "falta"}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Pedidos importados"
                    value={ownerModel.sources.hasOrdersReport ? ownerModel.totals.totalOrders : "Sem dados"}
                    helper={
                      ownerModel.sources.hasOrdersReport
                        ? dateRangeLabel(ownerModel.ordersSummary?.dateFrom, ownerModel.ordersSummary?.dateTo)
                        : "importe o workbook de pedidos para abrir esse bloco"
                    }
                    icon={ShoppingCart}
                    tone={ownerModel.sources.hasOrdersReport ? "good" : "risk"}
                  />
                  <MetricCard
                    title="Receita pedidos"
                    value={ownerModel.sources.hasOrdersReport ? money(ownerModel.ordersSummary?.totals?.grossRevenue ?? 0) : "Sem dados"}
                    helper={
                      ownerModel.sources.hasOrdersReport
                        ? `${ownerModel.totals.deliveredOrders} entregues`
                        : "sem relatório de pedidos, não dá para afirmar faturamento"
                    }
                    icon={DollarSign}
                    tone={ownerModel.sources.hasOrdersReport ? "good" : "risk"}
                  />
                  <MetricCard
                    title="Receita motoboys"
                    value={ownerModel.sources.hasDriversReport ? money(ownerModel.driversSummary?.totals?.grossRevenue ?? 0) : "Sem dados"}
                    helper={
                      ownerModel.sources.hasDriversReport
                        ? `${ownerModel.totals.totalDrivers} entregadores`
                        : "importe o relatório de entregadores para mostrar esse bloco"
                    }
                    icon={Truck}
                    tone={ownerModel.sources.hasDriversReport ? "default" : "risk"}
                  />
                  <MetricCard
                    title="Restituicao"
                    value={ownerModel.sources.hasRestitutionReport ? money(ownerModel.totals.restitutionTotal) : "Sem dados"}
                    helper={
                      ownerModel.sources.hasRestitutionReport
                        ? dateRangeLabel(ownerModel.restitutionSummary?.dateFrom, ownerModel.restitutionSummary?.dateTo)
                        : "importe o resumo de restituição para fechar o custo"
                    }
                    icon={Warehouse}
                    tone={ownerModel.sources.hasRestitutionReport ? "default" : "risk"}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Custo final</CardTitle>
                <CardDescription>
                  Valor final = custo total da loja + custo dos motoboys.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-sm text-muted-foreground">Valor final consolidado</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {money(
                      ownerModel.totals.finalOperationalCost ||
                        latestClosingStoreCost + latestClosingDeliveryCost
                    )}
                  </p>
                </div>
                <div className="grid gap-3">
                  <MetricCard
                    title="Custo loja"
                    value={money(ownerModel.restitutionSummary?.totals?.storeCostTotal ?? latestClosingStoreCost)}
                    helper="alimentado pela planilha diaria"
                    icon={Warehouse}
                  />
                  <MetricCard
                    title="Custo motoboys"
                    value={money(ownerModel.restitutionSummary?.totals?.driverCostTotal ?? latestClosingDeliveryCost)}
                    helper="custo operacional de entrega"
                    icon={Bike}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-lg shadow-none lg:col-span-2">
              <CardHeader>
                <CardTitle>Financeiro do dia</CardTitle>
                <CardDescription>
                  Margem depois de comissao, taxas, custos, descontos e reembolsos.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Faturamento"
                  value={money(ownerModel.totals.grossRevenue || latestClosing?.grossRevenue || 0)}
                  helper="pedidos entregues"
                  icon={DollarSign}
                />
                <MetricCard
                  title="Comissao"
                  value={money(ownerModel.totals.platformCommissions)}
                  helper="plataforma estimada"
                  icon={DollarSign}
                  tone={ownerModel.totals.platformCommissions > 0 ? "risk" : "default"}
                />
                <MetricCard
                  title="Produto"
                  value={money(ownerModel.totals.productCosts || latestClosingStoreCost)}
                  helper="custo vendido"
                  icon={Boxes}
                />
                <MetricCard
                  title="Entrega"
                  value={money(ownerModel.totals.deliveryCosts || latestClosingDeliveryCost)}
                  helper="custo logistico"
                  icon={Bike}
                />
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Capacidade e estoque</CardTitle>
                <CardDescription>Indicadores ao vivo da operacao.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">Capacidade usada</span>
                    <span>{ownerModel.totals.capacityUsedPercent}%</span>
                  </div>
                  <Progress value={ownerModel.totals.capacityUsedPercent} />
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Motoboys livres</span>
                  <strong>{ownerModel.totals.availableDrivers}</strong>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Com 1 pedido</span>
                  <strong>{ownerModel.totals.driversWithOne}</strong>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Lotados</span>
                  <strong>{ownerModel.totals.driversWithTwo}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estoque critico</span>
                  <strong>{ownerModel.totals.criticalStockCount}</strong>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Leitura persistida no MySQL</CardTitle>
                <CardDescription>
                  Fechamentos diários consolidados para enxergar tendência, não só um mês solto.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Último fechamento"
                  value={money(executiveSummary?.latestClosing?.totalNetMargin ?? ownerModel.totals.netMargin)}
                  helper={
                    executiveSummary?.latestClosing?.closingDate
                      ? new Date(executiveSummary.latestClosing.closingDate).toLocaleDateString("pt-BR")
                      : "usando o import atual enquanto o histórico cresce"
                  }
                  icon={TrendingUp}
                  tone="good"
                />
                <MetricCard
                  title="Média de margem"
                  value={`${
                    executiveSummary?.history.length
                      ? (executiveSummary?.averageNetMarginPercent ?? 0).toFixed(1)
                      : ownerModel.totals.netMarginPercent.toFixed(1)
                  }%`}
                  helper={
                    executiveSummary?.history.length ? "últimos fechamentos" : "base atual importada"
                  }
                  icon={DollarSign}
                />
                <MetricCard
                  title="Tendência"
                  value={
                    executiveSummary?.history.length && executiveSummary?.trend === "up"
                      ? "Subindo"
                      : executiveSummary?.history.length && executiveSummary?.trend === "down"
                        ? "Caindo"
                        : "Estável"
                  }
                  helper={money(executiveSummary?.averageGrossRevenue ?? ownerModel.totals.grossRevenue)}
                  icon={Route}
                />
                <MetricCard
                  title="Top fechamento"
                  value={money(executiveSummary?.bestDay?.totalNetMargin ?? ownerModel.totals.netMargin)}
                  helper={executiveSummary?.history.length ? "melhor dia salvo" : "sem histórico salvo ainda"}
                  icon={PackageCheck}
                />
              </CardContent>
              <CardContent className="pt-0">
                <ChartContainer
                  config={{
                    margem: { label: "Margem", color: "hsl(142 76% 36%)" },
                    faturamento: { label: "Faturamento", color: "hsl(38 92% 50%)" },
                  }}
                  className="h-[280px] w-full"
                >
                  <LineChart data={trendData} margin={{ left: 8, right: 8, top: 10, bottom: 10 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                    <Line
                      type="monotone"
                      dataKey="margem"
                      stroke="var(--color-margem)"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="faturamento"
                      stroke="var(--color-faturamento)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
                {!trendData.length ? (
                  <div className="mt-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Ainda não há fechamentos salvos para desenhar a tendência.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Guia do dono</CardTitle>
                <CardDescription>
                  O caminho mais simples para explicar onde está o lucro e como aumentá-lo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Passo 1</p>
                  <p className="mt-2 font-semibold">Olhe margem, faturamento e custo final primeiro.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Se a margem sobe, o lucro cresce. Se o faturamento sobe mas a margem cai, o custo está comendo o ganho.
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Passo 2</p>
                  <p className="mt-2 font-semibold">Ataque estoque, fila e restituição.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O lucro sobe mais rápido quando você reduz ruptura, atraso, cancelamento e dinheiro perdido em correções.
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Passo 3</p>
                  <p className="mt-2 font-semibold">Use a etiqueta de leitura como trava de verdade.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ownerModel.readingMode === "lucro_real"
                      ? "Lucro real significa que receita e custo já estão fechados o suficiente para orientar decisão."
                      : "Base parcial significa que falta arquivo essencial. Aqui o painel serve para apoio, não para concluir lucro final."}
                  </p>
                </div>
                <div className="rounded-lg border border-dashed bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Como lucrar</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Receita - custo da loja - custo de entrega - perdas = lucro real.
                    Se faltar um arquivo, o painel mostra base parcial. Quando os arquivos essenciais entram, o dono vê onde o dinheiro fica e onde ele some.
                  </p>
                </div>
                <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-600" />
                    <p className="font-semibold">Ações rápidas agora</p>
                  </div>
                  {!ownerModel.sources.hasOrdersReport ? (
                    <div className="rounded-lg border border-dashed bg-white p-3 text-sm text-muted-foreground">
                      Falta o workbook de pedidos. Sem ele, o painel não consegue provar faturamento nem margem real.
                    </div>
                  ) : null}
                  {ownerRecommendations.map((item) => (
                    <div key={`${item.tag}-${item.title}`} className="rounded-lg border bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <Badge
                          variant={
                            item.priority === "high"
                              ? "destructive"
                              : item.priority === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {item.tag}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {!ownerRecommendations.length ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Sem alerta no momento. A operação está saudável e pronta para escalar.
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </section>
        </section>

        <Tabs defaultValue="daily-closing" className="gap-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="daily-closing">Fechamento Diario</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="drivers">Entregadores</TabsTrigger>
            <TabsTrigger value="restitution">Restituicao</TabsTrigger>
            <TabsTrigger value="import">Importar</TabsTrigger>
          </TabsList>

          <TabsContent value="daily-closing" className="space-y-6">
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Dias carregados"
                value={closingsHistory.length}
                helper="historico salvo no banco"
                icon={Warehouse}
                tone="good"
              />
              <MetricCard
                title="Ultimo faturamento"
                value={money(asNumber(closingsHistory[0]?.grossRevenue))}
                helper={
                  closingsHistory[0]?.closingDate
                    ? new Date(closingsHistory[0].closingDate).toLocaleDateString("pt-BR")
                    : "sem fechamento"
                }
                icon={DollarSign}
              />
              <MetricCard
                title="Custo loja"
                value={money(asNumber(closingsHistory[0]?.productCosts))}
                helper="ultimo dia importado"
                icon={Boxes}
              />
              <MetricCard
                title="Custo motoboys"
                value={money(asNumber(closingsHistory[0]?.deliveryCosts))}
                helper="ultimo dia importado"
                icon={Bike}
              />
            </section>

            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Historico diario</CardTitle>
                <CardDescription>
                  Fechamento por dia alimentado pela importacao do resumo semanal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {closingsHistory.map((row: any) => {
                  const storeCost = asNumber(row.productCosts);
                  const driverCost = asNumber(row.deliveryCosts);
                  const finalValue = storeCost + driverCost;

                  return (
                    <div
                      key={String(row.id)}
                      className="grid gap-2 border-b py-3 text-sm md:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr]"
                    >
                      <span className="font-medium">
                        {new Date(row.closingDate).toLocaleDateString("pt-BR")}
                      </span>
                      <span>{money(asNumber(row.grossRevenue))}</span>
                      <span>{money(storeCost)}</span>
                      <span>{money(driverCost)}</span>
                      <span>{money(finalValue)}</span>
                      <span>{pct(asNumber(row.netMarginPercent))}</span>
                    </div>
                  );
                })}
                {!closingsHistory.length ? (
                  <EmptyState text="Importe o workbook de resumo semanal para gerar o historico diario." />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            {ordersSummary ? (
              <>
                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Pedidos"
                    value={ordersSummary.totals.totalOrders ?? 0}
                    helper={`${ordersSummary.totals.deliveredOrders ?? 0} entregues`}
                    icon={ShoppingCart}
                  />
                  <MetricCard
                    title="Faturamento"
                    value={money(ordersSummary.totals.grossRevenue ?? 0)}
                    helper={`Frete ${money(ordersSummary.totals.freightRevenue ?? 0)}`}
                    icon={DollarSign}
                    tone="good"
                  />
                  <MetricCard
                    title="Cancelados"
                    value={ordersSummary.totals.cancelledOrders ?? 0}
                    helper={`Descontos ${money(ordersSummary.totals.discountTotal ?? 0)}`}
                    icon={AlertTriangle}
                    tone={(ordersSummary.totals.cancelledOrders ?? 0) > 0 ? "risk" : "default"}
                  />
                  <MetricCard
                    title="Sub-total"
                    value={money(ordersSummary.totals.subtotalRevenue ?? 0)}
                    helper="Base de vendas"
                    icon={TrendingUp}
                  />
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <Card className="rounded-lg shadow-none lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Top entregadores</CardTitle>
                      <CardDescription>Quem concentrou a maior parte dos pedidos.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(ordersSummary.topCouriers ?? []).slice(0, 5).map((item: any) => (
                        <div key={item.name} className="flex items-center justify-between border-b py-2 text-sm">
                          <span className="truncate pr-3">{item.name}</span>
                          <span className="font-medium">
                            {item.count} pedidos | {money(item.total)}
                          </span>
                        </div>
                      ))}
                      {!ordersSummary.topCouriers?.length ? <EmptyState text="Sem dados de entregadores neste workbook." /> : null}
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg shadow-none">
                    <CardHeader>
                      <CardTitle>Pagamento</CardTitle>
                      <CardDescription>Mix por forma de pagamento.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {Object.entries(ordersSummary.paymentMix ?? {}).map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between border-b py-2">
                          <span className="truncate pr-3">{label}</span>
                          <strong>{money(Number(value))}</strong>
                        </div>
                      ))}
                      {!Object.keys(ordersSummary.paymentMix ?? {}).length ? <EmptyState text="Sem mix de pagamentos." /> : null}
                    </CardContent>
                  </Card>
                </section>

                <Card className="rounded-lg shadow-none">
                  <CardHeader>
                    <CardTitle>Top produtos</CardTitle>
                    <CardDescription>Maior faturamento no ranking da planilha.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    {(ordersSummary.topProducts ?? []).slice(0, 10).map((item: any) => (
                      <div key={item.name} className="rounded-lg border bg-white p-3 text-sm">
                        <p className="line-clamp-2 min-h-10 font-medium">{item.name}</p>
                        <p className="mt-2 text-muted-foreground">
                          {item.count} un | {money(item.total)}
                        </p>
                      </div>
                    ))}
                    {!ordersSummary.topProducts?.length ? <EmptyState text="Sem ranking de produtos." /> : null}
                  </CardContent>
                </Card>
              </>
            ) : (
              <EmptyState text="Importe o workbook de pedidos entregues para ver este painel." />
            )}
          </TabsContent>

          <TabsContent value="drivers" className="space-y-6">
            {driversSummary ? (
              <>
                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Entregadores"
                    value={driversSummary?.totals?.totalDrivers ?? 0}
                    helper={`${driversSummary?.totals?.deliveredOrders ?? 0} pedidos entregues`}
                    icon={Truck}
                  />
                  <MetricCard
                    title="Faturamento"
                    value={money(driversSummary?.totals?.grossRevenue ?? 0)}
                    helper="total da aba"
                    icon={DollarSign}
                    tone="good"
                  />
                  <MetricCard
                    title="Dinheiro"
                    value={money(driversSummary?.totals?.cashTotal ?? 0)}
                    helper="pagamentos em dinheiro"
                    icon={DollarSign}
                  />
                  <MetricCard
                    title="Online"
                    value={money(driversSummary?.totals?.onlineTotal ?? 0)}
                    helper="Pix + credito"
                    icon={TrendingUp}
                  />
                </section>

                <Card className="rounded-lg shadow-none">
                  <CardHeader>
                    <CardTitle>Entregadores</CardTitle>
                    <CardDescription>Resumo da planilha de fechamento por entregadores.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(driversSummary?.drivers ?? []).slice(0, 12).map((row: any) => (
                      <div key={row.name} className="grid gap-2 border-b py-2 text-sm md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
                        <span className="truncate font-medium">{row.name}</span>
                        <span>{row.deliveredOrders} pedidos</span>
                        <span>{money(row.cashTotal)}</span>
                        <span>{money(row.cardTotal)}</span>
                        <span>{money(row.total)}</span>
                      </div>
                    ))}
                    {!driversSummary?.drivers?.length ? <EmptyState text="Sem linhas de entregadores no workbook." /> : null}
                  </CardContent>
                </Card>
              </>
            ) : (
              <EmptyState text="Importe o workbook de entregadores para ver este painel." />
            )}
          </TabsContent>

          <TabsContent value="restitution" className="space-y-6">
            {restitutionSummary ? (
              <>
                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Dias"
                    value={restitutionSummary.rows?.length ?? 0}
                    helper="agrupado por data"
                    icon={Warehouse}
                  />
                  <MetricCard
                    title="Restituicao"
                    value={money(restitutionSummary?.totals?.restitutionTotal ?? 0)}
                    helper="total agregado"
                    icon={DollarSign}
                    tone="good"
                  />
                  <MetricCard
                    title="Margem"
                    value={money(restitutionSummary?.totals?.totalNetMargin ?? 0)}
                    helper={pct(
                      restitutionSummary?.totals?.grossRevenue > 0
                        ? ((restitutionSummary?.totals?.totalNetMargin ?? 0) / (restitutionSummary?.totals?.grossRevenue ?? 1)) * 100
                        : 0
                    )}
                    icon={TrendingUp}
                    tone="good"
                  />
                  <MetricCard
                    title="Comissao"
                    value={money(restitutionSummary?.totals?.marketplaceCommission ?? 0)}
                    helper="marketplace"
                    icon={AlertTriangle}
                  />
                </section>

                <Card className="rounded-lg shadow-none">
                  <CardHeader>
                    <CardTitle>Resumo diario</CardTitle>
                    <CardDescription>Fechamento por data importado do workbook semanal.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(restitutionSummary.rows ?? []).map((row: any) => (
                      <div key={row.date} className="grid gap-2 border-b py-2 text-sm md:grid-cols-[1fr_1fr_1fr_1fr_1fr]">
                        <span className="font-medium">{row.date}</span>
                        <span>{money(row.grossRevenue)}</span>
                        <span>{money(row.totalNetMargin)}</span>
                        <span>{pct(row.netMarginPercent ?? 0)}</span>
                        <span>{money(row.restitutionTotal ?? row.grossRevenue)}</span>
                      </div>
                    ))}
                    {!restitutionSummary.rows?.length ? <EmptyState text="Sem linhas resumidas de restituição." /> : null}
                  </CardContent>
                </Card>
              </>
            ) : (
              <EmptyState text="Importe o workbook de resumo semanal para ver este painel." />
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Importar Excel</CardTitle>
                <CardDescription>
                  Envie um dos 3 arquivos e o sistema detecta o tipo sozinho.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importMutation.isPending}
                  >
                    <FileUp className="h-4 w-4" />
                    Selecionar Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void summariesQuery.refetch();
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Recarregar resumos
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-white p-4 text-sm">
                    <p className="font-medium">Pedidos entregues</p>
                    <p className="mt-1 text-muted-foreground">Relatório de Pedidos</p>
                  </div>
                  <div className="rounded-lg border bg-white p-4 text-sm">
                    <p className="font-medium">Entregadores</p>
                    <p className="mt-1 text-muted-foreground">Relatório de Entregadores</p>
                  </div>
                  <div className="rounded-lg border bg-white p-4 text-sm">
                    <p className="font-medium">Restituição semanal</p>
                    <p className="mt-1 text-muted-foreground">Resumo Restituição</p>
                  </div>
                </div>
                {importCatalog.length ? (
                  <div className="rounded-lg border bg-stone-100 p-4">
                    <p className="text-sm font-medium">Biblioteca de imports</p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {importCatalog.slice(0, 8).map((item) => (
                        <div key={item.importId} className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0">
                          <span className="truncate">{item.fileName}</span>
                          <span>{dateRangeLabel(item.dateFrom, item.dateTo)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {latestResult ? (
              <section className="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-emerald-800">Arquivo</p>
                  <strong className="text-lg">{latestResult.fileName}</strong>
                </div>
                <div>
                  <p className="text-emerald-800">Tipo</p>
                  <strong className="text-lg">{latestResult.reportType}</strong>
                </div>
                <div>
                  <p className="text-emerald-800">Linhas</p>
                  <strong className="text-lg">{latestResult.importedRows}</strong>
                </div>
                <div>
                  <p className="text-emerald-800">Importado em</p>
                  <strong className="text-lg">
                    {new Date(latestResult.importedAt).toLocaleString("pt-BR")}
                  </strong>
                </div>
              </section>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
