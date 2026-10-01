// Uygulamadaki verilerin şekli. Kart numarasının tamamı bilerek YOK:
// sadece banka adı ve son 4 hane saklanıyor.

export type Currency = 'TRY' | 'USD' | 'EUR'
export type BillingCycle = 'monthly' | 'yearly'
export type CardNetwork = 'visa' | 'mastercard' | 'troy' | 'amex'
export type CardKind = 'credit' | 'debit'

export interface CreditCard {
  id: string
  bankName: string
  last4: string
  /** Kredi kartı mı, banka kartı mı */
  kind: CardKind
  /** Hesap kesim günü (ayın kaçı, 1-31); banka kartında yok */
  statementDay: number | null
  /** Son ödeme günü (ayın kaçı, 1-31); banka kartında yok */
  dueDay: number | null
  /** Kart limiti (TL) */
  limit: number
  /** Kartın rengi, "#RRGGBB" */
  color: string
  network: CardNetwork | null
}

export interface Subscription {
  id: string
  name: string
  amount: number
  currency: Currency
  cycle: BillingCycle
  /** Bilinen bir yenilenme tarihi, "yyyy-MM-dd". Sonrakiler buradan hesaplanır. */
  renewalDate: string
  /** Hangi karttan çekildiği; kart silinirse null olur */
  cardId: string | null
  /** Hazır servis listesindeki anahtarı (logo ve renk için); listede yoksa null */
  serviceKey: string | null
}

/** "Ödendi" kaydı. Abonelikte tutar saklanır; kartta sadece ödendiği bilgisi. */
export interface Payment {
  id: string
  kind: 'subscription' | 'card'
  /** Abonelik ya da kartın id'si */
  refId: string
  /** Hangi döneme ait: yenilenme ya da son ödeme tarihi, "yyyy-MM-dd" */
  dueDate: string
  /** İşaretlendiği gün, "yyyy-MM-dd" */
  paidAt: string
  amount?: number
  currency?: Currency
}

/** Logosu olmayan bir servis eklendiğinde düşülen not (Supabase gelince oraya gönderilecek) */
export interface MissingLogo {
  name: string
  firstSeen: string
}

export const CURRENCIES: Currency[] = ['TRY', 'USD', 'EUR']

export const CARD_KIND_LABELS: Record<CardKind, string> = {
  credit: 'Kredi kartı',
  debit: 'Banka kartı',
}

export const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Aylık',
  yearly: 'Yıllık',
}
