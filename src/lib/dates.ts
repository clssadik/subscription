import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  endOfMonth,
  format,
  getDaysInMonth,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import type { CreditCard, Payment, Subscription } from './types'

export const toKey = (d: Date) => format(d, 'yyyy-MM-dd')

/** Ayın `day`. günü; ay o kadar uzun değilse (ör. Şubat'ta 31) ayın son günü. */
function dayInMonth(year: number, month: number, day: number) {
  const last = getDaysInMonth(new Date(year, month, 1))
  return new Date(year, month, Math.min(day, last))
}

/** Aboneliğin [start, end] aralığına düşen bütün yenilenme tarihleri. */
export function renewalsBetween(sub: Subscription, start: Date, end: Date) {
  const anchor = parseISO(sub.renewalDate)
  const monthly = sub.cycle === 'monthly'
  const step = monthly ? addMonths : addYears
  // Hep ilk tarihten sayıyoruz ki 31'inde başlayan abonelik Şubat'tan sonra 28'ine kaymasın.
  let n = (monthly ? differenceInCalendarMonths : differenceInCalendarYears)(start, anchor) - 1
  let date = step(anchor, n)
  while (date < start) date = step(anchor, ++n)
  const out: Date[] = []
  while (date <= end) {
    out.push(date)
    date = step(anchor, ++n)
  }
  return out
}

/** Son ödeme günü olan kart: kredi kartı. Banka kartlarında son ödeme yok. */
export type DueCard = CreditCard & { dueDay: number }
export const hasDue = (c: CreditCard): c is DueCard => c.kind === 'credit' && c.dueDay != null

export function cardDueInMonth(card: DueCard, month: Date) {
  return dayInMonth(month.getFullYear(), month.getMonth(), card.dueDay)
}

export function isPaid(payments: Payment[], refId: string, date: Date) {
  const key = toKey(date)
  return payments.some((p) => p.refId === refId && p.dueDate === key)
}

/** Bugünden itibaren henüz "ödendi" işaretlenmemiş ilk yenilenme. */
export function nextRenewal(sub: Subscription, payments: Payment[] = [], from: Date = new Date()) {
  const today = startOfDay(from)
  const dates = renewalsBetween(sub, today, addYears(today, 3))
  return dates.find((d) => !isPaid(payments, sub.id, d)) ?? dates[0]
}

/** Bugünden itibaren henüz "ödendi" işaretlenmemiş ilk son ödeme günü. */
export function nextCardDue(card: DueCard, payments: Payment[] = [], from: Date = new Date()) {
  const today = startOfDay(from)
  for (let i = 0; i < 3; i++) {
    const d = cardDueInMonth(card, addMonths(today, i))
    if (d >= today && !isPaid(payments, card.id, d)) return d
  }
  return cardDueInMonth(card, addMonths(today, 1))
}

export function daysUntil(date: Date, from: Date = new Date()) {
  return differenceInCalendarDays(date, startOfDay(from))
}

/** "bugün", "yarın", "5 gün", "2 gün geçti" */
export function dueLabel(date: Date, from: Date = new Date()) {
  const d = daysUntil(date, from)
  if (d === 0) return 'bugün'
  if (d === 1) return 'yarın'
  if (d < 0) return `${-d} gün geçti`
  return `${d} gün`
}

export function monthlyCost(sub: Subscription) {
  return sub.cycle === 'monthly' ? sub.amount : sub.amount / 12
}

export type MonthItem =
  | { kind: 'subscription'; date: Date; paid: boolean; subscription: Subscription }
  | { kind: 'card'; date: Date; paid: boolean; card: DueCard }

/** Bir aydaki bütün ödemeler (abonelik yenilemeleri + kart son ödemeleri), tarih sırasıyla. */
export function monthItems(
  cards: CreditCard[],
  subscriptions: Subscription[],
  payments: Payment[],
  month: Date = new Date(),
): MonthItem[] {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const items: MonthItem[] = [
    ...subscriptions.flatMap((s) =>
      renewalsBetween(s, start, end).map((date) => ({
        kind: 'subscription' as const,
        date,
        paid: isPaid(payments, s.id, date),
        subscription: s,
      })),
    ),
    ...cards.filter(hasDue).map((c) => {
      const date = cardDueInMonth(c, start)
      return { kind: 'card' as const, date, paid: isPaid(payments, c.id, date), card: c }
    }),
  ]
  return items.sort((a, b) => a.date.getTime() - b.date.getTime())
}
