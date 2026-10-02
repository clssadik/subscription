import { siAmericanexpress, siMastercard, siVisa } from 'simple-icons'
import { colorFromName } from './color'
import type { CardNetwork } from './types'

// Bilinen Türk bankaları ve marka renkleri. Kartın rengi, yazılan banka adından kendiliğinden gelir.
export const BANKS: { key: string; name: string; color: string }[] = [
  { key: 'garanti', name: 'Garanti BBVA', color: '#0B7A43' },
  { key: 'akbank', name: 'Akbank', color: '#C8102E' },
  { key: 'yapikredi', name: 'Yapı Kredi', color: '#004B93' },
  { key: 'isbank', name: 'İş Bankası', color: '#0B4EA2' },
  { key: 'ziraat', name: 'Ziraat Bankası', color: '#E30A17' },
  { key: 'halkbank', name: 'Halkbank', color: '#005DA8' },
  { key: 'vakifbank', name: 'VakıfBank', color: '#2B2A29' },
  { key: 'qnb', name: 'QNB', color: '#890C58' },
  { key: 'denizbank', name: 'DenizBank', color: '#0A5DA6' },
  { key: 'enpara', name: 'Enpara', color: '#6F2DA8' },
  { key: 'ing', name: 'ING', color: '#FF6200' },
  { key: 'teb', name: 'TEB', color: '#009A44' },
  { key: 'kuveytturk', name: 'Kuveyt Türk', color: '#00704A' },
  { key: 'papara', name: 'Papara', color: '#141414' },
]

const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]/g, '')

/** "Garanti", "garanti bonus", "Yapı Kredi World" gibi yazımları bilinen bankayla eşleştirir */
function matchBank(name: string) {
  const n = norm(name)
  if (n.length < 2) return undefined
  return BANKS.find((b) => {
    const full = norm(b.name)
    const first = norm(b.name.split(' ')[0])
    return full.startsWith(n) || n.startsWith(full) || n.startsWith(first)
  })
}

export function bankColor(name: string) {
  return matchBank(name)?.color
}

// Beyaz tek renk logolar: src/assets/banks/<anahtar>.svg (tam logo) ve symbols/<anahtar>.svg (sadece sembol)
const svgs = import.meta.glob('../assets/banks/**/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

/** Banka logosu: büyük yerlerde tam logo, küçük kutularda sembol. Sembol yoksa baş harf gösterilir. */
export function bankLogo(name: string) {
  const key = matchBank(name)?.key
  return {
    logo: key ? svgs[`../assets/banks/${key}.svg`] : undefined,
    symbol: key ? svgs[`../assets/banks/symbols/${key}.svg`] : undefined,
    letter: (name.trim()[0] ?? '?').toLocaleUpperCase('tr'),
    // İş Bankası'nın logosu çok ince uzun: küçük karoda sembol + ad daha okunaklı
    wide: key === 'isbank',
  }
}

/** "garanti" → "Garanti BBVA": yazılan, bilinen bir bankanın adının başıysa doğru adı döner */
export function bankName(name: string) {
  const n = norm(name)
  const bank = n.length >= 2 ? BANKS.find((b) => norm(b.name).startsWith(n)) : undefined
  return bank?.name ?? name.trim()
}

/** Kartın rengi: bilinen bankaysa onun rengi, değilse isimden türeyen sabit bir renk */
export function cardColor(name: string) {
  return bankColor(name) ?? colorFromName(norm(name))
}

export const NETWORKS: { key: CardNetwork; label: string; path?: string }[] = [
  { key: 'visa', label: 'Visa', path: siVisa.path },
  { key: 'mastercard', label: 'Mastercard', path: siMastercard.path },
  { key: 'troy', label: 'troy' },
  { key: 'amex', label: 'Amex', path: siAmericanexpress.path },
]
