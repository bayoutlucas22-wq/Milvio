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

function KPI({ label, value, sub, color }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
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

export default function FaturamentoTab() {
  const [daily, setDaily] = useState([])
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('monthly')
  const [selectedMonth, setSelectedMonth] = useState(null)

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

  const monthlyChartData = monthly.map(m => ({
    name: MONTH_LABELS[m.month] || m.month, month: m.month,
    Faturamento: m.faturamento, Comissão: m.comissao,
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

      {/* Explicação */}
      <section className="work-panel" style={{ background: 'linear-gradient(135deg,#f0faf3,#fff)', borderColor: '#b7d7c0' }}>
        <h2>Entendendo os dados do Zé Delivery</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '10px', marginTop: '12px' }}>
          {[
            { icon: '💰', title: 'Faturamento', color: '#277da1',
              desc: 'Preço × Quantidade de cada linha do Relatório de Comissões. É a receita bruta de vendas — o que o cliente pagou ao Zé por seus produtos.' },
            { icon: '🔴', title: 'Comissão (custo)', color: '#c0392b',
              desc: 'Taxa cobrada pelo Zé por pedido entregue (~15–20% do faturamento). É o único custo direto da plataforma. Aparece negativo no resultado.' },
            { icon: '🟢', title: 'Markup', color: '#1f7a3b',
              desc: 'Restituição paga pelo Zé pela diferença entre seu preço de venda e a tabela Ambev. Pode ser negativo se Ambev subiu o preço.' },
            { icon: '🔵', title: 'Frete', color: '#277da1',
              desc: 'Subsídio logístico do Zé. A plataforma coleta o frete do cliente e repassa uma parte para você cobrir o custo de entrega.' },
            { icon: '🟣', title: 'Promoções', color: '#7b5ea7',
              desc: 'Desconto dado ao cliente bancado pelo Zé. Você não perde receita — o Zé te restitui o valor promocional integralmente.' },
            { icon: '⚡', title: 'Resultado Proxy', color: '#1b4332',
              desc: 'Soma de comissão + markup + frete + promoções. É o balanço financeiro com o Zé, sem CMV, impostos ou despesas internas.' },
          ].map(item => (
            <div key={item.title} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)' }}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <strong style={{ color: item.color, display: 'block', margin: '3px 0', fontSize: '13px' }}>{item.title}</strong>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', lineHeight: 1.55 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: '#fff8e1', border: '1px solid #ffe082', fontSize: '12px', color: '#7b5c00' }}>
          ⚠️ <strong>Atenção:</strong> Os relatórios cobrem amostras de semanas (não calendário contínuo). Semanas duplicadas foram somadas.
          Incentivos e Pagamentos Manuais não têm data por linha — veja o tab Artifacts para esses valores por semana.
        </div>
      </section>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        <KPI label="Faturamento Total" value={money(totalFat)} sub="receita bruta (jul/25–jul/26)" color="#277da1" />
        <KPI label="Resultado Proxy Total" value={money(totalRes)} sub="balanço com o Zé" color={totalRes >= 0 ? 'var(--green)' : '#ef4444'} />
        <KPI label="Total de Pedidos" value={integer(totalPed)} sub={`ticket médio ${money(totalPed > 0 ? totalFat/totalPed : 0)}`} />
        <KPI label="Comissão Total Paga" value={money(totalComm)} sub={`${(Math.abs(totalComm)/totalFat*100).toFixed(1)}% do faturamento`} color="#ef4444" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        <KPI label="Markup Recebido" value={money(totalMarkup)} color={totalMarkup >= 0 ? 'var(--green)' : '#ef4444'} />
        <KPI label="Frete Recebido" value={money(totalFrete)} color="var(--green)" />
        <KPI label="Promoções Restituídas" value={money(totalDesc)} color="#7b5ea7" />
        <KPI label="267 dias analisados" value="jul/2025 → jul/2026" sub="dados dos raw JSONs" />
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
