import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  Database,
  PackageSearch,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import fallbackAnalytics from './analytics.json'
import { compactDate, integer, money, monthLabel } from './lib/format'
import FaturamentoTab from './FaturamentoTab'

const REPORT_LABELS = {
  commissions: 'Comissões',
  promotions: 'Promoções',
  freight: 'Fretes',
  incentives: 'Incentivos',
  markup: 'Markup',
  manual_payments: 'Pagamentos manuais',
}

const COMPONENT_COLORS = {
  commissions: '#c0392b',
  promotions: '#2f8f46',
  freight: '#277da1',
  incentives: '#e09f3e',
  markup: '#4f772d',
  manual_payments: '#8d3f2f',
  proxy_total: '#1b4332',
}

const TABS = [
  { id: 'faturamento', label: 'Faturamento', icon: ChartNoAxesCombined },
  { id: 'integracoes', label: 'Integrações', icon: ArrowRight },
  { id: 'operation', label: 'Operação', icon: PackageSearch },
  { id: 'faturamento_v2', label: 'Faturamento v2', icon: TrendingUp },
  { id: 'mongo', label: 'Mongo', icon: Database },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('faturamento')
  const [payload, setPayload] = useState({ source: 'bundle', data: fallbackAnalytics })
  const [faturamentoV2, setFaturamentoV2] = useState({ loading: true, data: null, error: '' })
  const [mongoPayload, setMongoPayload] = useState({ loading: true, data: null, error: '' })
  const ActiveIcon = TABS.find((tab) => tab.id === activeTab)?.icon ?? Boxes
  const analytics = payload.data

  useEffect(() => {
    let active = true
    fetch('/api/analytics')
      .then((response) => {
        if (!response.ok) throw new Error(`analytics request failed: ${response.status}`)
        return response.json()
      })
      .then((response) => {
        if (active) setPayload({ source: response.source ?? 'api', data: response.data })
      })
      .catch(() => {
        if (active) setPayload({ source: 'bundle', data: fallbackAnalytics })
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/timeline_monthly.json').then((response) => {
        if (!response.ok) throw new Error(`timeline monthly request failed: ${response.status}`)
        return response.json()
      }),
      fetch('/timeline_daily.json').then((response) => {
        if (!response.ok) throw new Error(`timeline daily request failed: ${response.status}`)
        return response.json()
      }),
    ])
      .then(([monthly, daily]) => {
        if (active) setFaturamentoV2({ loading: false, data: { monthly, daily }, error: '' })
      })
      .catch((error) => {
        if (active) setFaturamentoV2({ loading: false, data: null, error: error.message })
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/mongo/overview')
      .then((response) => {
        if (!response.ok) throw new Error(`mongo request failed: ${response.status}`)
        return response.json()
      })
      .then((response) => {
        if (active) setMongoPayload({ loading: false, data: response, error: '' })
      })
      .catch((error) => {
        if (active) setMongoPayload({ loading: false, data: null, error: error.message })
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="analysis-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">M</span>
          <div>
            <strong>APP-milvio</strong>
            <small>Relatórios Zé Delivery</small>
          </div>
        </div>

        <nav className="side-tabs" aria-label="Navegação principal">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'side-tab active' : 'side-tab'}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                title={tab.label}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="section-kicker">jul/2025 → jul/2026 · 267 dias · {integer(analytics.scope.json_files)} artifacts</p>
            <h1>Milvio — Dashboard Financeiro Zé Delivery</h1>
          </div>
        </header>

        <section className="view-title">
          <ActiveIcon size={22} />
          <span>{TABS.find((tab) => tab.id === activeTab)?.label}</span>
        </section>

        {activeTab === 'faturamento' && <FaturamentoTab />}
        {activeTab === 'integracoes' && <IntegracoesTab />}
        {activeTab === 'operation' && <OperationTab data={analytics} />}
        {activeTab === 'faturamento_v2' && <FaturamentoV2Tab state={faturamentoV2} />}
        {activeTab === 'mongo' && <MongoTab state={mongoPayload} />}
      </main>
    </div>
  )
}

function SalesTab({ sales }) {
  const daily = sales.daily.map((row) => ({
    ...row,
    label: compactDate(row.data),
    day: row.data.slice(-2),
  }))
  const activeDays = daily.filter((row) => row.faturamento_vendas > 0)
  const strongestDay = activeDays.reduce((best, row) => (
    row.faturamento_vendas > best.faturamento_vendas ? row : best
  ), activeDays[0])
  const averageActiveDay = sales.faturamento_vendas_total / Math.max(activeDays.length, 1)
  const sourceRows = Object.entries(sales.source_totals_before_dedupe).map(([key, value]) => ({
    key,
    label: REPORT_LABELS[key] ?? key,
    value,
  }))

  return (
    <div className="tab-grid sales-view">
      <MetricStrip
        items={[
          ['Faturamento vendas', money(sales.faturamento_vendas_total), 'Soma de (quantidade × preço unitário) por linha de produto. Não inclui frete, promoções nem restituições. Não é o valor recebido — é a receita bruta estimada de mercadoria.'],
          ['Pedidos com produto', integer(sales.pedidos_com_linha_de_produto), 'Pedidos que possuem pelo menos uma linha de produto nos artifacts. Pedidos sem produto no report (ex: apenas frete) não entram nessa conta.'],
          ['Média por dia ativo', money(averageActiveDay), 'Faturamento total dividido pelos dias com ao menos um pedido registrado. Dias sem nenhum pedido no report são excluídos da média.'],
          ['Melhor dia', `${strongestDay.label} · ${money(strongestDay.faturamento_vendas)}`, 'Dia com o maior faturamento de produto no mês. Pode ser influenciado por pedidos de alto ticket ou lotes atípicos.'],
        ]}
      />

      <Panel title="Faturamento dia a dia">
        <p className="panel-note">
          Dezembro/2025 calculado por produto vendido: unidades x preço unitário. Frete, restituições e promoções não entram como venda.
        </p>
        <ChartFrame>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={(value) => shortMoney(value)} />
              <Tooltip
                formatter={(value, name) => [
                  name === 'faturamento_vendas' ? money(value) : integer(value),
                  name === 'faturamento_vendas' ? 'Faturamento' : 'Pedidos',
                ]}
                labelFormatter={(_, rows) => rows?.[0]?.payload?.label ?? 'Dia'}
              />
              <Bar dataKey="faturamento_vendas" name="Faturamento" fill={COMPONENT_COLORS.proxy_total} radius={[5, 5, 0, 0]} />
              <Line dataKey="pedidos_com_linha_de_produto" name="Pedidos" stroke={COMPONENT_COLORS.blue} strokeWidth={2.5} dot={false} />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Panel>

      <Panel title="Origem do cálculo">
        <div className="sales-split">
          <ChartFrame>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sourceRows} dataKey="value" nameKey="label" innerRadius={58} outerRadius={96} paddingAngle={4}>
                  {sourceRows.map((row) => (
                    <Cell key={row.key} fill={row.key === 'markup' ? COMPONENT_COLORS.markup : COMPONENT_COLORS.commissions} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="sales-source-cards">
            {sourceRows.map((row) => (
              <div className="sales-source-card" key={row.key}>
                <span>{row.label}</span>
                <strong>{money(row.value)}</strong>
                <small>
                  {integer(sales.source_rows[row.key])} linhas · {integer(sales.source_orders[row.key])} pedidos
                </small>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Leitura rápida para dono">
        <div className="owner-reading">
          <strong>O número de venda do período é {money(sales.faturamento_vendas_total)}.</strong>
          <span>
            Ele representa mercadoria vendida nos reports de comissões e markup, não lucro líquido. O próximo passo é descontar custo da mercadoria,
            comissão, frete, impostos e operação.
          </span>
          <span>
            Os maiores dias foram datas de fim de ano, especialmente {strongestDay.label}. Dias zerados indicam ausência de linhas nesta pasta,
            não necessariamente loja fechada.
          </span>
        </div>
      </Panel>

      <Panel title="Tabela diária">
        <div className="sales-table">
          {daily.map((row) => (
            <div className={row.faturamento_vendas === 0 ? 'sales-row muted' : 'sales-row'} key={row.data}>
              <strong>{row.label}</strong>
              <span>{integer(row.pedidos_com_linha_de_produto)} pedidos com produto</span>
              <b>{money(row.faturamento_vendas)}</b>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function OverviewTab({ data }) {
  const componentRows = toComponentRows(data.components.totals)

  return (
    <div className="tab-grid">
      <MetricStrip
        items={[
          ['Resultado proxy', money(data.headline.proxy_total), 'Soma de todos os componentes: markup + incentivos - comissões - frete - promoções - pagamentos manuais. Não é lucro líquido — não inclui custo de produto, impostos ou despesas internas.'],
          ['Semana mais forte', data.headline.strongest_week.week_label, 'Semana com o maior resultado proxy no período. Pode ser influenciada por ajustes manuais pontuais.'],
          ['Semana mais fraca', data.headline.weakest_week.week_label, 'Semana com o menor resultado proxy. Verifique se houve lançamentos negativos atípicos ou alta de comissões.'],
          ['Arquivos JSON', integer(data.scope.json_files), 'Quantidade de artifacts brutos processados. Cada arquivo representa um artifact semanal ou mensal do Zé Delivery.'],
        ]}
      />

      <Panel title="Composição financeira">
        <ChartFrame>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={componentRows} layout="vertical" margin={{ left: 28, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => shortMoney(value)} />
              <YAxis dataKey="label" type="category" width={132} />
              <Tooltip formatter={(value) => money(value)} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {componentRows.map((entry) => (
                  <Cell key={entry.key} fill={entry.value < 0 ? COMPONENT_COLORS.commissions : COMPONENT_COLORS[entry.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Panel>

      <Panel title="Linha do resultado semanal">
        <ChartFrame>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.series.weekly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week_label" />
              <YAxis tickFormatter={(value) => shortMoney(value)} />
              <Tooltip formatter={(value) => money(value)} labelFormatter={(label) => `Semana ${label}`} />
              <Bar dataKey="promotions" name="Promoções" fill={COMPONENT_COLORS.promotions} radius={[4, 4, 0, 0]} />
              <Bar dataKey="markup" name="Markup" fill={COMPONENT_COLORS.markup} radius={[4, 4, 0, 0]} />
              <Line dataKey="proxy_total" name="Resultado proxy" stroke={COMPONENT_COLORS.proxy_total} strokeWidth={3} dot={false} />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Panel>
    </div>
  )
}

function LossesTab({ data }) {
  const losses = data.components.losses.map((item) => ({ ...item, abs: Math.abs(item.value) }))
  const manual = data.breakdowns.manual_types

  return (
    <div className="tab-grid two-col">
      <MetricStrip
        items={[
          ['Maior perda', data.components.losses[0]?.label ?? '-', 'Componente financeiro com maior impacto negativo no período. Pode ser comissão, frete ou promoção — depende do mix de reports carregados.'],
          ['Valor da maior perda', money(data.components.losses[0]?.value ?? 0), '⚠️ Valor pode estar subestimado. Ele reflete apenas os artifacts processados. Reports faltando, erros de mapeamento de campo ou lançamentos duplicados podem distorcer esse número.'],
          ['Ajuste manual liquido', money(data.components.totals.manual_payments), 'Soma líquida dos pagamentos manuais lançados pelo Zé Delivery. Pode ser positivo (crédito) ou negativo (débito). Verifique os registros individualmente na lista abaixo.'],
          ['Incentivos liquidos', money(data.components.totals.incentives), 'Total de incentivos recebidos no período. Valores positivos aumentam o resultado. Confirme com o extrato oficial — algumas semanas podem não ter report de incentivos.'],
        ]}
      />

      <Panel title="Para onde vai a perda">
        <ChartFrame>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={losses} dataKey="abs" nameKey="label" innerRadius={64} outerRadius={110} paddingAngle={3}>
                {losses.map((entry) => (
                  <Cell key={entry.key} fill={COMPONENT_COLORS[entry.key] ?? '#c0392b'} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => money(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Panel>

      <Panel title="Pagamentos manuais por tipo">
        <RankList rows={manual} detail="saldo de pagamento manual" signed />
      </Panel>

      <Panel title="Descrições negativas">
        <RankList rows={data.breakdowns.manual_descriptions_negative} detail="saldo negativo identificado" signed />
      </Panel>
    </div>
  )
}

function TrendTab({ data }) {
  const monthly = data.series.monthly.map((item) => ({ ...item, label: monthLabel(item.month_key) }))

  return (
    <div className="tab-grid">
      <Panel title="Semana por semana">
        <ChartFrame>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={data.series.weekly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week_label" />
              <YAxis tickFormatter={(value) => shortMoney(value)} />
              <Tooltip formatter={(value) => money(value)} />
              <Bar dataKey="commissions" name="Comissões" fill={COMPONENT_COLORS.commissions} />
              <Bar dataKey="manual_payments" name="Pag. manuais" fill={COMPONENT_COLORS.manual_payments} />
              <Line dataKey="proxy_total" name="Resultado proxy" stroke={COMPONENT_COLORS.proxy_total} strokeWidth={3} />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Panel>

      <Panel title="Mês por mês">
        <ChartFrame>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(value) => shortMoney(value)} />
              <Tooltip formatter={(value) => money(value)} />
              <Bar dataKey="proxy_total" name="Resultado proxy" fill={COMPONENT_COLORS.proxy_total} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Panel>

      <Panel title="Datas das semanas">
        <div className="data-table">
          {data.series.weekly.map((row) => (
            <div key={row.week_key} className="data-row">
              <strong>Semana {row.week_label}</strong>
              <span>{compactDate(row.start_date)} a {compactDate(row.end_date)}</span>
              <b className={row.proxy_total < 0 ? 'negative' : 'positive'}>{money(row.proxy_total)}</b>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function OperationTab({ data }) {
  const FAT_BRUTO     = 295558.50  // reference only — what customers paid to Zé
  const totalComm     = data.components.totals.commissions
  const proxyTotal    = data.headline.proxy_total  // what Zé actually pays Milvinho
  const topProducts   = data.breakdowns.top_products

  return (
    <div className="tab-grid two-col">

      {/* Context strip */}
      <div className="operation-summary-grid">
        {[
          { label: 'Faturamento (referência)', value: FAT_BRUTO, sub: 'o que clientes pagaram ao Zé', color: '#60a5fa' },
          { label: 'Comissão cobrada', value: totalComm, sub: `${(Math.abs(totalComm)/FAT_BRUTO*100).toFixed(1)}% do faturamento`, color: '#ef4444' },
          { label: '= Resultado transferido', value: proxyTotal, sub: `~${money(Math.round(proxyTotal/14))}/semana`, color: 'var(--green)', big: true },
        ].map(item => (
          <div key={item.label} className="metric-tile">
            <span>{item.label}</span>
            <strong style={{ color: item.color, fontSize: item.big ? '20px' : '16px' }}>{money(item.value)}</strong>
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{item.sub}</span>
          </div>
        ))}
      </div>

      <div style={{ gridColumn: '1/-1', color: 'var(--muted)', fontSize: '13px', lineHeight: 1.55, marginTop: '-2px' }}>
        Esses três cards são o resumo do período. Os blocos abaixo mostram de onde sai cada pedaço do saldo: por produto, por entregador, por tipo de entrega e por origem das promoções.
      </div>

      <Panel title="Produtos que mais contribuem ao resultado">
        <div className="panel-explain">
          Markup + Comissão por produto = contribuição líquida ao resultado do Zé.
          Produtos com markup alto e comissão baixa são os mais rentáveis.
        </div>
        <div className="product-grid">
          {topProducts.map((row) => {
            const net = row.markup_total + row.commission_total
            return (
              <div className="product-row" key={row.product}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>{row.product}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{integer(row.units)} un · markup {money(row.markup_total)} · comissão {money(row.commission_total)}</span>
                  <div style={{ marginTop: '4px', height: '4px', borderRadius: '4px', background: '#e5ece1', overflow: 'hidden', width: '100%' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, (Math.abs(net) / Math.abs(topProducts[0].markup_total + topProducts[0].commission_total)) * 100))}%`,
                      background: net >= 0 ? 'var(--green)' : '#c0392b',
                      borderRadius: 'inherit',
                    }} />
                  </div>
                </div>
                <b style={{ color: net >= 0 ? 'var(--green)' : '#c0392b', flexShrink: 0, marginLeft: '12px' }}>{money(net)}</b>
              </div>
            )
          })}
        </div>
      </Panel>

      <Panel title="Frete por entregador">
        <div className="panel-explain">
          Subsídio logístico pago pelo Zé. Total: {money(data.components.totals.freight)} (parte do resultado).
          <span className="info-spot" title="Vem de data.breakdowns.top_drivers, que lista os principais entregadores e o valor de frete atribuído a cada um.">i</span>
        </div>
        <RankList rows={data.breakdowns.top_drivers} detail="restituição de frete" />
      </Panel>

      <Panel title="Tipo de entrega">
        <div className="panel-explain">
          Como as entregas aparecem nos artifacts. Aqui o dado vem de <code>data.breakdowns.delivery_types</code>.
          <span className="info-spot" title="Cada linha vem do resumo de entrega do período. Quando o tipo não aparece nos arquivos processados, o valor fica em zero.">i</span>
        </div>
        <div className="rank-list">
          {data.breakdowns.delivery_types.map((row) => (
            <div className="rank-row" key={row.label}>
              <div>
                <strong>{row.label} <span className="info-spot" title={row.value === 0 ? '0 porque não apareceu lançamento desse tipo nos reports importados deste período.' : 'Valor consolidado a partir das linhas de entrega desse tipo nos reports importados.'}>i</span></strong>
                <span>tipo de entrega no período</span>
              </div>
              <div className="rank-meter">
                <i style={{ width: `${Math.max(6, (Math.abs(row.value) / Math.max(...data.breakdowns.delivery_types.map((entry) => Math.abs(entry.value)), 1)) * 100)}%` }} />
              </div>
              <b className={row.value < 0 ? 'negative' : 'positive'}>{money(row.value)}</b>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Promoções por origem">
        <div className="panel-explain">
          Campanhas do Zé que você participou. Total restituído: {money(data.components.totals.promotions)}.
          <span className="info-spot" title="Vem de data.breakdowns.promotion_buckets. Cupom, Desconto Zé e Brindes são os agrupamentos que o app conseguiu distinguir nos reports." >i</span>
        </div>
        <RankList rows={data.breakdowns.promotion_buckets} detail="restituição promocional" />
      </Panel>
    </div>
  )
}

function IntegracoesTab() {
  const cards = [
    {
      title: 'Authentication',
      short: 'Primeiro passo',
      summary: 'OAuth2 `client_credentials` para obter o access token e liberar as rotas.',
      use: 'Usar antes de qualquer integração com a Seller Public API.',
      avoid: 'Não é rota de negócio. É só autenticação.',
    },
    {
      title: 'Reports',
      short: 'Dashboard e conciliação',
      summary: 'KPIs do PDV por `HOUR`, `DAY`, `WEEK` ou `MONTH` e repasses financeiros por pedido.',
      use: 'Quando o objetivo é entender resultado, conciliação e indicadores do estabelecimento.',
      avoid: 'Não serve para operar pedido em tempo real.',
    },
    {
      title: 'Orders',
      short: 'Ciclo do pedido',
      summary: 'Consulta, confirmação, solicitação de cancelamento, cancelamento direto e ajuste/restauração de itens.',
      use: 'Quando o pedido já existe e você precisa decidir o que fazer com ele.',
      avoid: 'Não é substituto de fila/eventos nem de catálogo.',
    },
    {
      title: 'Events',
      short: 'Polling de status',
      summary: 'Busca eventos pendentes e faz acknowledgment depois do processamento.',
      use: 'Quando a integração precisa acompanhar mudanças de status sem webhook.',
      avoid: 'Não usar como comando de operação, e o ack só confirma consumo.',
    },
    {
      title: 'Logistics',
      short: 'Entrega na rua',
      summary: 'Detalhe da entrega, pickupCode, começo de rota, chegada, validação de código e finalização/cancelamento.',
      use: 'Quando o entregador ou o sistema precisa executar a jornada da entrega.',
      avoid: 'Não usar para aceitar/cancelar pedido administrativamente.',
    },
    {
      title: 'Merchants',
      short: 'Loja / PDV',
      summary: 'Status do estabelecimento, metadados e abertura/fechamento da loja.',
      use: 'Quando o foco é disponibilidade do ponto e visão do merchant.',
      avoid: 'Não serve para SKU, pedido ou relatório financeiro.',
    },
    {
      title: 'Products',
      short: 'Catálogo',
      summary: 'Disponibilidade, itens, oferta/preço, promoções, lista de menu e catálogo externo.',
      use: 'Quando a integração mexe com catálogo e disponibilidade de produto.',
      avoid: 'Não usar para pedidos, repasse ou status operacional.',
    },
  ]

  return (
    <div className="tab-grid two-col integrations-view">
      <div className="work-panel integrations-hero" style={{ gridColumn: '1 / -1' }}>
        <h2>Integrações com a Seller Public API</h2>
        <p>
          A API organiza o negócio em blocos reais: autenticação, eventos, pedidos, logística, merchant, catálogo e reports.
          O jeito certo de integrar é seguir a intenção de cada grupo, não misturar uma rota de pedido com uma rota de report.
        </p>
      </div>

      <Panel title="Fluxo prático">
        <div className="flow-map integrations-flow">
          <FlowNode title="Auth" subtitle="pega token" tone="source" />
          <FlowArrow />
          <FlowNode title="Reports" subtitle="entende o negócio" tone="bridge" />
          <FlowArrow />
          <FlowNode title="Orders + Events" subtitle="acompanha o pedido" tone="analysis" />
          <FlowArrow />
          <FlowNode title="Logistics" subtitle="executa a entrega" tone="action" />
        </div>
      </Panel>

      <Panel title="Grupos da API">
        <div className="integration-card-grid">
          {cards.map((card) => (
            <div className="integration-card" key={card.title}>
              <div className="integration-card-head">
                <strong>{card.title}</strong>
                <span>{card.short}</span>
              </div>
              <p>{card.summary}</p>
              <div className="integration-tag"><b>Usar:</b> {card.use}</div>
              <div className="integration-tag"><b>Evitar:</b> {card.avoid}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="O que a documentação deixa claro">
        <StudyBlock
          rows={[
            'Reports é leitura: KPIs, repasses por pedido e incentivos semanais.',
            'Orders é decisão sobre o pedido: confirmar, cancelar, ajustar ou restaurar itens.',
            'Events é polling com acknowledgment, para não depender de webhook.',
            'Logistics cuida da jornada da entrega e do deliveryCode/pickupCode.',
            'Merchants cuida do PDV e da disponibilidade operacional da loja.',
            'Products cuida do catálogo e da disponibilidade dos SKUs.',
          ]}
        />
      </Panel>
    </div>
  )
}

function MongoTab({ state }) {
  const collections = state.data?.collections ?? []
  const totalDocs = collections.reduce((sum, item) => sum + (item.documents || 0), 0)
  const biggest = collections[0]

  return (
    <div className="tab-grid two-col mongo-view">
      <div className="work-panel mongo-hero" style={{ gridColumn: '1 / -1' }}>
        <h2>O que tem no Mongo</h2>
        <p>
          Essa tela mostra as coleções que já estão carregadas no banco, quantos documentos existem em cada uma e uma amostra do conteúdo.
          É a visão de inspeção para entender o que entrou de verdade no banco.
        </p>
      </div>

      <div className="operation-summary-grid">
        {[
          { label: 'Banco', value: state.data?.db ?? 'milvio', sub: 'base ativa do app', color: '#277da1' },
          { label: 'Coleções', value: collections.length, sub: 'tabelas do Mongo', color: '#1f7a3b' },
          { label: 'Documentos', value: totalDocs, sub: 'linhas somadas das coleções', color: '#b93b2f' },
        ].map((item) => (
          <div key={item.label} className="metric-tile">
            <span>{item.label}</span>
            <strong style={{ color: item.color }}>{item.value}</strong>
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{item.sub}</span>
          </div>
        ))}
      </div>

      <Panel title="Coleções carregadas">
        {state.loading && <div className="mongo-empty">Carregando o Mongo...</div>}
        {state.error && <div className="mongo-empty negative">Falha ao ler o Mongo: {state.error}</div>}
        {!state.loading && !state.error && (
          <div className="mongo-collection-list">
            {collections.map((collection) => (
              <MongoCollectionCard key={collection.name} collection={collection} />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Coleção maior">
        {biggest ? (
          <div className="mongo-focus">
            <div className="mongo-focus-head">
              <strong>{biggest.name}</strong>
              <span>{integer(biggest.documents)} documentos</span>
            </div>
            <p>Campos visíveis: {biggest.fields.join(', ') || 'sem campos amostrados'}</p>
            <pre>{JSON.stringify(biggest.sample, null, 2)}</pre>
          </div>
        ) : (
          <div className="mongo-empty">Ainda não há coleção para mostrar.</div>
        )}
      </Panel>
    </div>
  )
}

function FaturamentoV2Tab({ state }) {
  const monthly = state.data?.monthly ?? []
  const daily = state.data?.daily ?? []
  const yearlyMap = monthly.reduce((acc, row) => {
    const year = row.month.slice(0, 4)
    const bucket = acc[year] ?? {
      year,
      months: 0,
      days: 0,
      faturamento: 0,
      comissao: 0,
      markup: 0,
      frete: 0,
      desconto: 0,
      resultado_proxy: 0,
    }
    bucket.months += 1
    bucket.days += Number(row.days ?? 0)
    bucket.faturamento += Number(row.faturamento ?? 0)
    bucket.comissao += Number(row.comissao ?? 0)
    bucket.markup += Number(row.markup ?? 0)
    bucket.frete += Number(row.frete ?? 0)
    bucket.desconto += Number(row.desconto ?? 0)
    bucket.resultado_proxy += Number(row.resultado_proxy ?? 0)
    acc[year] = bucket
    return acc
  }, {})
  const years = Object.values(yearlyMap).sort((a, b) => a.year.localeCompare(b.year))
  const strongest = years.reduce((best, row) => (row.resultado_proxy > (best?.resultado_proxy ?? -Infinity) ? row : best), years[0] ?? null)
  const chartData = years.map((year) => ({
    year: year.year,
    faturamento: year.faturamento,
    comissao: year.comissao,
    markup: year.markup,
    frete: year.frete,
    desconto: year.desconto,
    resultado_proxy: year.resultado_proxy,
  }))

  return (
    <div className="tab-grid two-col faturamento-v2-view">
      <div className="work-panel faturamento-v2-hero" style={{ gridColumn: '1 / -1' }}>
        <h2>Faturamento v2 por ano</h2>
        <p>
          Aqui a conta é anual, computada direto do Mongo. Cada card mostra o que entrou e saiu por ano, sem misturar períodos.
        </p>
      </div>

      <div className="operation-summary-grid">
        {[
          { label: 'Anos computados', value: years.length, sub: 'anos encontrados na base', color: '#277da1' },
          { label: 'Base usada', value: 'timeline_*.json', sub: 'mesmos arquivos do Faturamento v1', color: '#1f7a3b' },
          { label: 'Melhor ano', value: strongest ? strongest.year : '-', sub: strongest ? money(strongest.resultado_proxy) : 'aguardando dados', color: '#b93b2f' },
        ].map((item) => (
          <div key={item.label} className="metric-tile">
            <span>{item.label}</span>
            <strong style={{ color: item.color }}>{item.value}</strong>
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{item.sub}</span>
          </div>
        ))}
      </div>

      <Panel title="Resumo anual">
        {!state.loading && !state.error && years.length > 0 && (
          <ChartFrame>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => shortMoney(value)} />
                <Tooltip formatter={(value) => money(value)} />
                <Bar dataKey="faturamento" name="Faturamento" fill="#277da1" stackId="a" />
                <Bar dataKey="resultado_proxy" name="Resultado" fill={COMPONENT_COLORS.proxy_total} radius={[6, 6, 0, 0]} />
                <Legend />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartFrame>
        )}
        {state.loading && <div className="mongo-empty">Carregando faturamento v2...</div>}
        {state.error && <div className="mongo-empty negative">Falha ao ler faturamento v2: {state.error}</div>}
        {!state.loading && !state.error && (
          <div className="faturamento-year-list">
            {years.map((year) => (
              <div className="faturamento-year-card" key={year.year}>
                <div className="mongo-card-head">
                  <div>
                    <strong>{year.year}</strong>
                    <span>{year.months} meses · {year.days} dias</span>
                  </div>
                  <b className={year.resultado_proxy < 0 ? 'negative' : 'positive'}>{money(year.resultado_proxy)}</b>
                </div>
                <div className="faturamento-year-grid">
                  <div><span>Faturamento</span><strong>{money(year.faturamento)}</strong></div>
                  <div><span>Comissão</span><strong>{money(year.comissao)}</strong></div>
                  <div><span>Markup</span><strong>{money(year.markup)}</strong></div>
                  <div><span>Frete</span><strong>{money(year.frete)}</strong></div>
                  <div><span>Promoções</span><strong>{money(year.desconto)}</strong></div>
                  <div><span>Resultado</span><strong>{money(year.resultado_proxy)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="O que muda aqui">
        <StudyBlock
          rows={[
            'A leitura usa os mesmos arquivos do Faturamento v1, só que resumidos por ano.',
            'O cálculo fica mais fácil de comparar porque o ano vira a unidade principal.',
            'Se um ano estiver estranho, o próximo passo é abrir o mês daquele período e conferir a linha a linha.',
          ]}
        />
      </Panel>
    </div>
  )
}

function MongoCollectionCard({ collection }) {
  const [showSample, setShowSample] = useState(false)
  return (
    <div className="mongo-card">
      <div className="mongo-card-head">
        <div>
          <strong>{collection.name}</strong>
          <span>{integer(collection.documents)} documentos</span>
        </div>
        <button type="button" className="mongo-sample-toggle" onClick={() => setShowSample((value) => !value)}>
          <RefreshCw size={14} />
          {showSample ? 'Fechar' : 'Ver amostra'}
        </button>
      </div>
      <div className="mongo-field-chips">
        {collection.fields.map((field) => (
          <span key={field}>{field}</span>
        ))}
      </div>
      {showSample && (
        <pre className="mongo-sample">{JSON.stringify(collection.sample, null, 2)}</pre>
      )}
    </div>
  )
}

function MapTab({ data }) {
  const reports = Object.entries(data.field_map.reports)

  return (
    <div className="tab-grid">
      <Panel title="Mindmap do fluxo">
        <div className="flow-map">
          <FlowNode title="Reports Zé" subtitle={`${data.scope.json_files} arquivos`} tone="source" />
          <FlowArrow />
          <FlowNode title="Pedidos, semanas e campos" subtitle={`${integer(data.scope.report_rows)} linhas mapeadas`} tone="bridge" />
          <FlowArrow />
          <FlowNode title="Perdas e transferências" subtitle="comissão, frete, promo, markup, incentivo" tone="analysis" />
          <FlowArrow />
          <FlowNode title="Decisão do dono" subtitle="preço, operação, produto e margem" tone="action" />
        </div>
      </Panel>

      <Panel title="Campos por relatório">
        <div className="field-grid">
          {reports.map(([key, report]) => (
            <div className="field-card" key={key}>
              <h3>{report.label}</h3>
              <small>{report.sheet_name}</small>
              <div className="field-tags">
                {report.fields.map((field) => (
                  <span key={field.name} className={`field-tag ${field.role}`}>
                    {field.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function StudyTab({ data }) {
  return (
    <div className="tab-grid two-col">
      <Panel title="Escopo real">
        <StudyBlock
          rows={[
            'A base vem apenas dos reports financeiros do Zé Delivery.',
            'O app enxerga resultado, comissão, frete, promoção, markup, incentivo e pagamentos manuais.',
            'Lucro líquido ainda depende de custo de produto, imposto, perda e despesa interna.',
          ]}
        />
      </Panel>
      <Panel title="Pergunta de dinheiro">
        <StudyBlock
          rows={[
            'Primeiro isolamos onde o dinheiro entra e onde sai.',
            'Depois cruzamos semana, produto, frete e pagamento manual.',
            'A resposta boa não é um número único; é o caminho da perda até a decisão.',
          ]}
        />
      </Panel>
      <Panel title="Notas de leitura">
        <StudyBlock rows={data.notes} />
      </Panel>
      <Panel title="Redis na arquitetura">
        <StudyBlock
          rows={[
            'Redis entra como cache para gráficos e agregações prontas.',
            'A fonte da verdade continua sendo o JSON bruto e a camada analítica derivada.',
            'Quando os reports mudarem, a aplicação recalcula e invalida o cache.',
          ]}
        />
      </Panel>
    </div>
  )
}

function MetricTile({ label, value, tooltip }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="metric-tile"
      style={{ position: 'relative', cursor: tooltip ? 'help' : 'default' }}
      onMouseEnter={() => tooltip && setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {label}
        {tooltip && (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: '#9aaa9e', flexShrink: 0 }}>
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <text x="8" y="12" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="700">?</text>
          </svg>
        )}
      </span>
      <strong>{value}</strong>
      {tooltip && show && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99,
          width: '240px',
          padding: '10px 12px',
          background: '#1b2820',
          color: '#e2ede5',
          fontSize: '12px',
          lineHeight: '1.5',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
        }}>
          {tooltip}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1b2820',
          }} />
        </div>
      )}
    </div>
  )
}

function MetricStrip({ items }) {
  return (
    <div className="metric-strip">
      {items.map(([label, value, tooltip]) => (
        <MetricTile key={label} label={label} value={value} tooltip={tooltip} />
      ))}
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section className="work-panel">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function ChartFrame({ children }) {
  return <div className="chart-frame">{children}</div>
}

function RankList({ rows, detail = 'valor no report', signed = false }) {
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1)
  return (
    <div className="rank-list">
      {rows.map((row) => {
        const value = Number(row.value ?? 0)
        return (
          <div className="rank-row" key={row.label}>
            <div>
              <strong>{row.label}</strong>
              <span>{detail}</span>
            </div>
            <div className="rank-meter">
              <i style={{ width: `${Math.max(6, (Math.abs(value) / max) * 100)}%` }} />
            </div>
            <b className={value < 0 ? 'negative' : 'positive'}>{money(value)}</b>
          </div>
        )
      })}
    </div>
  )
}

function FlowNode({ title, subtitle, tone }) {
  return (
    <div className={`flow-node ${tone}`}>
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </div>
  )
}

function FlowArrow() {
  return (
    <span className="flow-arrow">
      <ArrowRight size={20} />
    </span>
  )
}

function StudyBlock({ rows }) {
  return (
    <ul className="study-list">
      {rows.map((row) => (
        <li key={row}>{row}</li>
      ))}
    </ul>
  )
}

function toComponentRows(totals) {
  return Object.entries(totals).map(([key, value]) => ({
    key,
    label: REPORT_LABELS[key] ?? key,
    value,
  }))
}

function shortMoney(value) {
  const abs = Math.abs(Number(value ?? 0))
  const sign = Number(value) < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}R$${Math.round(abs / 1000)}k`
  return `${sign}R$${Math.round(abs)}`
}
