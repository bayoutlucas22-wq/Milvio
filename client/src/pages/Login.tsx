import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

export default function Login() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [merchantIds, setMerchantIds] = useState("");

  const merchantList = useMemo(
    () => merchantIds.split(",").map((item) => item.trim()).filter(Boolean),
    [merchantIds]
  );

  const saveCredentialsMutation = trpc.api.setCredentials.useMutation();
  const verifyCredentialsMutation = trpc.api.verifyCredentials.useMutation();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_45%,#e2e8f0_100%)] px-4 py-6 text-slate-950 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <Badge className="rounded-full bg-slate-950 px-3 py-1 text-slate-50">Login</Badge>
          <Link href="/owner">
            <Button variant="outline" size="sm" className="rounded-full bg-white/80 backdrop-blur">
              Voltar
            </Button>
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <Badge variant="outline" className="rounded-full border-sky-300 bg-white/70 px-3 py-1">
              Um login, duas entradas
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Entre no app e valide o Zé Delivery no mesmo lugar.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Primeiro você autentica o app. Depois salva as credenciais do Zé Delivery ou entra
                em modo demo para validar o fluxo agora e trocar pela chave real amanhã.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-[26px] border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                <CardContent className="p-5">
                  <Sparkles className="mb-4 h-8 w-8 text-sky-600" />
                  <p className="text-sm text-slate-500">App</p>
                  <p className="mt-1 text-xl font-semibold">OAuth oficial</p>
                </CardContent>
              </Card>
              <Card className="rounded-[26px] border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                <CardContent className="p-5">
                  <ShieldCheck className="mb-4 h-8 w-8 text-emerald-600" />
                  <p className="text-sm text-slate-500">Zé Delivery</p>
                  <p className="mt-1 text-xl font-semibold">Credenciais + validação</p>
                </CardContent>
              </Card>
              <Card className="rounded-[26px] border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                <CardContent className="p-5">
                  <ExternalLink className="mb-4 h-8 w-8 text-amber-600" />
                  <p className="text-sm text-slate-500">Portal</p>
                  <p className="mt-1 text-xl font-semibold">seu.ze.delivery</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="rounded-[32px] border-white/70 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <CardHeader>
                <CardTitle>Entrar no app</CardTitle>
                <CardDescription>Abra o fluxo de autenticação principal.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg" onClick={() => (window.location.href = getLoginUrl())}>
                  Entrar com OAuth
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[32px] border-white/70 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <CardHeader>
                <CardTitle>Vincular Zé Delivery</CardTitle>
                <CardDescription>Use os mesmos dados do merchant para salvar e validar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Client ID</span>
                  <Input value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="Cole o client id" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Client Secret</span>
                  <Input
                    value={clientSecret}
                    onChange={(event) => setClientSecret(event.target.value)}
                    type="password"
                    placeholder="Cole o client secret"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Merchant IDs</span>
                  <Input
                    value={merchantIds}
                    onChange={(event) => setMerchantIds(event.target.value)}
                    placeholder="merchant-1, merchant-2"
                  />
                </label>
                <p className="text-xs text-slate-500">
                  Confirme o acesso no portal{" "}
                  <a
                    href="https://seu.ze.delivery"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-sky-700 underline-offset-4 hover:underline"
                  >
                    seu.ze.delivery
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <span className="block pt-1">
                    Deixe Client ID e Client Secret vazios para abrir a versão mock hoje.
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      saveCredentialsMutation.mutate({
                        clientId,
                        clientSecret,
                        merchantIds: merchantList.length > 0 ? merchantList : ["demo-merchant"],
                      })
                    }
                  >
                    Salvar e vincular
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      verifyCredentialsMutation.mutate({
                        clientId,
                        clientSecret,
                        merchantId: merchantList[0] ?? "demo-merchant",
                      })
                    }
                  >
                    Validar agora
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
