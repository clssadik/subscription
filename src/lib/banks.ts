import { siAmericanexpress, siMastercard, siVisa } from 'simple-icons'
import type { CardNetwork } from './types'

// Bilinen Türk bankaları ve kart renkleri. Banka seçilince renk kendiliğinden gelir,
// istenirse formda değiştirilebilir.
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

/** Elle seçilebilecek kart renkleri */
export const CARD_COLORS = ['#0B7A43', '#C8102E', '#004B93', '#1F4FB4', '#D9381E', '#6F2DA8', '#FF6200', '#2B2A29', '#00838F', '#B8860B']

export function bankColor(name: string) {
  const n = name.trim().toLocaleLowerCase('tr')
  return BANKS.find((b) => b.name.toLocaleLowerCase('tr') === n)?.color
}

export const NETWORKS: { key: CardNetwork; label: string; path?: string }[] = [
  { key: 'visa', label: 'Visa', path: siVisa.path },
  { key: 'mastercard', label: 'Mastercard', path: siMastercard.path },
  { key: 'troy', label: 'troy' },
  { key: 'amex', label: 'Amex', path: siAmericanexpress.path },
]
