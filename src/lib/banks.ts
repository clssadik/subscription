import { siAmericanexpress, siMastercard, siVisa } from 'simple-icons'
import { colorFromName } from './color'
import type { CardNetwork } from './types'

// Bilinen Türk bankaları ve marka renkleri. Kartın rengi, yazılan banka adından kendiliğinden gelir.
export const BANKS: { name: string; color: string }[] = [
  { name: 'Garanti BBVA', color: '#0B7A43' },
  { name: 'Akbank', color: '#C8102E' },
  { name: 'Yapı Kredi', color: '#004B93' },
  { name: 'İş Bankası', color: '#0B4EA2' },
  { name: 'Ziraat Bankası', color: '#E30A17' },
  { name: 'Halkbank', color: '#005DA8' },
  { name: 'VakıfBank', color: '#2B2A29' },
  { name: 'QNB', color: '#890C58' },
  { name: 'DenizBank', color: '#0A5DA6' },
  { name: 'Enpara', color: '#6F2DA8' },
  { name: 'ING', color: '#FF6200' },
  { name: 'TEB', color: '#009A44' },
  { name: 'Kuveyt Türk', color: '#00704A' },
  { name: 'Papara', color: '#141414' },
]

const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]/g, '')

/** "Garanti", "garanti bonus", "Yapı Kredi World" gibi yazımları bilinen bankayla eşleştirir */
export function bankColor(name: string) {
  const n = norm(name)
  if (n.length < 2) return undefined
  return BANKS.find((b) => {
    const full = norm(b.name)
    const first = norm(b.name.split(' ')[0])
    return full.startsWith(n) || n.startsWith(full) || n.startsWith(first)
  })?.color
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
