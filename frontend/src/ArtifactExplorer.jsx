import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts'
import { money, integer } from './lib/format'

// ── Tooltip tile ──────────────────────────────────────────────────────────────
function InfoTile({ label, value, valueStyle, tooltip }) {
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
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ color: '#9aaa9e', flexShrink: 0 }}>
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <text x="8" y="12" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="700">?</text>
          </svg>
        )}
      </span>
      <strong style={valueStyle}>{value}</strong>
      {tooltip && show && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)', zIndex: 99, width: '260px',
          padding: '10px 12px', background: '#1b2820', color: '#e2ede5',
          fontSize: '12px', lineHeight: '1.55', borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', pointerEvents: 'none',
        }}>
          {tooltip}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: '6px solid #1b2820',
          }} />
        </div>
      )}
    </div>
  )
}

// ── Component colours matching Zé model ───────────────────────────────────────
const COLORS = {
  promotions:      '#2e7d32',  // green — biggest gain
  markup:          '#4f772d',  // olive — markup gain
  freight:         '#277da1',  // blue — frete gain
  commissions:     '#c0392b',  // red — main cost
  incentives:      '#e09f3e',  // amber — varies
  manual_payments: '#7b5ea7',  // purple — manual
  proxy_total:     '#1b4332',  // ink — net
}

const LABELS = {
  promotions:      'Promoções',
  markup:          'Markup',
  freight:         'Frete',
  commissions:     'Comissões',
  incentives:      'Incentivos',
  manual_payments: 'Pag. Manuais',
  proxy_total:     'Resultado',
}

const TOOLTIPS = {
  promotions:
    'Zé banca os descontos/cupons dados ao cliente. Você não perde receita — o Zé te restitui o valor promocional integral. É o maior componente positivo.',
  markup:
    'Restituição da diferença entre o preço de venda e a referência da tabela Ambev. Quanto maior seu markup sobre a tabela, maior esse valor.',
  freight:
    'Zé te paga pelo custo logístico de entrega. Positivo = Zé subsidiou mais do que cobrou de frete nessa semana.',
  commissions:
    '⚠️ Único custo direto do Zé: % sobre cada pedido entregue. É cobrado como dedução do repasse. Valor negativo = custo para você.',
  incentives:
    'Pode ser positivo (bônus por bater meta semanal) ou negativo (dedução operacional). Fique de olho nas semanas em que vai negativo.',
  manual_payments:
    'Ajustes manuais lançados pelo Zé. Verificar individualmente — podem ser correções, estornos ou cobranças administrativas.',
  proxy_total:
    'Soma de todos os componentes: Promoções + Markup + Frete + Incentivos + Pag.Manuais − Comissões. NÃO inclui custo de mercadoria (CMV), impostos ou despesas internas.',
}

export default function ArtifactExplorer() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/artifacts/content?path=analytics.json')
      .then(r => r.json())
      .then(data => { setAnalytics(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: 'var(--muted)' }}>Carregando analytics...</p>
  if (!analytics) return <p style={{ color: 'var(--muted)' }}>Erro ao carregar analytics.json</p>

  const totals = analytics.components.totals
  const weekly = analytics.series.weekly
  const gains  = analytics.components.gains
  const losses = analytics.components.losses
  const proxy  = analytics.headline.proxy_total

  // Chart data — weekly all components
  const chartData = weekly.map(w => ({
    name: `Sem. ${w.week_label}`,
    Promoções:     w.promotions,
    Markup:        w.markup,
    Frete:         w.freight,
    Incentivos:    w.incentives,
    'Pag. Manuais': w.manual_payments,
    Comissões:     w.commissions,
    Resultado:     w.proxy_total,
  }))

  // Waterfall data for totals
  const waterfallOrder = ['promotions', 'markup', 'freight', 'incentives', 'manual_payments', 'commissions']
  const waterfallData = waterfallOrder.map(key => ({
    name: LABELS[key],
    value: Math.abs(totals[key]),
    raw: totals[key],
    fill: COLORS[key],
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>

      {/* KPI strip — all 6 components + resultado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <InfoTile
          label="Resultado Proxy"
          value={money(proxy)}
          valueStyle={{ color: proxy >= 0 ? 'var(--green)' : '#ef4444', fontSize: '22px' }}
          tooltip={TOOLTIPS.proxy_total}
        />
        <InfoTile
          label="Promoções (restituição)"
          value={money(totals.promotions)}
          valueStyle={{ color: 'var(--green)' }}
          tooltip={TOOLTIPS.promotions}
        />
        <InfoTile
          label="Markup (restituição)"
          value={money(totals.markup)}
          valueStyle={{ color: '#4f772d' }}
          tooltip={TOOLTIPS.markup}
        />
        <InfoTile
          label="Frete (restituição)"
          value={money(totals.freight)}
          valueStyle={{ color: '#277da1' }}
          tooltip={TOOLTIPS.freight}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <InfoTile
          label="Comissões (custo)"
          value={money(totals.commissions)}
          valueStyle={{ color: '#ef4444' }}
          tooltip={TOOLTIPS.commissions}
        />
        <InfoTile
          label="Incentivos"
          value={money(totals.incentives)}
          valueStyle={{ color: totals.incentives >= 0 ? 'var(--green)' : '#ef4444' }}
          tooltip={TOOLTIPS.incentives}
        />
        <InfoTile
          label="Pag. Manuais"
          value={money(totals.manual_payments)}
          valueStyle={{ color: totals.manual_payments >= 0 ? 'var(--green)' : '#ef4444' }}
          tooltip={TOOLTIPS.manual_payments}
        />
        <InfoTile
          label="Semanas / Pedidos"
          value={`${analytics.scope.weeks} sem · ${analytics.scope.report_rows.toLocaleString('pt-BR')} linhas`}
          tooltip="Semanas únicas cobertas pelos relatórios. Não é uma sequência contínua de calendário — são amostras operacionais."
        />
      </div>

      {/* How it works explanation */}
      <section className="work-panel">
        <h2>Como o Zé Delivery te paga</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
          {[
            { emoji: '🟢', title: 'Promoções', value: money(totals.promotions), desc: 'Zé banca os descontos. Você não perde receita.' },
            { emoji: '🟢', title: 'Markup',    value: money(totals.markup),    desc: 'Zé paga sua margem acima da tabela Ambev.' },
            { emoji: '🔵', title: 'Frete',     value: money(totals.freight),   desc: 'Zé subsidia o custo logístico das entregas.' },
            { emoji: '🔴', title: 'Comissão',  value: money(totals.commissions), desc: 'Único custo: % por pedido entregue.' },
            { emoji: '🟡', title: 'Incentivos', value: money(totals.incentives), desc: 'Bônus/penalidade por performance semanal.' },
            { emoji: '🟣', title: 'Pag. Manuais', value: money(totals.manual_payments), desc: 'Ajustes manuais — verificar individualmente.' },
          ].map(item => (
            <div key={item.title} style={{
              padding: '14px', borderRadius: '8px', border: '1px solid var(--line)',
              background: 'var(--surface-2)',
            }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.emoji}</div>
              <strong style={{ display: 'block', fontSize: '15px' }}>{item.title}</strong>
              <strong style={{
                display: 'block', fontSize: '18px', margin: '4px 0',
                color: parseFloat(item.value) >= 0 ? 'var(--green)' : '#ef4444'
              }}>{item.value}</strong>
              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{item.desc}</span>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: '16px', padding: '14px', borderRadius: '8px',
          background: 'linear-gradient(135deg,rgba(31,122,59,0.08),rgba(255,255,255,0.6))',
          border: '1px solid #b7d7c0',
        }}>
          <strong>Resultado Proxy = {money(proxy)}</strong>
          <span style={{ color: 'var(--muted)', fontSize: '13px', display: 'block', marginTop: '4px' }}>
            {money(totals.promotions)} + {money(totals.markup)} + {money(totals.freight)} + {money(totals.incentives)} + {money(totals.manual_payments)} + {money(totals.commissions)}
            <br />⚠️ Não inclui custo de mercadoria (CMV), impostos ou despesas operacionais.
          </span>
        </div>
      </section>

      {/* Weekly stacked breakdown */}
      <section className="work-panel">
        <h2>Resultado por Semana</h2>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '12px' }}>
          Linha azul = Resultado Proxy semana a semana. Barras = componentes individuais.
        </p>
        <div style={{ height: '340px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `R$${Math.round(v/1000)}k`} />
              <Tooltip formatter={v => money(v)} />
              <Legend />
              <Bar dataKey="Promoções"    stackId="a" fill={COLORS.promotions}      radius={[0,0,0,0]} />
              <Bar dataKey="Markup"       stackId="a" fill={COLORS.markup}           radius={[0,0,0,0]} />
              <Bar dataKey="Frete"        stackId="a" fill={COLORS.freight}          radius={[0,0,0,0]} />
              <Bar dataKey="Incentivos"   stackId="a" fill={COLORS.incentives}       radius={[0,0,0,0]} />
              <Bar dataKey="Pag. Manuais" stackId="a" fill={COLORS.manual_payments}  radius={[0,0,0,0]} />
              <Bar dataKey="Comissões"    stackId="a" fill={COLORS.commissions}      radius={[4,4,0,0]} />
              <Line dataKey="Resultado" stroke={COLORS.proxy_total} strokeWidth={2.5} dot={true} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Weekly table */}
      <section className="work-panel">
        <h2>Tabela Semanal Completa</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--line)' }}>
                {['Semana','Promoções','Markup','Frete','Incentivos','Pag. Manuais','Comissões','Resultado'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Semana' ? 'left' : 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekly.map((w, i) => (
                <tr key={w.week_key} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>Sem. {w.week_label}</td>
                  {[w.promotions, w.markup, w.freight, w.incentives, w.manual_payments, w.commissions, w.proxy_total].map((v, j) => (
                    <td key={j} style={{
                      padding: '8px 10px', textAlign: 'right', fontWeight: j === 6 ? 700 : 400,
                      color: j === 5 ? '#c0392b' : v >= 0 ? 'var(--green)' : '#ef4444'
                    }}>{money(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--line)', background: '#e9f6ec' }}>
                <td style={{ padding: '8px 10px', fontWeight: 700 }}>TOTAL</td>
                {[totals.promotions, totals.markup, totals.freight, totals.incentives, totals.manual_payments, totals.commissions, proxy].map((v, j) => (
                  <td key={j} style={{
                    padding: '8px 10px', textAlign: 'right', fontWeight: 700,
                    color: j === 5 ? '#c0392b' : v >= 0 ? 'var(--green)' : '#ef4444'
                  }}>{money(v)}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

    </div>
  )
}
