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
import { getLoginUrl } from "@/const";
import { buildOwnerDashboardModel } from "@/lib/owner-dashboard";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Bike,
  Boxes,
  Clock3,
  DollarSign,
  FileUp,
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

const emptyOperational = {
  totalOrdersToday: 0,
  activeOrders: 0,
  lateOrders: 0,
  criticalOrders: 0,
  waitingOrders: 0,
  availableDrivers: 0,
  driversWithOne: 0,
  driversWithTwo: 0,
  capacityUsedPercent: 0,
  totalDrivers: 0,
};

const emptyFinancial = {
  grossRevenue: 0,
  platformCommissions: 0,
  extraFees: 0,
  productCosts: 0,
  deliveryCosts: 0,
  packagingCosts: 0,
  discounts: 0,
  refunds: 0,
  netMargin: 0,
  netMarginPercent: 0,
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateRangeLabel(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return "Periodo nao identificado";
  if (dateFrom && dateTo) {
    return `${new Date(`${dateFrom}T00:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${dateTo}T00:00:00`).toLocaleDateString("pt-BR")}`;
  }
  const value = dateFrom ?? dateTo ?? "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

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

  const operational = operationalQuery.data ?? emptyOperational;
  const financial = financialQuery.data ?? emptyFinancial;
  const criticalStockCount = criticalStockQuery.data?.length ?? 0;
  const isLoading =
    operationalQuery.isLoading ||
    financialQuery.isLoading ||
    criticalStockQuery.isLoading;

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
            <Link href="/presentation">
              <Button variant="outline" size="sm">
                <Smartphone className="h-4 w-4" />
                Presentation
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
              }}
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </Button>
            {!isAuthenticated ? (
              <Button size="sm" onClick={() => (window.location.href = getLoginUrl())}>
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

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Pedidos hoje"
              value={ownerModel.totals.totalOrdersToday}
              helper={`${ownerModel.totals.activeOrders} em andamento`}
              icon={PackageCheck}
              tone="good"
            />
            <MetricCard
              title="Margem liquida"
              value={pct(ownerModel.totals.netMarginPercent)}
              helper={money(ownerModel.totals.netMargin)}
              icon={TrendingUp}
              tone={ownerModel.totals.netMarginPercent < 10 ? "risk" : "good"}
            />
            <MetricCard
              title="Faturamento"
              value={money(ownerModel.totals.grossRevenue)}
              helper={`${ownerModel.totals.totalOrders} pedidos importados`}
              icon={DollarSign}
              tone="good"
            />
            <MetricCard
              title="Custo final"
              value={money(ownerModel.totals.finalOperationalCost)}
              helper="custo da loja + custo dos motoboys"
              icon={Truck}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Resumo importado</CardTitle>
                <CardDescription>
                  Os três arquivos alimentam a leitura sem precisar trocar de tela.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
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
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Pedidos importados"
                    value={ownerModel.totals.totalOrders}
                    helper={dateRangeLabel(ownerModel.ordersSummary?.dateFrom, ownerModel.ordersSummary?.dateTo)}
                    icon={ShoppingCart}
                    tone="good"
                  />
                  <MetricCard
                    title="Receita pedidos"
                    value={money(ownerModel.ordersSummary?.totals?.grossRevenue ?? 0)}
                    helper={`${ownerModel.totals.deliveredOrders} entregues`}
                    icon={DollarSign}
                    tone="good"
                  />
                  <MetricCard
                    title="Receita motoboys"
                    value={money(ownerModel.driversSummary?.totals?.grossRevenue ?? 0)}
                    helper={`${ownerModel.totals.totalDrivers} entregadores`}
                    icon={Truck}
                  />
                  <MetricCard
                    title="Restituicao"
                    value={money(ownerModel.totals.restitutionTotal)}
                    helper={dateRangeLabel(ownerModel.restitutionSummary?.dateFrom, ownerModel.restitutionSummary?.dateTo)}
                    icon={Warehouse}
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
                  <p className="mt-2 text-3xl font-semibold">{money(ownerModel.totals.finalOperationalCost)}</p>
                </div>
                <div className="grid gap-3">
                  <MetricCard
                    title="Custo loja"
                    value={money(ownerModel.restitutionSummary?.totals?.storeCostTotal ?? 0)}
                    helper="alimentado pela planilha diaria"
                    icon={Warehouse}
                  />
                  <MetricCard
                    title="Custo motoboys"
                    value={money(ownerModel.restitutionSummary?.totals?.driverCostTotal ?? 0)}
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
                  value={money(ownerModel.totals.grossRevenue)}
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
                  value={money(ownerModel.totals.productCosts)}
                  helper="custo vendido"
                  icon={Boxes}
                />
                <MetricCard
                  title="Entrega"
                  value={money(ownerModel.totals.deliveryCosts)}
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
