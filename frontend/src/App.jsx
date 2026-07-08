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
  CircleDollarSign,
  GitFork,
  GraduationCap,
  PackageSearch,
  Route,
  WalletCards,
} from 'lucide-react'
import fallbackAnalytics from './analytics.json'
import { compactDate, integer, money, monthLabel } from './lib/format'

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
  { id: 'overview', label: 'Painel', icon: ChartNoAxesCombined },
  { id: 'losses', label: 'Perdas', icon: CircleDollarSign },
  { id: 'trend', label: 'Semanas', icon: Route },
  { id: 'operation', label: 'Operação', icon: PackageSearch },
  { id: 'map', label: 'Mapa', icon: GitFork },
  { id: 'study', label: 'Estudo', icon: GraduationCap },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [payload, setPayload] = useState({ source: 'bundle', data: fallbackAnalytics })
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
            <p className="section-kicker">base: {analytics.scope.source}</p>
            <h1>Análise financeira dos reports</h1>
          </div>
          <div className="topbar-meta">
            <span>fonte: {payload.source}</span>
            <span>{integer(analytics.scope.report_rows)} linhas</span>
            <span>{analytics.scope.weeks} semanas</span>
            <span>{analytics.scope.months} meses</span>
          </div>
        </header>

        <section className="view-title">
          <ActiveIcon size={22} />
          <span>{TABS.find((tab) => tab.id === activeTab)?.label}</span>
        </section>

        {activeTab === 'overview' && <OverviewTab data={analytics} />}
        {activeTab === 'losses' && <LossesTab data={analytics} />}
        {activeTab === 'trend' && <TrendTab data={analytics} />}
        {activeTab === 'operation' && <OperationTab data={analytics} />}
        {activeTab === 'map' && <MapTab data={analytics} />}
        {activeTab === 'study' && <StudyTab data={analytics} />}
      </main>
    </div>
  )
}

function OverviewTab({ data }) {
  const componentRows = toComponentRows(data.components.totals)

  return (
    <div className="tab-grid">
      <MetricStrip
        items={[
          ['Resultado proxy', money(data.headline.proxy_total)],
          ['Semana mais forte', data.headline.strongest_week.week_label],
          ['Semana mais fraca', data.headline.weakest_week.week_label],
          ['Arquivos JSON', integer(data.scope.json_files)],
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
          ['Maior perda', data.components.losses[0]?.label ?? '-'],
          ['Valor da maior perda', money(data.components.losses[0]?.value ?? 0)],
          ['Ajuste manual liquido', money(data.components.totals.manual_payments)],
          ['Incentivos liquidos', money(data.components.totals.incentives)],
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
  return (
    <div className="tab-grid two-col">
      <Panel title="Produtos que mais explicam margem">
        <div className="product-grid">
          {data.breakdowns.top_products.map((row) => (
            <div className="product-row" key={row.product}>
              <strong>{row.product}</strong>
              <span>{integer(row.units)} unidades</span>
              <b>{money(row.markup_total + row.commission_total)}</b>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Frete por entregador">
        <RankList rows={data.breakdowns.top_drivers} detail="restituição de frete" />
      </Panel>

      <Panel title="Tipo de entrega">
        <RankList rows={data.breakdowns.delivery_types} detail="restituição por tipo de entrega" />
      </Panel>

      <Panel title="Promoções por origem">
        <RankList rows={data.breakdowns.promotion_buckets} detail="restituição promocional" />
      </Panel>
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
          <FlowNode title="Perdas e repasses" subtitle="comissão, frete, promo, markup, incentivo" tone="analysis" />
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
            'O app enxerga repasse, comissão, frete, promoção, markup, incentivo e pagamentos manuais.',
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

function MetricStrip({ items }) {
  return (
    <div className="metric-strip">
      {items.map(([label, value]) => (
        <div className="metric-tile" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
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
