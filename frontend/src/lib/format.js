export function money(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  })
}

export function integer(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 0,
  })
}

export function compactDate(value) {
  if (!value) return '-'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export function monthLabel(value) {
  if (!value || value === 'na') return 'Sem data'
  const [year, month] = value.split('-')
  return `${month}/${year}`
}
