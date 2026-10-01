import { supabase } from './supabase'
import type { State } from './store'
import type { CreditCard, MissingLogo, Payment, Subscription } from './types'

// Veritabanındaki satırlar snake_case (bank_name), uygulamadaki veriler camelCase (bankName).
// Bu dosya ikisi arasında çeviri yapar ve değişiklikleri veritabanına gönderir.

type Row = Record<string, unknown>
const num = (v: unknown) => (v == null ? undefined : Number(v))

const cardFromRow = (r: Row): CreditCard => ({
  id: r.id as string,
  bankName: r.bank_name as string,
  last4: r.last4 as string,
  kind: (r.kind as CreditCard['kind']) ?? 'credit',
  statementDay: (r.statement_day as number) ?? null,
  dueDay: (r.due_day as number) ?? null,
  limit: Number(r.credit_limit),
  color: r.color as string,
  network: (r.network as CreditCard['network']) ?? null,
})
const cardToRow = (c: CreditCard): Row => ({
  id: c.id,
  bank_name: c.bankName,
  last4: c.last4,
  kind: c.kind,
  statement_day: c.statementDay,
  due_day: c.dueDay,
  credit_limit: c.limit,
  color: c.color,
  network: c.network,
})

const subFromRow = (r: Row): Subscription => ({
  id: r.id as string,
  name: r.name as string,
  amount: Number(r.amount),
  currency: r.currency as Subscription['currency'],
  cycle: r.cycle as Subscription['cycle'],
  renewalDate: r.renewal_date as string,
  cardId: (r.card_id as string) ?? null,
  serviceKey: (r.service_key as string) ?? null,
})
const subToRow = (s: Subscription): Row => ({
  id: s.id,
  name: s.name,
  amount: s.amount,
  currency: s.currency,
  cycle: s.cycle,
  renewal_date: s.renewalDate,
  card_id: s.cardId,
  service_key: s.serviceKey,
})

const paymentFromRow = (r: Row): Payment => ({
  id: r.id as string,
  kind: r.kind as Payment['kind'],
  refId: r.ref_id as string,
  dueDate: r.due_date as string,
  paidAt: r.paid_at as string,
  amount: num(r.amount),
  currency: (r.currency as Payment['currency']) ?? undefined,
})
const paymentToRow = (p: Payment): Row => ({
  id: p.id,
  kind: p.kind,
  ref_id: p.refId,
  due_date: p.dueDate,
  paid_at: p.paidAt,
  amount: p.amount ?? null,
  currency: p.currency ?? null,
})

function check<T>(res: { data: T | null; error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

/** Kullanıcının bütün verilerini veritabanından okur. */
export async function loadAll(): Promise<State> {
  const [cards, subs, payments, logos] = await Promise.all([
    supabase.from('cards').select('*').order('created_at'),
    supabase.from('subscriptions').select('*').order('created_at'),
    supabase.from('payments').select('*'),
    supabase.from('missing_logos').select('name, first_seen'),
  ])
  return {
    cards: check<Row[]>(cards).map(cardFromRow),
    subscriptions: check<Row[]>(subs).map(subFromRow),
    payments: check<Row[]>(payments).map(paymentFromRow),
    missingLogos: check<Row[]>(logos).map((r) => ({ name: r.name as string, firstSeen: r.first_seen as string })),
  }
}

/** İki liste arasındaki fark: eklenen/değişenler ve silinenler. */
function diff<T>(before: T[], after: T[], key: (x: T) => string) {
  const old = new Map(before.map((x) => [key(x), x]))
  const now = new Map(after.map((x) => [key(x), x]))
  return {
    upserts: after.filter((x) => old.get(key(x)) !== x),
    deletes: before.filter((x) => !now.has(key(x))).map(key),
  }
}

/** Önceki ve yeni durum arasındaki farkı veritabanına yazar. */
export async function pushChanges(before: State, after: State) {
  const cards = diff(before.cards, after.cards, (c) => c.id)
  const subs = diff(before.subscriptions, after.subscriptions, (s) => s.id)
  const payments = diff(before.payments, after.payments, (p) => p.id)
  const logos = diff<MissingLogo>(before.missingLogos, after.missingLogos, (m) => m.name)

  // Sıra önemli: abonelik bir karta, ödeme bir aboneliğe bağlı olabilir.
  // Önce silinenler (en bağımlıdan başlayarak), sonra eklenenler (en bağımsızdan başlayarak).
  if (payments.deletes.length) check(await supabase.from('payments').delete().in('id', payments.deletes))
  if (subs.deletes.length) check(await supabase.from('subscriptions').delete().in('id', subs.deletes))
  if (cards.deletes.length) check(await supabase.from('cards').delete().in('id', cards.deletes))
  if (logos.deletes.length) check(await supabase.from('missing_logos').delete().in('name', logos.deletes))

  if (cards.upserts.length) check(await supabase.from('cards').upsert(cards.upserts.map(cardToRow)))
  if (subs.upserts.length) check(await supabase.from('subscriptions').upsert(subs.upserts.map(subToRow)))
  if (payments.upserts.length) check(await supabase.from('payments').upsert(payments.upserts.map(paymentToRow)))
  if (logos.upserts.length)
    check(
      await supabase
        .from('missing_logos')
        .upsert(logos.upserts.map((m) => ({ name: m.name, first_seen: m.firstSeen })), { onConflict: 'user_id,name', ignoreDuplicates: true }),
    )
}
