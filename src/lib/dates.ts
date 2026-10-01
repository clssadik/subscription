import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  getDaysInMonth,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { CreditCard, Subscription } from './types'

/** Ayın `day`. günü; ay o kadar uzun değilse (ör. Şubat'ta 31) ayın son günü. */
function dayInMonth(year: number, month: number, day: number) {
  const last = getDaysInMonth(new Date(year, month, 1))
  return new Date(year, month, Math.min(day, last))
}

/** `from` tarihinden itibaren (o gün dahil) ayın `day`. gününe denk gelen ilk tarih. */
export function nextMonthlyDay(day: number, from: Date = new Date()) {
  const today = startOfDay(from)
  const thisMonth = dayInMonth(today.getFullYear(), today.getMonth(), day)
  if (thisMonth >= today) return thisMonth
  return dayInMonth(today.getFullYear(), today.getMonth() + 1, day)
}

/** Aboneliğin bugünden itibaren bir sonraki yenilenme tarihi. */
export function nextRenewal(sub: Subscription, from: Date = new Date()) {
  const today = startOfDay(from)
  const anchor = parseISO(sub.renewalDate)
  const step = sub.cycle === 'monthly' ? addMonths : addYears
  // Hep ilk tarihten ileri sayıyoruz ki 31'inde başlayan abonelik
  // Şubat'tan sonra 28'ine kaymasın.
  let n = 0
  let date = anchor
  while (date < today) date = step(anchor, ++n)
  return date
}

export function daysUntil(date: Date, from: Date = new Date()) {
  return differenceInCalendarDays(date, startOfDay(from))
}

export function monthlyCost(sub: Subscription) {
  return sub.cycle === 'monthly' ? sub.amount : sub.amount / 12
}

export type UpcomingPayment =
  | { kind: 'subscription'; date: Date; subscription: Subscription }
  | { kind: 'card-due'; date: Date; card: CreditCard }

/** Önümüzdeki `days` gün içindeki abonelik yenilemeleri ve kart son ödeme günleri. */
export function upcomingPayments(
  cards: CreditCard[],
  subscriptions: Subscription[],
  days = 30,
  from: Date = new Date(),
): UpcomingPayment[] {
  const items: UpcomingPayment[] = [
    ...subscriptions.map((s) => ({
      kind: 'subscription' as const,
      date: nextRenewal(s, from),
      subscription: s,
    })),
    ...cards.map((c) => ({ kind: 'card-due' as const, date: nextMonthlyDay(c.dueDay, from), card: c })),
  ]
  return items
    .filter((i) => daysUntil(i.date, from) <= days)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}
