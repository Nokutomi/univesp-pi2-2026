const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const money = (v) => brl.format(v ?? 0)
export const percent = (v) => pct.format(v ?? 0)

/** "2026-10" -> "out/26" */
export function monthShort(month) {
  const [y, m] = month.split('-')
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`
}

/** "2026-10" -> "Outubro de 2026" */
export function monthLong(month) {
  const [y, m] = month.split('-')
  const name = MONTHS_LONG[Number(m) - 1]
  return `${name[0].toUpperCase()}${name.slice(1)} de ${y}`
}

/** "2026-10-21" -> "21/10/2026" (sem conversão de fuso) */
export function dateBR(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const idx = y * 12 + (m - 1) + delta
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`
}

export function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
