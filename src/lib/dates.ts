import {
  addDays,
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

/** Son ödemesi olan kart: kesim günü girilmiş kredi kartı. Banka kartlarında son ödeme yok. */
export type DueCard = CreditCard & { statementDay: number }
export const hasDue = (c: CreditCard): c is DueCard => c.kind === 'credit' && c.statementDay != null

/** O ayın hesap kesimi (ay kısaysa, ör. Şubat'ta 30, ayın son günü) */
export function statementInMonth(card: DueCard, month: Date) {
  return dayInMonth(month.getFullYear(), month.getMonth(), card.statementDay)
}

/** Son ödeme: kesimden tam 10 gün sonra. Hafta sonu ya da tatil olması değiştirmez. */
export function dueForStatement(statement: Date) {
  return addDays(statement, 10)
}

/** Bir ekstre dönemi: kesim ve ona ait son ödeme */
export interface CardCycle {
  statement: Date
  due: Date
}

/** [start, end] aralığına son ödemesi düşen bütün dönemler. Bir ayda 0, 1 ya da 2 son ödeme olabilir. */
export function cardCyclesBetween(card: DueCard, start: Date, end: Date): CardCycle[] {
  const out: CardCycle[] = []
  // Kesimden 10+ gün sonra ödeme gelir: iki ay öncesinden başlamak yeter
  for (let m = startOfMonth(addMonths(start, -2)); m <= end; m = addMonths(m, 1)) {
    const statement = statementInMonth(card, m)
    const due = dueForStatement(statement)
    if (due >= start && due <= end) out.push({ statement, due })
  }
  return out
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

/** Bugünden itibaren henüz "ödendi" işaretlenmemiş ilk dönem; bir önceki dönemin son ödemesiyle birlikte */
export function nextCardCycle(card: DueCard, payments: Payment[] = [], from: Date = new Date()) {
  const today = startOfDay(from)
  const cycles = cardCyclesBetween(card, addMonths(today, -2), addMonths(today, 4))
  const i = Math.max(0, cycles.findIndex((c) => c.due >= today && !isPaid(payments, card.id, c.due)))
  return { ...cycles[i], previousDue: cycles[i - 1]?.due ?? null }
}

/** Bugünden itibaren henüz "ödendi" işaretlenmemiş ilk son ödeme günü. */
export function nextCardDue(card: DueCard, payments: Payment[] = [], from: Date = new Date()) {
  return nextCardCycle(card, payments, from).due
}

/** Ödendi işaretlenebilir mi: sadece bu ayın ya da geçmiş ayların ödemeleri. Gelecek ay, ay değişince açılır. */
export function canMarkPaid(date: Date, from: Date = new Date()) {
  return date <= endOfMonth(from)
}

/** Bu ay içinde ödendi işaretlenmiş bir ödemesi var mı */
export function paidThisMonth(payments: Payment[], refId: string, from: Date = new Date()) {
  const month = format(from, 'yyyy-MM')
  return payments.some((p) => p.refId === refId && p.dueDate.startsWith(month))
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
    ...cards.filter(hasDue).flatMap((c) =>
      cardCyclesBetween(c, start, end).map(({ due: date }) => ({
        kind: 'card' as const,
        date,
        paid: isPaid(payments, c.id, date),
        card: c,
      })),
    ),
  ]
  return items.sort((a, b) => a.date.getTime() - b.date.getTime())
}
