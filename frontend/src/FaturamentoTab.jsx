import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { money, integer } from './lib/format'

const shortMoney = (v) => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}R$${Math.round(abs / 1000)}k`
  return `${sign}R$${Math.round(abs)}`
}

const MONTH_LABELS = {
  '2025-07': 'Jul/25', '2025-08': 'Ago/25', '2025-09': 'Set/25',
  '2025-10': 'Out/25', '2025-11': 'Nov/25', '2025-12': 'Dez/25',
  '2026-01': 'Jan/26', '2026-02': 'Fev/26', '2026-03': 'Mar/26',
  '2026-04': 'Abr/26', '2026-05': 'Mai/26', '2026-06': 'Jun/26',
  '2026-07': 'Jul/26',
}

function KPI({ label, value, sub, color, source, sourceHover }) {
  return (
    <div className="metric-tile" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ paddingRight: source ? '40px' : '0' }}>{label}</span>
        {source && (
          <span 
            title={sourceHover}
            style={{ 
            position: 'absolute', top: '12px', right: '12px',
            fontSize: '9px', padding: '3px 6px', borderRadius: '4px', 
            background: 'rgba(96, 165, 250, 0.1)', color: '#93c5fd', 
            textTransform: 'uppercase', letterSpacing: '0.5px',
            cursor: sourceHover ? 'help' : 'default'
          }}>
            {source} {sourceHover && 'ⓘ'}
          </span>
        )}
      </div>
      <strong style={{ color: color || 'var(--text)', fontSize: '20px' }}>{value}</strong>
      {sub && <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{sub}</span>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1b2820', borderRadius: '8px', padding: '10px 14px',
      fontSize: '12px', color: '#e2ede5', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    }}>
      <strong style={{ display: 'block', marginBottom: '6px' }}>{label}</strong>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{typeof p.value === 'number' && p.name !== 'Pedidos' ? money(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function FaturamentoTab({ setActiveTab }) {
  const [daily, setDaily] = useState([])
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('monthly')
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/timeline_monthly.json').then(r => r.json()),
      fetch('/timeline_daily.json').then(r => r.json()),
    ]).then(([m, d]) => {
      setMonthly(m); setDaily(d); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filteredDaily = useMemo(() =>
    selectedMonth ? daily.filter(d => d.date.startsWith(selectedMonth)) : daily,
    [daily, selectedMonth]
  )

  const totalFat    = monthly.reduce((s, m) => s + m.faturamento, 0)
  const totalComm   = monthly.reduce((s, m) => s + m.comissao, 0)
  const totalMarkup = monthly.reduce((s, m) => s + m.markup, 0)
  const totalFrete  = monthly.reduce((s, m) => s + m.frete, 0)
  const totalDesc   = monthly.reduce((s, m) => s + m.desconto, 0)
  const totalRes    = monthly.reduce((s, m) => s + m.resultado_proxy, 0)
  const totalPed    = monthly.reduce((s, m) => s + m.pedidos, 0)
  
  const weeksCount  = Math.max(1, Math.round(daily.length / 7))

  // What Zé actually PAYS to Milvinho = Proxy Total (net of all 6 components)
  // Faturamento = what CUSTOMERS paid to Zé — reference only, not Milvinho's income
  const INCENTIVOS     = -2730.80
  const PAG_MANUAIS    = -3166.94
  const proxyTotal     = totalComm + totalMarkup + totalFrete + totalDesc + INCENTIVOS + PAG_MANUAIS

  const monthlyChartData = monthly.map(m => ({
    name: MONTH_LABELS[m.month] || m.month, month: m.month,
    Faturamento: m.faturamento,
    'Resultado Zé': m.resultado_proxy,
    Comissão: m.comissao,
    Markup: m.markup, Frete: m.frete, Promoções: m.desconto,
    Resultado: m.resultado_proxy, Pedidos: m.pedidos,
  }))

  const dailyChartData = filteredDaily.map(d => ({
    name: d.date, Faturamento: d.faturamento,
    Resultado: d.resultado_proxy, Comissão: d.comissao, Pedidos: d.pedidos,
  }))

  if (loading) return <p style={{ color: 'var(--muted)', padding: '32px' }}>Carregando timeline...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>

      {/* Resultado financeiro do Zé */}
      <section className="work-panel" style={{ background: 'linear-gradient(135deg,#173224,#224633)', borderColor: '#2d5a3d', color: '#e2ede5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ color: '#d9f6df', fontSize: '24px' }}>Resultado financeiro do Zé</h2>
            <p style={{ color: '#8aaf9a', fontSize: '13px', marginTop: '6px' }}>
              O <strong style={{ color: '#93c5fd' }}>faturamento bruto</strong> foi R${money(totalFat)}.
              Isso é o que entrou no caixa via venda. Aqui não entram as despesas do dono.
            </p>
          </div>
          <button 
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            style={{ 
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
              color: '#fff', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: 600
            }}>
            {isDetailsOpen ? 'Ocultar Detalhes' : 'Ver Detalhes do Acerto'}
          </button>
        </div>

        <div className="financial-summary-grid" style={{ marginTop: '20px' }}>
          <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(39,125,161,0.12)', border: '1px solid #1e4a5a', color: '#cde7ff' }}>
            <div style={{ fontSize: '12px', color: '#8fb9dc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Faturamento bruto</div>
            <strong style={{ color: '#93c5fd', fontSize: '32px', display: 'block', marginBottom: '8px' }}>{money(totalFat)}</strong>
            <span style={{ fontSize: '14px' }}>Receita bruta das vendas. É o que entrou pelas vendas. Ainda não é lucro.</span>
          </div>
          <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid #7f1d1d', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>O Zé paga ao Milvinho</div>
            <strong style={{ fontSize: '36px', fontWeight: 800, color: '#ef4444' }}>{money(proxyTotal)}</strong>
            <div style={{ fontSize: '14px', color: '#8aaf9a', marginTop: '8px' }}>~{money(Math.round(proxyTotal/weeksCount))}/semana · {weeksCount} semanas</div>
          </div>
        </div>

        {isDetailsOpen && (
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ color: '#8aaf9a', fontSize: '14px', marginBottom: '16px' }}>
              Abaixo está o acerto do período, com o que soma e o que tira do caixa:
            </p>
            <div className="financial-split-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Promoções', value: totalDesc, color: '#a78bfa', sign: '+' },
                { label: 'Markup', value: totalMarkup, color: '#4ade80', sign: '+' },
                { label: 'Frete', value: totalFrete, color: '#38bdf8', sign: '+' },
                { label: 'Incentivos', value: INCENTIVOS, color: INCENTIVOS >= 0 ? '#4ade80' : '#f87171', sign: INCENTIVOS >= 0 ? '+' : '' },
                { label: 'Pag. Manuais', value: PAG_MANUAIS, color: PAG_MANUAIS >= 0 ? '#4ade80' : '#f87171', sign: PAG_MANUAIS >= 0 ? '+' : '' },
                { label: 'Comissões', value: totalComm, color: '#f87171', sign: '−' },
              ].map(item => (
                <div key={item.label} style={{ padding: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#8aaf9a', marginBottom: '6px', fontWeight: 600 }}>{item.sign} {item.label}</div>
                  <strong style={{ color: item.color, fontSize: '18px' }}>{money(item.value)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#cfe2d5', padding: '16px 20px', borderRadius: '14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)' }}>
          <style>
            {`
              @keyframes attention-zoom {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.9); }
                50% { transform: scale(1.15); box-shadow: 0 0 40px 20px rgba(245, 158, 11, 0.8), 0 0 60px 10px rgba(255, 255, 255, 0.3); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
              }
              .btn-rombo {
                animation: attention-zoom 1.5s infinite;
                animation-delay: 5s;
              }
            `}
          </style>
          <div>
            ⚠️ Esse valor ainda <strong style={{ color: '#fde68a' }}>não é lucro</strong>.
            Ainda faltam CMV, impostos, salários e outras despesas para fechar a conta do depósito.
          </div>
          <button 
            className="btn-rombo"
            onClick={() => setActiveTab('research')}
            style={{
              background: '#f59e0b', color: '#78350f', border: 'none', padding: '10px 20px', borderRadius: '24px',
              fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px', transition: 'all 0.3s ease'
            }}>
            Entender o Rombo ➔
          </button>
        </div>
      </section>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        <KPI label="O Zé Paga (Proxy Total)" value={money(proxyTotal)} sub={`~${money(Math.round(proxyTotal/weeksCount))}/semana`} color="var(--green)" source="Fórmula" sourceHover="Faturamento + Promoções + Markup + Frete + Incentivos + Pag. Manuais − Comissões" />
        <KPI label="Faturamento bruto" value={money(totalFat)} sub="o que o cliente pagou ao Zé" color="#60a5fa" source="Resumo" sourceHover="Coluna 'Faturamento' da aba Resumo do report bruto do Zé." />
        <KPI label="Comissão Cobrada" value={money(totalComm)} sub={`${(Math.abs(totalComm)/totalFat*100).toFixed(1)}% do faturamento`} color="#ef4444" source="Resumo" sourceHover="Coluna 'Comissão' da aba Resumo do report bruto do Zé." />
        <KPI label="Total de Pedidos" value={integer(totalPed)} sub={`ticket médio ${money(totalPed > 0 ? totalFat/totalPed : 0)}`} source="Resumo" sourceHover="Coluna 'Pedidos' da aba Resumo do report bruto do Zé." />
        <KPI label="Promoções" value={money(totalDesc)} color="#7b5ea7" sub="Zé banca os descontos" source="Resumo" sourceHover="Coluna 'Desconto' da aba Resumo do report bruto do Zé." />
        <KPI label="Markup" value={money(totalMarkup)} color={totalMarkup >= 0 ? 'var(--green)' : '#ef4444'} sub="margem acima da tabela Ambev" source="Resumo" sourceHover="Coluna 'Markup' da aba Resumo do report bruto do Zé." />
        <KPI label="Frete" value={money(totalFrete)} color="var(--green)" sub="subsídio logístico do Zé" source="Resumo" sourceHover="Coluna 'Frete' da aba Resumo do report bruto do Zé." />
        <KPI label={`${daily.length} dias processados`} value={`${weeksCount} semanas`} sub="dados dos relatórios raw" source="Arquivos" sourceHover="Cálculo real de arquivos JSON lidos na sua pasta local." />
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Ver por:</span>
        {[['monthly','📅 Mês a Mês'],['daily','📆 Dia a Dia']].map(([key, label]) => (
          <button key={key} onClick={() => { setView(key); setSelectedMonth(null) }} style={{
            padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
            fontWeight: key === view ? 600 : 400,
            border: key === view ? '2px solid var(--green)' : '1px solid var(--line)',
            background: key === view ? 'rgba(31,122,59,0.1)' : 'transparent',
            color: key === view ? 'var(--green)' : 'var(--muted)',
          }}>{label}</button>
        ))}
        {selectedMonth && (
          <button onClick={() => setSelectedMonth(null)} style={{
            padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
            border: '1px solid #c0392b', background: 'rgba(192,57,43,0.08)', color: '#c0392b',
          }}>✕ {MONTH_LABELS[selectedMonth]}</button>
        )}
      </div>

      {/* Monthly charts */}
      {view === 'monthly' && <>
        <section className="work-panel">
          <h2>Faturamento e Resultado por Mês
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 400, marginLeft: '8px' }}>Clique num mês para ver dia a dia →</span>
          </h2>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyChartData} style={{ cursor: 'pointer' }}
                onClick={e => { if (e?.activePayload?.[0]?.payload?.month) { setSelectedMonth(e.activePayload[0].payload.month); setView('daily') } }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="l" tickFormatter={shortMoney} />
                <YAxis yAxisId="r" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="l" dataKey="Faturamento" fill="#277da1" opacity={0.8} radius={[4,4,0,0]} />
                <Bar yAxisId="l" dataKey="Resultado" fill="#1b4332" radius={[4,4,0,0]} />
                <Line yAxisId="r" dataKey="Pedidos" stroke="#e09f3e" strokeWidth={2} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="work-panel">
          <h2>Composição dos Componentes Zé por Mês</h2>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={shortMoney} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Promoções" stackId="g" fill="#7b5ea7" />
                <Bar dataKey="Frete"     stackId="g" fill="#277da1" />
                <Bar dataKey="Markup"    stackId="g" fill="#1f7a3b" radius={[4,4,0,0]} />
                <Bar dataKey="Comissão"  fill="#c0392b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="work-panel">
          <h2>Tabela Mensal Completa</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--line)' }}>
                  {['Mês','Faturamento','Comissão','Markup','Frete','Promoções','Resultado','Pedidos'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Mês' ? 'left' : 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => (
                  <tr key={m.month} onClick={() => { setSelectedMonth(m.month); setView('daily') }}
                    style={{ borderBottom: '1px solid var(--line)', background: i%2===0 ? 'var(--surface)' : 'var(--surface-2)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e9f6ec'}
                    onMouseLeave={e => e.currentTarget.style.background = i%2===0 ? 'var(--surface)' : 'var(--surface-2)'}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{MONTH_LABELS[m.month] || m.month} <span style={{ color: 'var(--muted)', fontSize: '11px' }}>→</span></td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#277da1', fontWeight: 600 }}>{money(m.faturamento)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#c0392b' }}>{money(m.comissao)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: m.markup >= 0 ? 'var(--green)' : '#ef4444' }}>{money(m.markup)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--green)' }}>{money(m.frete)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#7b5ea7' }}>{money(m.desconto)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: m.resultado_proxy >= 0 ? 'var(--green)' : '#ef4444' }}>{money(m.resultado_proxy)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{m.pedidos}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--line)', background: '#e9f6ec', fontWeight: 700 }}>
                  <td style={{ padding: '8px 10px' }}>TOTAL</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#277da1' }}>{money(totalFat)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#c0392b' }}>{money(totalComm)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: totalMarkup >= 0 ? 'var(--green)' : '#ef4444' }}>{money(totalMarkup)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--green)' }}>{money(totalFrete)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#7b5ea7' }}>{money(totalDesc)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: totalRes >= 0 ? 'var(--green)' : '#ef4444' }}>{money(totalRes)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{totalPed}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </>}

      {/* Daily view */}
      {view === 'daily' && <>
        <section className="work-panel">
          <h2>Faturamento Diário{selectedMonth ? ` — ${MONTH_LABELS[selectedMonth] || selectedMonth}` : ' — Todos os dias'}</h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={selectedMonth ? 0 : 8} />
                <YAxis yAxisId="l" tickFormatter={shortMoney} />
                <YAxis yAxisId="r" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area yAxisId="l" type="monotone" dataKey="Faturamento" fill="#dbeafe" stroke="#277da1" strokeWidth={1.5} fillOpacity={0.35} />
                <Line yAxisId="l" type="monotone" dataKey="Resultado" stroke="#1b4332" strokeWidth={2} dot={false} />
                <Bar yAxisId="r" dataKey="Pedidos" fill="#e09f3e" opacity={0.45} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="work-panel">
          <h2>Tabela Diária{selectedMonth ? ` — ${MONTH_LABELS[selectedMonth] || selectedMonth}` : ''}</h2>
          <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--line)' }}>
                  {['Data','Faturamento','Comissão','Markup','Frete','Promoções','Resultado','Pedidos'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Data' ? 'left' : 'right', fontWeight: 700, whiteSpace: 'nowrap', background: 'var(--surface-2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDaily.map((d, i) => (
                  <tr key={d.date} style={{ borderBottom: '1px solid var(--line)', background: i%2===0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{d.date}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#277da1' }}>{money(d.faturamento)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#c0392b' }}>{money(d.comissao)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: d.markup >= 0 ? 'var(--green)' : '#ef4444' }}>{money(d.markup)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--green)' }}>{money(d.frete)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#7b5ea7' }}>{money(d.desconto)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: d.resultado_proxy >= 0 ? 'var(--green)' : '#ef4444' }}>{money(d.resultado_proxy)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{d.pedidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>}
    </div>
  )
}
