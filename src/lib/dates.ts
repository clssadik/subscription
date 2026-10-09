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
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import type { BillingCycle, CreditCard, Payment, Subscription } from './types'

export const toKey = (d: Date) => format(d, 'yyyy-MM-dd')

/** Ayın `day`. günü; ay o kadar uzun değilse (ör. Şubat'ta 31) ayın son günü. */
function dayInMonth(year: number, month: number, day: number) {
  const last = getDaysInMonth(new Date(year, month, 1))
  return new Date(year, month, Math.min(day, last))
}

/** Aboneliğin [start, end] aralığına düşen bütün yenilenme tarihleri. Çapadan önce yenilenme yoktur. */
function renewalsBetween(sub: Subscription, start: Date, end: Date) {
  const anchor = parseISO(sub.renewalDate)
  const monthly = sub.cycle === 'monthly'
  const step = monthly ? addMonths : addYears
  // Hep ilk tarihten sayıyoruz ki 31'inde başlayan abonelik Şubat'tan sonra 28'ine kaymasın.
  // Sayaç 0'ın altına inmez: çapa gelecekteyse ilk yenilenme çapanın kendisidir.
  let n = Math.max(0, (monthly ? differenceInCalendarMonths : differenceInCalendarYears)(start, anchor) - 1)
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
function statementInMonth(card: DueCard, month: Date) {
  return dayInMonth(month.getFullYear(), month.getMonth(), card.statementDay)
}

/** Son ödeme: kesimden tam 10 gün sonra. Hafta sonu ya da tatil olması değiştirmez. */
function dueForStatement(statement: Date) {
  return addDays(statement, 10)
}

/** Bir ekstre dönemi: kesim ve ona ait son ödeme */
export interface CardCycle {
  statement: Date
  due: Date
}

/** [start, end] aralığına son ödemesi düşen bütün dönemler. Bir ayda 0, 1 ya da 2 son ödeme olabilir. */
/** Kart uygulamaya eklenmeden önceki son ödemeler sayılmaz: o dönemler ödenmemiş görünmesin. */
const tracked = (card: DueCard, due: Date) => !card.addedAt || toKey(due) >= card.addedAt

function cardCyclesBetween(card: DueCard, start: Date, end: Date): CardCycle[] {
  const out: CardCycle[] = []
  // Kesimden 10+ gün sonra ödeme gelir: iki ay öncesinden başlamak yeter
  for (let m = startOfMonth(addMonths(start, -2)); m <= end; m = addMonths(m, 1)) {
    const statement = statementInMonth(card, m)
    const due = dueForStatement(statement)
    if (due >= start && due <= end) out.push({ statement, due })
  }
  return out
}

/** Ödemenin dönemi: kartta kesimin ayı, aylık abonelikte ayı, yıllıkta yılı. */
export type PeriodKind = 'card' | BillingCycle

/** Dönem anahtarı. Kesim günü ya da yenilenme tarihi sonradan değişse de o dönemin "ödendi" işareti kaybolmaz. */
function periodKey(kind: PeriodKind, date: Date) {
  if (kind === 'card') return format(addDays(date, -10), 'yyyy-MM')
  return format(date, kind === 'yearly' ? 'yyyy' : 'yyyy-MM')
}

/** Bu tarihin dönemi için işaretlenmiş ödeme. Abonelikte ödemenin türü de tutmalı: yıllığa geçince eski aylık ödemeler yıllık yenilemeyi kapatmaz. Türü kaydedilmemiş (eski) ödemeler her türle eşleşir. */
export function findPayment(payments: Payment[], refId: string, date: Date, kind: PeriodKind) {
  const key = periodKey(kind, date)
  return payments.find(
    (p) => p.refId === refId && periodKey(kind, parseISO(p.dueDate)) === key && (kind === 'card' || !p.cycle || p.cycle === kind),
  )
}

function isPaid(payments: Payment[], refId: string, date: Date, kind: PeriodKind) {
  return !!findPayment(payments, refId, date, kind)
}

/** [start, end] içindeki ödenmemiş ilk yenilenme. Hepsi ödendiyse ya da aralıkta yenilenme yoksa ilk yenilenme (ya da çapa) döner. */
function firstUnpaid(sub: Subscription, payments: Payment[], start: Date, end: Date) {
  const dates = renewalsBetween(sub, start, end)
  return dates.find((d) => !isPaid(payments, sub.id, d, sub.cycle)) ?? dates[0] ?? parseISO(sub.renewalDate)
}

/** Son iki aydan itibaren ödendi işaretlenmemiş ilk yenilenme. Gecikmiş olan önce gelir ve ödenene kadar kalır. Çapa 3 yıldan uzaktaysa pencerede yenilenme yoktur: çapa döner. */
export function nextRenewal(sub: Subscription, payments: Payment[] = [], from: Date = new Date()) {
  const today = startOfDay(from)
  return firstUnpaid(sub, payments, addMonths(today, -2), addYears(today, 3))
}

/** Bugünden itibaren ödendi işaretlenmemiş ilk yenilenme. Gecikmiş olanlar atlanır (ana ekrandaki "Sıradaki" için). */
export function upcomingRenewal(sub: Subscription, payments: Payment[] = [], from: Date = new Date()) {
  const today = startOfDay(from)
  return firstUnpaid(sub, payments, today, addYears(today, 3))
}

/**
 * Bugünden itibaren henüz "ödendi" işaretlenmemiş ilk dönem; bir önceki dönemin son ödemesiyle birlikte.
 * Hepsi ödendiyse bugünden sonraki ilk dönem (paid: true). Geçmiş bir dönem asla seçilmez.
 */
export function nextCardCycle(card: DueCard, payments: Payment[] = [], from: Date = new Date()) {
  const today = startOfDay(from)
  const cycles = cardCyclesBetween(card, addMonths(today, -2), addMonths(today, 4))
  const open = cycles.findIndex((c) => c.due >= today && !isPaid(payments, card.id, c.due, 'card'))
  const future = cycles.findIndex((c) => c.due >= today)
  const i = open >= 0 ? open : future >= 0 ? future : cycles.length - 1
  return { ...cycles[i], previousDue: cycles[i - 1]?.due ?? null, paid: isPaid(payments, card.id, cycles[i].due, 'card') }
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
  return !!paymentThisMonth(payments, refId, from)
}

/** Son ödemesi bu ayda olan ödemelerden en yenisi (kartın ekstre notunda ve geri almada kullanılır) */
export function paymentThisMonth(payments: Payment[], refId: string, from: Date = new Date()): Payment | undefined {
  const month = format(from, 'yyyy-MM')
  return payments
    .filter((p) => p.refId === refId && p.dueDate.startsWith(month))
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0]
}

/** Son ödeme gününün ait olduğu kesim (dueForStatement'ın tersi) */
export function statementOfDue(due: Date) {
  return addDays(due, -10)
}

/** Son ödemesi geçmiş ama ödendi işaretlenmemiş dönemler, en eskisi başta. En fazla son iki aya bakar. */
export function overdueCardCycles(card: DueCard, payments: Payment[] = [], from: Date = new Date()): CardCycle[] {
  const today = startOfDay(from)
  return cardCyclesBetween(card, addMonths(today, -2), addDays(today, -1)).filter((c) => tracked(card, c.due) && !isPaid(payments, card.id, c.due, 'card'))
}

/** Son ödeme bu takvim ayında mı */
export function dueThisMonth(due: Date, from: Date = new Date()) {
  return isSameMonth(due, from)
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
        paid: isPaid(payments, s.id, date, s.cycle),
        subscription: s,
      })),
    ),
    ...cards.filter(hasDue).flatMap((c) =>
      cardCyclesBetween(c, start, end)
        .filter(({ due }) => tracked(c, due))
        .map(({ due: date }) => ({
        kind: 'card' as const,
        date,
        paid: isPaid(payments, c.id, date, 'card'),
        card: c,
      })),
    ),
  ]
  return items.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Bu aydan önceki, ödendi işaretlenmemiş dönemler (son iki ay), en eskisi başta. Ana ekrandaki "Gecikmiş" listesi. */
export function overdueItems(cards: CreditCard[], subscriptions: Subscription[], payments: Payment[], from: Date = new Date()): MonthItem[] {
  const today = startOfDay(from)
  const thisMonth = startOfMonth(today)
  const items: MonthItem[] = [
    ...subscriptions.flatMap((s) =>
      renewalsBetween(s, addMonths(today, -2), addDays(today, -1))
        .filter((date) => date < thisMonth && !isPaid(payments, s.id, date, s.cycle))
        .map((date) => ({ kind: 'subscription' as const, date, paid: false, subscription: s })),
    ),
    ...cards.filter(hasDue).flatMap((c) =>
      overdueCardCycles(c, payments, today)
        .filter(({ due }) => due < thisMonth)
        .map(({ due: date }) => ({ kind: 'card' as const, date, paid: false, card: c })),
    ),
  ]
  return items.sort((a, b) => a.date.getTime() - b.date.getTime())
}
