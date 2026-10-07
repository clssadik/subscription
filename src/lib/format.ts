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

/** "1.234,56", "12 345,67" veya "1234.56" gibi girdileri sayıya çevirir. Tanınmayan biçim (ör. "1,234.56", "0x1A") NaN olur. */
export function parseAmount(input: string) {
  const s = input.replace(/\s/g, '')
  // Binlik noktalı: "1.000" = 1000, "1.234,56" = 1234.56
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'))
  // Virgüllü ondalık: "99,90" = 99.9
  if (/^\d+(,\d+)?$/.test(s)) return Number(s.replace(',', '.'))
  // Noktalı ondalık: "12.5" = 12.5
  if (/^\d+\.\d+$/.test(s)) return Number(s)
  return NaN
}

/** Kaydedilebilir tutar: sonlu, sıfırdan büyük, bir trilyondan küçük ve en fazla iki ondalıklı */
export function isValidAmount(value: number) {
  return Number.isFinite(value) && value > 0 && value < 1e12 && Math.round(value * 100) / 100 === value
}

/** Türkçe gün eki: 1'i, 2'si, 3'ü, 6'sı, 9'u, 10'u, 20'si, 30'u */
export function dayOf(n: number) {
  const ones: Record<number, string> = { 1: 'i', 2: 'si', 3: 'ü', 4: 'ü', 5: 'i', 6: 'sı', 7: 'si', 8: 'i', 9: 'u' }
  const tens: Record<number, string> = { 10: 'u', 20: 'si', 30: 'u' }
  const suffix = n % 10 === 0 ? tens[n] : ones[n % 10]
  return `${n}'${suffix}`
}
