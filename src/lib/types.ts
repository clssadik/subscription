// Uygulamadaki verilerin şekli. Kart numarasının tamamı bilerek YOK:
// sadece banka adı ve son 4 hane saklanıyor.

export type Currency = 'TRY' | 'USD' | 'EUR'
export type BillingCycle = 'monthly' | 'yearly'

export interface CreditCard {
  id: string
  bankName: string
  last4: string
  /** Hesap kesim günü (ayın kaçı, 1-31) */
  statementDay: number
  /** Son ödeme günü (ayın kaçı, 1-31) */
  dueDay: number
  /** Kart limiti (TL) */
  limit: number
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
}

export const CURRENCIES: Currency[] = ['TRY', 'USD', 'EUR']

export const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Aylık',
  yearly: 'Yıllık',
}
