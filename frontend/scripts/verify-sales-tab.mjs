import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const appPath = resolve(root, 'src/App.jsx')
const salesDataPath = resolve(root, 'src/sales_december_2025.json')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const appSource = readFileSync(appPath, 'utf8')

assert(appSource.includes("id: 'sales'"), 'Expected App.jsx to register the sales tab.')
assert(appSource.includes("label: 'Vendas'"), 'Expected the sales tab label to be Vendas.')
assert(appSource.includes('SalesTab'), 'Expected App.jsx to render a SalesTab component.')
assert(existsSync(salesDataPath), 'Expected src/sales_december_2025.json to exist.')

const salesData = JSON.parse(readFileSync(salesDataPath, 'utf8'))

assert(salesData.periodo === '2025-12-01 a 2025-12-31', 'Expected December 2025 period.')
assert(salesData.faturamento_vendas_total === 194023.7, 'Expected the calculated sales total.')
assert(Array.isArray(salesData.daily), 'Expected daily sales rows.')
assert(salesData.daily.length === 31, 'Expected one row for each day in December.')
assert(
  salesData.daily.some((row) => row.data === '2025-12-31' && row.faturamento_vendas === 20368.55),
  'Expected the strongest day, 2025-12-31, to be present.',
)

console.log('Sales tab contract ok.')
