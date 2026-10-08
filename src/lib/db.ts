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
  cycle: (r.cycle as Payment['cycle']) ?? undefined,
})
const paymentToRow = (p: Payment): Row => ({
  id: p.id,
  kind: p.kind,
  ref_id: p.refId,
  due_date: p.dueDate,
  paid_at: p.paidAt,
  amount: p.amount ?? null,
  currency: p.currency ?? null,
  cycle: p.cycle ?? null,
})

/** Veritabanı isteği olmadı. rejected: sunucu değişikliği bilerek reddetti (ör. aynı döneme ikinci ödeme).
 *  Değilse bağlantı ya da geçici bir sorun vardır; değişiklik cihazda kalır ve yeniden denenir. */
export class DbError extends Error {
  rejected: boolean
  constructor(message: string, rejected: boolean) {
    super(message)
    this.name = 'DbError'
    this.rejected = rejected
  }
}

type Res<T> = { data: T | null; error: { message: string; code: string } | null; status: number }

// Yetki, zaman aşımı ve hız sınırı cevapları geçici: değişiklik reddedilmiş sayılmaz
const TRANSIENT = [401, 403, 408, 429]

/** Sunucu hatası Postgres koduyla ve 4xx durumuyla geldiyse değişiklik reddedilmiştir.
 *  Bağlantı hatasında ne kod var ne durum (0). */
function check<T>(res: Res<T>): T {
  if (res.error) {
    const rejected = !!res.error.code && res.status >= 400 && res.status < 500 && !TRANSIENT.includes(res.status)
    throw new DbError(res.error.message, rejected)
  }
  return res.data as T
}

// Veritabanı tek istekte en çok 1000 satır verir (Data API sınırı); daha fazlası sayfa sayfa okunur
const PAGE = 1000

/** Bütün satırları sayfa sayfa okur. Sıralama her satırı tek başına belirlemeli (sona id eklenir); yoksa sayfa sınırında satır kaçabilir. */
async function readAll(page: (from: number, to: number) => PromiseLike<Res<Row[]>>): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const batch = check(await page(from, from + PAGE - 1))
    rows.push(...batch)
    if (batch.length < PAGE) return rows
  }
}

/** Kullanıcının bütün verilerini veritabanından okur. */
export async function loadAll(userId: string): Promise<State> {
  const mine = (table: string) => supabase.from(table).select('*').eq('user_id', userId)
  const [cards, subs, payments, logos] = await Promise.all([
    readAll((from, to) => mine('cards').order('created_at').order('id').range(from, to)),
    readAll((from, to) => mine('subscriptions').order('created_at').order('id').range(from, to)),
    readAll((from, to) => mine('payments').order('due_date').order('id').range(from, to)),
    readAll((from, to) => supabase.from('missing_logos').select('name, first_seen').eq('user_id', userId).order('name').range(from, to)),
  ])
  return {
    cards: cards.map(cardFromRow),
    subscriptions: subs.map(subFromRow),
    payments: payments.map(paymentFromRow),
    missingLogos: logos.map((r) => ({ name: r.name as string, firstSeen: r.first_seen as string })),
  }
}

/** Bir listedeki fark: eklenen ya da değişenler (yeni değerleriyle) ve silinenlerin kimlikleri */
export interface ListChanges<T> {
  upserts: T[]
  deletes: string[]
}

export interface StateChanges {
  cards: ListChanges<CreditCard>
  subscriptions: ListChanges<Subscription>
  payments: ListChanges<Payment>
  missingLogos: ListChanges<MissingLogo>
}

/** Aynı satır mı? Değerlere bakılır; değeri tanımsız olan alan hiç yokmuş gibi sayılır. */
function sameRow(a: object, b: object) {
  const x = a as Record<string, unknown>
  const y = b as Record<string, unknown>
  return Object.keys({ ...x, ...y }).every((k) => x[k] === y[k])
}

/** İki liste arasındaki fark: eklenen/değişenler ve silinenler. Kimliğe göre karşılaştırılır. */
function diff<T extends object>(before: T[], after: T[], key: (x: T) => string): ListChanges<T> {
  const old = new Map<string, T>(before.map((x) => [key(x), x] as const))
  const now = new Set(after.map(key))
  return {
    upserts: after.filter((x) => {
      const prev = old.get(key(x))
      return !prev || !sameRow(prev, x)
    }),
    deletes: before.map(key).filter((k) => !now.has(k)),
  }
}

/** Önceki ve sonraki durum arasındaki fark: veritabanına ne gönderileceği. */
export function diffState(before: State, after: State): StateChanges {
  return {
    cards: diff(before.cards, after.cards, (c) => c.id),
    subscriptions: diff(before.subscriptions, after.subscriptions, (s) => s.id),
    payments: diff(before.payments, after.payments, (p) => p.id),
    missingLogos: diff(before.missingLogos, after.missingLogos, (m) => m.name),
  }
}

/** Gönderilecek bir şey var mı? */
export function hasChanges(changes: StateChanges) {
  return Object.values(changes).some((l) => l.upserts.length > 0 || l.deletes.length > 0)
}

/** Toplu yazma sunucuda reddedilirse satırlar tek tek denenir: bir çakışan satır yüzünden öteki satırlar kaybolmaz.
 *  Döner: reddedilen satır sayısı. Bağlantı ya da geçici bir hata dışarı çıkar. */
async function sendRows<T>(rows: T[], send: (batch: T[]) => PromiseLike<Res<unknown>>): Promise<number> {
  if (rows.length === 0) return 0
  try {
    check(await send(rows))
    return 0
  } catch (e) {
    if (!(e instanceof DbError) || !e.rejected) throw e
    if (rows.length === 1) return 1
  }
  let refused = 0
  for (const row of rows) refused += await sendRows([row], send)
  return refused
}

/** Önceki ve yeni durum arasındaki farkı veritabanına yazar. Satırlar açıkça bu kullanıcıya yazılır
 *  (oturum başka bir hesaba geçmişse yazma reddedilir, başkasının hesabına karışmaz).
 *  Sunucunun reddettiği satır varsa true döner; öteki satırlar yine kaydedilir. Bağlantı sorununda hata fırlatır. */
export async function pushChanges(userId: string, before: State, after: State): Promise<boolean> {
  const d = diffState(before, after)
  const mine = { user_id: userId }
  let refused = 0

  // Sıra önemli: abonelik bir karta, ödeme bir aboneliğe bağlı olabilir.
  // Önce silinenler (en bağımlıdan başlayarak), sonra eklenenler (en bağımsızdan başlayarak).
  refused += await sendRows(d.payments.deletes, (ids) => supabase.from('payments').delete().eq('user_id', userId).in('id', ids))
  refused += await sendRows(d.subscriptions.deletes, (ids) => supabase.from('subscriptions').delete().eq('user_id', userId).in('id', ids))
  refused += await sendRows(d.cards.deletes, (ids) => supabase.from('cards').delete().eq('user_id', userId).in('id', ids))
  refused += await sendRows(d.missingLogos.deletes, (names) => supabase.from('missing_logos').delete().eq('user_id', userId).in('name', names))

  refused += await sendRows(d.cards.upserts, (batch) => supabase.from('cards').upsert(batch.map((c) => ({ ...cardToRow(c), ...mine }))))
  refused += await sendRows(d.subscriptions.upserts, (batch) =>
    supabase.from('subscriptions').upsert(batch.map((s) => ({ ...subToRow(s), ...mine }))),
  )
  refused += await sendRows(d.payments.upserts, (batch) => supabase.from('payments').upsert(batch.map((p) => ({ ...paymentToRow(p), ...mine }))))
  refused += await sendRows(d.missingLogos.upserts, (batch) =>
    supabase
      .from('missing_logos')
      .upsert(batch.map((m) => ({ name: m.name, first_seen: m.firstSeen, ...mine })), { onConflict: 'user_id,name', ignoreDuplicates: true }),
  )
  return refused > 0
}
