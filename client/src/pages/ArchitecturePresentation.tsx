import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Database,
  FileSpreadsheet,
  Layers3,
  LayoutDashboard,
  Server,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";

const phoneTabs = [
  { id: "context", label: "Contexto", icon: Building2 },
  { id: "containers", label: "Containers", icon: Layers3 },
  { id: "components", label: "Fluxo", icon: Server },
  { id: "metrics", label: "Valor", icon: Wallet },
] as const;

const containers = [
  {
    title: "App Mobile Dashboard",
    text: "Interface usada por operacao e financeiro para upload, selecao de planilhas e leitura de fechamento diario.",
    icon: Smartphone,
    tone: "bg-sky-500/10 text-sky-700 border-sky-200",
  },
  {
    title: "API de Ingestao",
    text: "Recebe Excel, identifica layout, parseia abas e normaliza os dados para consulta rapida.",
    icon: Server,
    tone: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
  {
    title: "Banco MySQL",
    text: "Persiste fechamentos diarios, historico, resumos importados e catalogo de arquivos.",
    icon: Database,
    tone: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
  {
    title: "Staging de Excel",
    text: "Armazena o .xlsx original como fonte de verdade para auditoria e reprocessamento.",
    icon: FileSpreadsheet,
    tone: "bg-rose-500/10 text-rose-700 border-rose-200",
  },
];

const flowSteps = [
  "Loja exporta os relatorios do Ze Delivery em Excel.",
  "Usuario sobe o arquivo no app ou escolhe um import ja staged.",
  "Backend assimila o workbook inteiro, nao so o total final.",
  "Sistema quebra por pedidos, entregadores, frete, markup, cupom e marketplace.",
  "Os dados sao agregados por dia e viram historico de fechamento.",
  "Dashboard mostra margem, custo loja, custo motoboys e valor final.",
];

const valueCards = [
  { label: "Fonte de verdade", value: "XLSX staged", helper: "arquivo bruto preservado" },
  { label: "Leitura operacional", value: "Diaria", helper: "por dia e por periodo" },
  { label: "Regra central", value: "Custo loja + motoboys", helper: "valor final acompanhado" },
  { label: "Visao executiva", value: "Margem e restituicao", helper: "pronta para decisao" },
];

export default function ArchitecturePresentation() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_45%,#e2e8f0_100%)] px-4 py-6 text-slate-950 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="outline" size="sm" className="rounded-full bg-white/80 backdrop-blur">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Badge className="rounded-full bg-slate-950 px-3 py-1 text-slate-50">Presentation Mode</Badge>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <Badge variant="outline" className="rounded-full border-sky-300 bg-white/70 px-3 py-1">
              C4 • Ze Delivery Management
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                App de gestao operacional e margem para lojas parceiras do Ze Delivery.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                A proposta vira uma historia simples para apresentar: recebemos Excel, assimilamos o
                workbook inteiro, transformamos em fechamento diario e mostramos tudo num app com cara
                de produto pronto para operar.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-[28px] border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                <CardContent className="p-5">
                  <LayoutDashboard className="mb-4 h-8 w-8 text-sky-600" />
                  <p className="text-sm text-slate-500">Produto</p>
                  <p className="mt-1 text-xl font-semibold">Dashboard mobile-first</p>
                </CardContent>
              </Card>
              <Card className="rounded-[28px] border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                <CardContent className="p-5">
                  <FileSpreadsheet className="mb-4 h-8 w-8 text-emerald-600" />
                  <p className="text-sm text-slate-500">Entrada</p>
                  <p className="mt-1 text-xl font-semibold">Excel multilayout</p>
                </CardContent>
              </Card>
              <Card className="rounded-[28px] border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                <CardContent className="p-5">
                  <BarChart3 className="mb-4 h-8 w-8 text-amber-600" />
                  <p className="text-sm text-slate-500">Saida</p>
                  <p className="mt-1 text-xl font-semibold">Margem e fechamento</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[390px] rounded-[42px] border border-slate-900/10 bg-slate-950 p-3 shadow-[0_40px_100px_rgba(15,23,42,0.30)]">
              <div className="rounded-[34px] bg-[linear-gradient(180deg,#f8fafc_0%,#edf4ff_38%,#f8fafc_100%)] px-4 pb-4 pt-3">
                <div className="mx-auto mb-4 h-1.5 w-24 rounded-full bg-slate-900/70" />

                <div className="rounded-[28px] bg-slate-950 px-4 py-4 text-white shadow-[0_16px_30px_rgba(15,23,42,0.22)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">Ze Delivery</p>
                      <p className="mt-1 text-2xl font-semibold">Management</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <Smartphone className="h-6 w-6 text-sky-200" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    O app converte relatorios operacionais em controle diario de margem, custos e restituicao.
                  </p>
                </div>

                <div className="mt-4 grid gap-3">
                  <Card className="rounded-[24px] border-white bg-white/85 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">Regra central</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">
                            Valor final = custo loja + custo motoboys
                          </p>
                        </div>
                        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                          <Wallet className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-3">
                    {valueCards.map((item) => (
                      <Card key={item.label} className="rounded-[22px] border-white bg-white/90 shadow-none">
                        <CardContent className="p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.value}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{item.helper}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 rounded-[24px] bg-white/90 p-2 shadow-[0_10px_30px_rgba(148,163,184,0.18)]">
                  {phoneTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <div
                        key={tab.id}
                        className={`flex flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-center ${
                          tab.id === "context" ? "bg-slate-950 text-white" : "text-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] font-medium">{tab.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-[32px] border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Contexto</p>
                  <h2 className="text-2xl font-semibold">Onde o sistema entra</h2>
                </div>
              </div>
              <div className="space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  A loja recebe planilhas do Ze Delivery, mas precisa transformar isso em leitura de negocio.
                  O app entra entre o Excel bruto e a decisao operacional.
                </p>
                <div className="rounded-[24px] bg-slate-950 p-5 text-white">
                  <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">Atores</p>
                  <p className="mt-2 text-base font-medium">
                    Operacao da loja, financeiro, gestor logistico, Ze Delivery e motoboys.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Containers</p>
                  <h2 className="text-2xl font-semibold">Blocos da solucao</h2>
                </div>
              </div>
              <div className="grid gap-3">
                {containers.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className={`rounded-[24px] border p-4 ${item.tone}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-white/70 p-3">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="mt-1 text-sm leading-6">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <Card className="rounded-[32px] border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Fluxo do app</p>
                  <h2 className="text-2xl font-semibold">Do Excel ao fechamento</h2>
                </div>
              </div>
              <div className="space-y-3">
                {flowSteps.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Valor de negocio</p>
                  <h2 className="text-2xl font-semibold">Por que isso importa</h2>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-[24px] bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-5 text-white">
                  <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">Mensagem de pitch</p>
                  <p className="mt-3 text-lg leading-8">
                    O produto troca fechamento manual em planilha por uma leitura diaria de margem, custo e restituicao.
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-950">Reduz trabalho manual</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Menos consolidacao manual e menos risco de erro operacional.</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-950">Cria historico confiavel</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Cada Excel pode ser staged, reprocessado e auditado depois.</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-950">Prepara integracao futura</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Hoje com Excel, amanha com conectores e ingestao automatica.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
