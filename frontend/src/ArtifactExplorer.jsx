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
            <div className="metric-tile">
              <span>Comissão Total (todas as semanas)</span>
              <strong style={{ color: totalComm < 0 ? '#ef4444' : undefined }}>{money(totalComm)}</strong>
            </div>
            <div className="metric-tile">
              <span>Vendas Brutas (todas as semanas)</span>
              <strong>{money(totalSales)}</strong>
            </div>
            <div className="metric-tile">
              <span>Total de Pedidos</span>
              <strong>{integer(totalOrders)}</strong>
            </div>
            <div className="metric-tile">
              <span>Semanas analisadas</span>
              <strong>{weeks.length}</strong>
            </div>
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
                  <div className="metric-tile">
                    <span>Comissão</span>
                    <strong style={{ color: selectedWeek.commission < 0 ? '#ef4444' : undefined }}>
                      {money(selectedWeek.commission)}
                    </strong>
                  </div>
                  <div className="metric-tile">
                    <span>Vendas Brutas</span>
                    <strong>{money(selectedWeek.grossSales)}</strong>
                  </div>
                  <div className="metric-tile">
                    <span>Pedidos</span>
                    <strong>{integer(selectedWeek.orders)}</strong>
                  </div>
                  <div className="metric-tile">
                    <span>Top Produto</span>
                    <strong style={{ fontSize: '0.85rem' }}>
                      {selectedWeek.topProduct.length > 25
                        ? selectedWeek.topProduct.slice(0, 25) + '…'
                        : selectedWeek.topProduct}
                    </strong>
                  </div>
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
