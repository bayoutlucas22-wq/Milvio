import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { integer, money } from './lib/format'

function parseBrNumber(val) {
  if (val == null) return 0
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

function shortMoney(value) {
  const abs = Math.abs(Number(value ?? 0))
  const sign = Number(value) < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}R$${Math.round(abs / 1000)}k`
  return `${sign}R$${Math.round(abs)}`
}

function InfoTile({ label, value, tooltip, valueStyle }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="metric-tile"
      style={{ position: 'relative', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {label}
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ color: '#9aaa9e', flexShrink: 0 }}>
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <text x="8" y="12" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="700">?</text>
        </svg>
      </span>
      <strong style={valueStyle}>{value}</strong>
      {show && (
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
          lineHeight: '1.55',
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

// Extract week label from filename like "raw/Relatorio-Comissoes-Semana-24-a-28-..."
function extractWeekLabel(filename) {
  const match = filename.match(/Semana-(\d+-a-\d+)/i)
  if (match) return `Sem. ${match[1].replace(/-/g, ' ')}`
  const matchSingle = filename.match(/Semana-(\d+)-[a-z0-9]/i)
  if (matchSingle) return `Sem. ${matchSingle[1]}`
  return filename.split('/').pop().replace('.json', '').split('-').slice(2, 5).join(' ')
}

function aggregateSection(rows) {
  let commission = 0
  let grossSales = 0
  const orders = new Set()
  const productMap = {}

  rows.forEach(row => {
    const comm = parseBrNumber(row['Comissão Total'])
    const price = parseBrNumber(row['Preço Unitário de Venda'])
    const qty = parseBrNumber(row['Quantidade'])
    const product = row['Produto'] || 'Unknown'
    const orderId = row['No. do Pedido']

    commission += comm
    grossSales += price * qty
    if (orderId) orders.add(orderId)
    productMap[product] = (productMap[product] || 0) + comm
  })

  const topProduct = Object.entries(productMap).sort((a, b) => b[1] - a[1])[0]

  return {
    commission,
    grossSales,
    orders: orders.size,
    topProduct: topProduct ? topProduct[0] : '-',
    topProductComm: topProduct ? topProduct[1] : 0,
    productMap,
  }
}

export default function ArtifactExplorer() {
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(null)

  useEffect(() => {
    fetch('/api/artifacts')
      .then(res => res.json())
      .then(files => {
        const commFiles = files.filter(f =>
          f.includes('Relatorio-Comissoes-Semana') || f.includes('Relatorio-Comissões-Semana')
        )
        return Promise.all(
          commFiles.map(file =>
            fetch(`/api/artifacts/content?path=${encodeURIComponent(file)}`)
              .then(r => r.json())
              .then(data => ({ file, data }))
              .catch(() => null)
          )
        )
      })
      .then(results => {
        const parsed = results
          .filter(r => r && Array.isArray(r.data) && r.data[0]?.rows)
          .map(r => {
            const section = r.data[0]
            const agg = aggregateSection(section.rows)
            return {
              label: extractWeekLabel(r.file),
              file: r.file,
              ...agg,
              rows: section.rows,
              headers: section.headers,
            }
          })
          .sort((a, b) => a.label.localeCompare(b.label))

        setWeeks(parsed)
        if (parsed.length > 0) setSelectedWeek(parsed[parsed.length - 1])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Chart data across all weeks
  const chartData = weeks.map(w => ({
    name: w.label,
    Comissão: w.commission,
    Vendas: w.grossSales,
    Pedidos: w.orders,
  }))

  // All-time totals
  const totalComm = weeks.reduce((s, w) => s + w.commission, 0)
  const totalSales = weeks.reduce((s, w) => s + w.grossSales, 0)
  const totalOrders = weeks.reduce((s, w) => s + w.orders, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Carregando relatórios de comissão...</p>
      ) : weeks.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Nenhum relatório de comissão encontrado.</p>
      ) : (
        <>
          {/* Top KPI strip — all weeks combined */}
          <div className="metric-strip">
            <InfoTile
              label="Comissão Total (todas as semanas)"
              value={money(totalComm)}
              valueStyle={{ color: totalComm < 0 ? '#ef4444' : undefined }}
              tooltip="⚠️ Soma das comissões cobradas pelo Zé Delivery em todas as semanas carregadas. Valor negativo = custo para você. Pode estar incompleto se algum relatório de semana estiver faltando na pasta raw/."
            />
            <InfoTile
              label="Vendas Brutas (todas as semanas)"
              value={money(totalSales)}
              tooltip="Estimativa de receita bruta: quantidade × preço unitário de venda por linha de produto. Não é o valor recebido — não desconta comissão, frete, promoções ou impostos. Pode divergir do extrato real do Zé se linhas estiverem zeradas ou com preço ausente."
            />
            <InfoTile
              label="Total de Pedidos"
              value={integer(totalOrders)}
              tooltip="Contagem de IDs de pedido únicos encontrados nos relatórios de comissão. Um mesmo pedido com múltiplos produtos é contado uma única vez. Pedidos sem ID preenchido no report são ignorados."
            />
            <InfoTile
              label="Semanas analisadas"
              value={weeks.length}
              tooltip={`Quantidade de arquivos raw/Relatorio-Comissoes-Semana-* encontrados e processados com sucesso. Se esse número for menor do que o esperado, verifique se todos os relatórios semanais estão na pasta artifacts/raw/.`}
            />
          </div>

          {/* Main trend chart — commission week by week */}
          <section className="work-panel">
            <h2>Comissão por Semana</h2>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={v => shortMoney(v)} />
                  <Tooltip formatter={v => money(v)} />
                  <Bar dataKey="Comissão" fill="#c0392b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Orders trend */}
          <section className="work-panel">
            <h2>Pedidos por Semana</h2>
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="Pedidos" stroke="#10b981" strokeWidth={2.5} dot={true} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Week selector + detail */}
          <section className="work-panel">
            <h2>Detalhe por Semana</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {weeks.map(w => (
                <button
                  key={w.file}
                  onClick={() => setSelectedWeek(w)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: selectedWeek?.file === w.file ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                    background: selectedWeek?.file === w.file ? 'rgba(59,130,246,0.15)' : 'transparent',
                    color: selectedWeek?.file === w.file ? '#60a5fa' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    fontWeight: selectedWeek?.file === w.file ? 600 : 400,
                  }}
                >
                  {w.label}
                </button>
              ))}
            </div>

            {selectedWeek && (
              <>
                <div className="metric-strip" style={{ marginBottom: '20px' }}>
                  <InfoTile
                    label="Comissão"
                    value={money(selectedWeek.commission)}
                    valueStyle={{ color: selectedWeek.commission < 0 ? '#ef4444' : undefined }}
                    tooltip="⚠️ Valor calculado pela API do Zé Delivery (endpoint Reports/repasses) e registrado nos relatórios financeiros brutos. Representa o custo de comissão cobrado por pedido entregue. Valor negativo = desconto do seu repasse. Pode divergir do extrato oficial se linhas de produtos estiverem zeradas, faltando ou com campos mapeados incorretamente."
                  />
                  <InfoTile
                    label="Vendas Brutas"
                    value={money(selectedWeek.grossSales)}
                    tooltip="Estimativa calculada localmente: soma de (quantidade × preço unitário de venda) por linha do relatório de comissão. Não vem diretamente do Zé — é uma aproximação. Não inclui frete, promoções, incentivos ou impostos. Divergências são esperadas se produtos tiverem preço zerado ou ausente no relatório."
                  />
                  <InfoTile
                    label="Pedidos"
                    value={integer(selectedWeek.orders)}
                    tooltip="Contagem de IDs de pedido únicos (campo 'No. do Pedido') nesta semana. Um pedido com múltiplos produtos aparece uma única vez. Pedidos sem ID preenchido são ignorados. Verifique com o relatório de repasses do Zé para confirmar o total real de pedidos faturados."
                  />
                  <InfoTile
                    label="Top Produto"
                    value={selectedWeek.topProduct.length > 25
                      ? selectedWeek.topProduct.slice(0, 25) + '…'
                      : selectedWeek.topProduct}
                    tooltip={`Produto com maior volume de comissão cobrada nesta semana: ${selectedWeek.topProduct}. Comissão alta neste produto pode indicar alto giro ou taxa de comissão elevada. Confira se a taxa aplicada está correta no catálogo do Zé Delivery.`}
                  />
                </div>


                {/* Top 10 products this week */}
                <h3 style={{ marginBottom: '12px' }}>Top Produtos — {selectedWeek.label}</h3>
                <div className="rank-list">
                  {Object.entries(selectedWeek.productMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([product, value]) => {
                      const max = Math.abs(
                        Object.values(selectedWeek.productMap).sort((a, b) => Math.abs(b) - Math.abs(a))[0]
                      )
                      return (
                        <div className="rank-row" key={product}>
                          <div>
                            <strong>{product.length > 40 ? product.slice(0, 40) + '…' : product}</strong>
                            <span>comissão do produto</span>
                          </div>
                          <div className="rank-meter">
                            <i style={{ width: `${Math.max(4, (Math.abs(value) / Math.max(max, 1)) * 100)}%` }} />
                          </div>
                          <b className={value < 0 ? 'negative' : 'positive'}>{money(value)}</b>
                        </div>
                      )
                    })}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
