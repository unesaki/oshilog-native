import { WEEK_DAYS } from '@/constants/colors'

export function lightenHex(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return [r, g, b]
    .map((c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0'))
    .join('')
    .replace(/^/, '#')
}

export function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(day))
  return `${parseInt(y)}年${parseInt(m)}月${parseInt(day)}日（${WEEK_DAYS[dateObj.getDay()]}）`
}

export function getLocalDateString(): string {
  return new Date().toLocaleDateString('sv')
}

export function formatYearMonth(): { year: number; month: number; yearMonth: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`
  return { year, month, yearMonth }
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('ja-JP')
}
