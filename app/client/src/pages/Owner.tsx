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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { dateRangeLabel, money, pct } from "@/features/profit/format";
import { buildOwnerDashboardModel, buildOwnerRecommendations } from "@/lib/owner-dashboard";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Boxes,
  ChevronRight,
  BarChart3,
  DollarSign,
  Info,
  LogIn,
  ExternalLink,
  RefreshCcw,
  TrendingUp,
  Truck,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

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

export default function Owner() {
  const { user, isAuthenticated } = useAuth();
  const [showBasePartialHelp, setShowBasePartialHelp] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [merchantIds, setMerchantIds] = useState("");

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
  const merchantId = apiCredentialsQuery.data?.merchantIds?.[0] ?? "";
  const apiKpiQuery = trpc.api.getMerchantKPIs.useQuery(
    { merchantId, forceRefresh: false },
    {
      enabled: isAuthenticated && Boolean(merchantId),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
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
  const topFiles = ownerModel.importCatalog.slice(0, 4);
  const validationTone = ownerModel.readingMode === "lucro_real" ? "good" : "risk";
  const apiKpi = apiKpiQuery.data;

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-stone-300 bg-white">
                Aba do owner
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant={validationTone === "good" ? "secondary" : "outline"} className="cursor-help">
                    {ownerModel.readingMode === "lucro_real" ? "Conta fechada" : "Conta incompleta"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {ownerModel.readingMode === "lucro_real"
                    ? "Os arquivos principais já entraram."
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
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao painel
              </Button>
            </Link>
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
            {!isAuthenticated ? (
              <Button size="sm" onClick={() => (window.location.href = "/login")}>
                <LogIn className="h-4 w-4" />
                Entrar
              </Button>
            ) : null}
          </div>
        </header>

        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/80 shadow-none">
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
                    ? "Os arquivos principais já estão dentro. Pode olhar o lucro com mais confiança."
                    : "Ainda falta arquivo importante. A tela ajuda, mas não fecha o lucro final."}
                </span>
              </div>
              <p className="max-w-3xl text-sm text-stone-700">
                Regra simples: dinheiro que entra, gasto para funcionar e perda no caminho. O que sobra é o lucro.
                Se faltar um arquivo, o sistema não inventa número.
              </p>
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

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-2xl shadow-none">
            <CardHeader>
              <CardTitle>Como falar do lucro</CardTitle>
              <CardDescription>
                Uma fala simples para mostrar em reunião.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Primeiro</p>
                <p className="mt-2 font-semibold">
                  Se entra mais dinheiro, mas sobra menos, o custo está alto demais.
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Segundo</p>
                <p className="mt-2 font-semibold">
                  O lucro melhora quando a loja vende bem, entrega certo e evita desperdício.
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Terceiro</p>
                <p className="mt-2 font-semibold">
                  O painel mostra de onde vem o dinheiro, para onde ele vai e o que mexer primeiro.
                </p>
              </div>
              <div className="rounded-xl border border-dashed bg-stone-50 p-4 text-sm text-muted-foreground">
                Dinheiro que entra - gastos - perdas = lucro.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-none">
            <CardHeader>
              <CardTitle>O que olhar primeiro</CardTitle>
              <CardDescription>
                O que mais ajuda a fazer sobrar dinheiro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.slice(0, 3).map((item, index) => (
                <div key={`${item.tag}-${item.title}`} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{item.title}</p>
                        <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>{item.tag}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!recommendations.length ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhum alerta agora. A operação está tranquila.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-2xl shadow-none">
            <CardHeader>
              <CardTitle>Arquivos usados</CardTitle>
              <CardDescription>Os arquivos que fazem a conta andar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topFiles.length ? (
                topFiles.map((file) => (
                  <div key={file.importId} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{file.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {file.reportType} · {dateRangeLabel(file.dateFrom, file.dateTo)}
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
          <Card className="rounded-2xl shadow-none">
            <CardHeader>
              <CardTitle>Conector Zé Delivery</CardTitle>
              <CardDescription>Credenciais e leitura direta da API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-xl border bg-white p-4">
                <p className="font-medium">Status</p>
                <p className="text-muted-foreground">
                  {apiCredentialsQuery.data ? "Credenciais salvas" : "Ainda não configurado"}
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
                <Button variant="outline" size="sm" onClick={() => void apiCredentialsQuery.refetch()}>
                  Recarregar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-none">
            <CardHeader>
              <CardTitle>KPI da API</CardTitle>
              <CardDescription>Quando existir merchant configurado, a tela lê direto da origem.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <StatCard title="Receita API" value={money(Number(apiKpi?.grossRevenue ?? 0))} helper="vindo da API" icon={Boxes} />
              <StatCard title="Margem API" value={money(Number(apiKpi?.netMargin ?? 0))} helper="vindo da API" icon={TrendingUp} />
              <StatCard title="Pedidos" value={apiKpi?.totalOrders ?? 0} helper="total lido da API" icon={Warehouse} />
              <StatCard title="Cancelados" value={apiKpi?.cancelledOrders ?? 0} helper="eventos operacionais" icon={Truck} />
            </CardContent>
          </Card>
        </section>
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
              <strong className="text-stone-900">Conta fechada</strong> quer dizer que os arquivos principais já estão dentro e o número pode ser usado com confiança.
            </p>
            <p>
              <strong className="text-stone-900">Conta incompleta</strong> quer dizer que falta um arquivo importante. O painel ajuda, mas não deve ser tratado como lucro final.
            </p>
            <p>
              Para fazer sobrar mais, o dono precisa olhar primeiro venda, entrega e perda.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
