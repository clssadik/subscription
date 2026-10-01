import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Currency } from './types'

export function formatMoney(amount: number, currency: Currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: Date) {
  return format(date, 'd MMMM yyyy, EEEE', { locale: tr })
}

export function formatShortDate(date: Date) {
  return format(date, 'd MMM', { locale: tr })
}

/** "1.234,56" veya "1234.56" gibi girdileri sayıya çevirir. Geçersizse NaN. */
export function parseAmount(input: string) {
  const s = input.trim().replace(/\s/g, '')
  if (!s) return NaN
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return Number(normalized)
}
