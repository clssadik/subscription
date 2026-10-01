import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Currency } from './types'

export function formatMoney(amount: number, currency: Currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount)
}

/** Büyük tutarlarda kuruşu küçük yazmak için: "₺704" ve ",86" */
export function splitMoney(amount: number, currency: Currency = 'TRY') {
  const parts = new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).formatToParts(amount)
  let main = ''
  let cents = ''
  let inFraction = false
  for (const p of parts) {
    if (p.type === 'decimal') inFraction = true
    if (inFraction && (p.type === 'decimal' || p.type === 'fraction')) cents += p.value
    else if (p.type !== 'literal' || !inFraction) main += p.value
  }
  return { main: main.trim(), cents }
}

export const formatDate = (d: Date, pattern: string) => format(d, pattern, { locale: tr })

/** "1.234,56" veya "1234.56" gibi girdileri sayıya çevirir. Geçersizse NaN. */
export function parseAmount(input: string) {
  const s = input.trim().replace(/\s/g, '')
  if (!s) return NaN
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return Number(normalized)
}

/** Türkçe gün eki: 1'i, 2'si, 3'ü, 6'sı, 9'u, 10'u, 20'si, 30'u */
export function dayOf(n: number) {
  const ones: Record<number, string> = { 1: 'i', 2: 'si', 3: 'ü', 4: 'ü', 5: 'i', 6: 'sı', 7: 'si', 8: 'i', 9: 'u' }
  const tens: Record<number, string> = { 10: 'u', 20: 'si', 30: 'u' }
  const suffix = n % 10 === 0 ? tens[n] : ones[n % 10]
  return `${n}'${suffix}`
}
