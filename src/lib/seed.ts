import { format, subDays } from 'date-fns'
import { BANKS } from './banks'
import { SERVICES } from './services'
import { newId } from './store'
import type { CreditCard, Subscription } from './types'

// Test hesabı için rastgele örnek veri. Gerçek hesapta kullanılmaz.

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const shuffle = <T,>(list: T[]) => [...list].sort(() => Math.random() - 0.5)

export function randomCards(count = 10): CreditCard[] {
  return shuffle(BANKS)
    .slice(0, count)
    .map((b, i) => {
      // Çoğu kredi kartı, birkaçı banka kartı
      const credit = i < Math.ceil(count * 0.7)
      return {
        id: newId(),
        bankName: b.name,
        last4: String(rand(0, 9999)).padStart(4, '0'),
        kind: credit ? 'credit' : 'debit',
        statementDay: credit ? rand(1, 28) : null,
        limit: 0,
        color: b.color,
        network: null,
      }
    })
}

export function randomSubscriptions(cards: CreditCard[], count = 10): Subscription[] {
  return shuffle(SERVICES)
    .slice(0, count)
    .map((s) => {
      const yearly = Math.random() < 0.2
      const usd = Math.random() < 0.15
      const amount = usd ? rand(199, 2999) / 100 : yearly ? rand(400, 3000) + 0.99 : rand(39, 399) + 0.99
      return {
        id: newId(),
        name: s.name,
        amount: Math.round(amount * 100) / 100,
        currency: usd ? 'USD' : 'TRY',
        cycle: yearly ? 'yearly' : 'monthly',
        // Geçmişte rastgele bir yenilenme günü; sonrakiler buradan hesaplanır
        renewalDate: format(subDays(new Date(), rand(0, yearly ? 360 : 29)), 'yyyy-MM-dd'),
        cardId: Math.random() < 0.85 && cards.length ? pick(cards).id : null,
        serviceKey: s.key,
      }
    })
}
