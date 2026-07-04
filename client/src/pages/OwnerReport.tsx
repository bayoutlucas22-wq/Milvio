import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildOwnerDashboardModel } from "@/lib/owner-dashboard";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Download, TrendingUp, DollarSign, Truck, Warehouse, FileText } from "lucide-react";
import { Link } from "wouter";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: typeof TrendingUp;
}) {
  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardDescription className="text-xs font-semibold uppercase tracking-widest">
            {title}
          </CardDescription>
          <CardTitle className="text-2xl font-bold">{value}</CardTitle>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{helper}</CardContent>
    </Card>
  );
}

export default function OwnerReport() {
  const { isAuthenticated } = useAuth();
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

  const operational = operationalQuery.data;
  const financial = financialQuery.data;
  const criticalStockCount = criticalStockQuery.data?.length ?? 0;
  const summaries = summariesQuery.data ?? {};
  const ownerModel = buildOwnerDashboardModel({
    summaries,
    operational: operationalQuery.data,
    financial: financialQuery.data,
    criticalStockCount,
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Owner</Badge>
              <Badge variant="outline">Lucro</Badge>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Aba do owner</h1>
            <p className="text-sm text-muted-foreground">
              A leitura executiva para entender margem, custo e onde o dinheiro fica.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button size="sm" variant="secondary">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Margem líquida"
            value={pct(ownerModel.totals.netMarginPercent)}
            helper={money(ownerModel.totals.netMargin)}
            icon={TrendingUp}
          />
          <MetricCard
            title="Faturamento"
            value={money(ownerModel.totals.grossRevenue)}
            helper={`${ownerModel.totals.totalOrdersToday} pedidos hoje`}
            icon={DollarSign}
          />
          <MetricCard
            title="Motoboys"
            value={`${ownerModel.totals.totalDrivers}`}
            helper={`${ownerModel.totals.deliveredOrders} entregas`}
            icon={Truck}
          />
          <MetricCard
            title="Restituição"
            value={money(ownerModel.totals.restitutionTotal)}
            helper={ownerModel.restitutionSummary ? "fechamento semanal" : "sem resumo ainda"}
            icon={Warehouse}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-xl shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Como explicar lucro</CardTitle>
              <CardDescription className="text-xs">
                Receita - custos - perdas + restituição = lucro real.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Receita</p>
                <p className="mt-2 text-xl font-bold">{money(ownerModel.totals.grossRevenue)}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Custo loja</p>
                <p className="mt-2 text-xl font-bold">{money(ownerModel.totals.productCosts)}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Custo entrega</p>
                <p className="mt-2 text-xl font-bold">{money(ownerModel.totals.deliveryCosts)}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lucro</p>
                <p className="mt-2 text-xl font-bold">{money(ownerModel.totals.netMargin)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Arquivos</CardTitle>
              <CardDescription className="text-xs">Os imports que alimentam a leitura.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(ownerModel.importCatalog.slice(0, 6) as any[]).map((item) => (
                <div key={item.importId} className="rounded-xl border bg-muted/30 p-3">
                  <p className="truncate text-sm font-medium">{item.fileName}</p>
                  <p className="text-xs text-muted-foreground">{item.reportType}</p>
                </div>
              ))}
              {!ownerModel.importCatalog.length && (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Importe os arquivos para gerar a leitura do owner.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Resumo importado</CardTitle>
              <CardDescription className="text-xs">Pedido e entrega em uma visão rápida.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pedidos</p>
                  <p className="mt-2 text-xl font-bold">{ownerModel.latestResult?.importedRows ?? 0}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Entregas</p>
                  <p className="mt-2 text-xl font-bold">{ownerModel.totals.totalOrdersToday}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Restituição</p>
                  <p className="mt-2 text-xl font-bold">{money(ownerModel.totals.restitutionTotal)}</p>
                </div>
              </CardContent>
            </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Motoboys</CardTitle>
              <CardDescription className="text-xs">Estado operacional para proteger o lucro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ativos</p>
                  <p className="mt-2 text-xl font-bold">{ownerModel.totals.availableDrivers}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Com 1 pedido</p>
                  <p className="mt-2 text-xl font-bold">{ownerModel.totals.driversWithOne}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lotados</p>
                  <p className="mt-2 text-xl font-bold">{ownerModel.totals.driversWithTwo}</p>
                </div>
              </CardContent>
            </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Status</CardTitle>
              <CardDescription className="text-xs">O que o dono precisa olhar primeiro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lucro real</p>
                <p className="mt-2 text-xl font-bold">{pct(ownerModel.totals.netMarginPercent)}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Capacidade</p>
                <p className="mt-2 text-xl font-bold">{ownerModel.totals.capacityUsedPercent}%</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Crítico</p>
                <p className="mt-2 text-xl font-bold">{ownerModel.totals.criticalStockCount}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {!financialQuery.data && (
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Carregando dados</CardTitle>
              <CardDescription className="text-xs">Aguarde os resumos serem carregados.</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 rounded-xl" />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
