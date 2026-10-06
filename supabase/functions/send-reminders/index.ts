// Monthwise hatırlatmaları (tutarsız; başlık ve metin tek satıra sığacak kadar kısa, ~38 harf): her 15 dakikada (pg_cron) çağrılır, saati gelmiş kullanıcılara yaklaşan ödemeleri Web Push ile gönderir.
// Aynı hatırlatma notification_log sayesinde günde bir kez gider. Uygulamadaki "Dene" düğmesi { test: true } ile çağırır.
// Tarih kuralları uygulamadakiyle aynı (src/lib/dates.ts): yenilenmeler hep ilk tarihten sayılır, kart son ödemesi = kesim + 10 gün.
//
// Gizli değerler (Supabase → Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET.
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase tarafından kendiliğinden verilir. "Verify JWT" kapalı olmalı (çağıranı kendimiz denetliyoruz).

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const TZ = 'Europe/Istanbul'
const APP_URL = 'https://subly-tr.vercel.app'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})
webpush.setVapidDetails(APP_URL, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

// ---------- Tarihler: gün sayısı (1970'ten beri gün) ile çalışılır, saat dilimi karışmaz ----------

type Day = number
const DAY = 86_400_000
const dayOf = (y: number, m: number, d: number): Day => Date.UTC(y, m - 1, d) / DAY
const parts = (day: Day) => {
  const t = new Date(day * DAY)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}
const fromKey = (key: string): Day => {
  const [y, m, d] = key.split('-').map(Number)
  return dayOf(y, m, d)
}
const toKey = (day: Day) => new Date(day * DAY).toISOString().slice(0, 10)
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** Ayın `day`. günü; ay kısaysa son günü */
function dayInMonth(y: number, m: number, day: number): Day {
  return dayOf(y, m, Math.min(day, daysInMonth(y, m)))
}

/** anchor + n ay (date-fns addMonths gibi: ay kısaysa son güne iner) */
function addMonths(anchor: Day, n: number): Day {
  const { y, m, d } = parts(anchor)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return dayInMonth(ny, nm, d)
}

/** Aboneliğin [start, end] aralığındaki yenilenmeleri */
function renewalsBetween(sub: SubRow, start: Day, end: Day): Day[] {
  const anchor = fromKey(sub.renewal_date)
  const step = sub.cycle === 'monthly' ? 1 : 12
  const a = parts(anchor)
  const s = parts(start)
  let n = Math.floor(((s.y - a.y) * 12 + (s.m - a.m)) / step) - 1
  let date = addMonths(anchor, n * step)
  while (date < start) date = addMonths(anchor, ++n * step)
  const out: Day[] = []
  while (date <= end) {
    out.push(date)
    date = addMonths(anchor, ++n * step)
  }
  return out
}

/** Kartın [start, end] aralığına son ödemesi düşen dönemleri: kesim ve son ödeme (kesim + 10 gün) */
function cardCyclesBetween(card: CardRow, start: Day, end: Day) {
  const out: { statement: Day; due: Day }[] = []
  const s = parts(start)
  for (let i = -2; i <= 14; i++) {
    const total = s.y * 12 + (s.m - 1) + i
    const statement = dayInMonth(Math.floor(total / 12), (total % 12) + 1, card.statement_day!)
    const due = statement + 10
    if (statement > end) break
    if (due >= start && due <= end) out.push({ statement, due })
  }
  return out
}

/** İstanbul'da şu an: gün, dakika (gece yarısından beri), haftanın günü (1 = pazartesi) */
function nowInIstanbul() {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  })
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]))
  const today = dayOf(Number(p.year), Number(p.month), Number(p.day))
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1
  return { today, minutes: Number(p.hour) * 60 + Number(p.minute), weekday, dayOfMonth: Number(p.day) }
}

// ---------- Yazı ----------

const dateLabel = (day: Day) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(day * DAY))
/** "17 Ekim Cuma" */
const dayLabel = (day: Day) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC' }).format(new Date(day * DAY))
/** Kart kısaca: "Garanti BBVA •• 4821" */
const cardLabel = (card: CardRow) => `${card.bank_name} •• ${card.last4}`
const when = (diff: number) => (diff === 0 ? 'bugün' : diff === 1 ? 'yarın' : diff === 7 ? '1 hafta sonra' : `${diff} gün sonra`)
const cap = (s: string) => s[0].toLocaleUpperCase('tr') + s.slice(1)

// ---------- Veri ----------

type SubRow = { id: string; user_id: string; name: string; card_id: string | null; cycle: 'monthly' | 'yearly'; renewal_date: string }
type CardRow = { id: string; user_id: string; bank_name: string; last4: string; kind: 'credit' | 'debit'; statement_day: number | null }
type Notify = {
  enabled: boolean
  subscriptionDays: number[]
  cardDays: number[]
  statement: boolean
  time: string
  overdue: boolean
  summary: 'off' | 'weekly' | 'monthly'
  perSubscription: Record<string, 'off' | number>
}
type PushRow = { id: number; user_id: string; endpoint: string; p256dh: string; auth: string }
type Message = { key: string; title: string; body: string }

// Uygulamadaki varsayılanlarla aynı (src/lib/settings.ts)
const DEFAULT_NOTIFY: Notify = {
  enabled: true,
  subscriptionDays: [1],
  cardDays: [3, 1],
  statement: true,
  time: '09:00',
  overdue: true,
  summary: 'weekly',
  perSubscription: {},
}

function group<T extends { user_id: string }>(rows: T[] | null) {
  const map = new Map<string, T[]>()
  for (const r of rows ?? []) map.set(r.user_id, [...(map.get(r.user_id) ?? []), r])
  return map
}

// ---------- Bildirim metinleri ----------
// Tutar yok. Başlık ne olduğunu, metin ne zaman ve hangi karttan olduğunu söyler; ikisi de tek satıra sığar.
// Hatırlatmalar ve "bütün türleri dene" aynı metinleri kullanır.

const text = {
  /** "Netflix yarın yenileniyor" / "8 Ekim · Garanti BBVA •• 4821" (kart yoksa "8 Ekim Çarşamba") */
  subDue: (sub: SubRow, card: CardRow | undefined, date: Day, diff: number) => ({
    title: `${sub.name} ${when(diff)} yenileniyor`,
    body: card ? `${dateLabel(date)} · ${cardLabel(card)}` : dayLabel(date),
  }),
  subLate: (sub: SubRow, card: CardRow | undefined) => ({
    title: `${sub.name} ödemesi işaretlenmedi`,
    body: card ? `Dün yenilendi · ${cardLabel(card)}` : 'Dün yenilendi',
  }),
  statement: (card: CardRow, due: Day) => ({ title: `${card.bank_name} ekstresi kesildi`, body: `•• ${card.last4} · son ödeme ${dayLabel(due)}` }),
  cardDue: (card: CardRow, due: Day, diff: number) => ({ title: `${card.bank_name} son ödemesi ${when(diff)}`, body: `•• ${card.last4} · ${dayLabel(due)}` }),
  cardLate: (card: CardRow) => ({ title: `${card.bank_name} son ödemesi geçti`, body: `•• ${card.last4} · ödendi işaretlenmedi` }),
  /** "Bu hafta 4 ödeme" / "Netflix, Spotify, Garanti BBVA +1" (sığdığı kadar ad, kalanı sayı) */
  summary: (weekly: boolean, names: string[]) => {
    const shown: string[] = []
    for (const name of names) {
      if (shown.length && [...shown, name].join(', ').length > 30) break
      shown.push(name)
    }
    const rest = names.length - shown.length
    return { title: `${weekly ? 'Bu hafta' : 'Bu ay'} ${names.length} ödeme`, body: shown.join(', ') + (rest > 0 ? ` +${rest}` : '') }
  },
}

/** Bir kullanıcının bugün gönderilecek hatırlatmaları */
function messagesFor(notify: Notify, subs: SubRow[], cards: CardRow[], paid: Set<string>, now: ReturnType<typeof nowInIstanbul>): Message[] {
  const { today } = now
  const isPaid = (ref: string, day: Day) => paid.has(`${ref}|${toKey(day)}`)
  const out: Message[] = []

  const cardOf = new Map(cards.map((c) => [c.id, c]))
  for (const sub of subs) {
    const own = notify.perSubscription[sub.id]
    const days = own === 'off' ? [] : own !== undefined ? [own] : notify.subscriptionDays
    const card = sub.card_id ? cardOf.get(sub.card_id) : undefined
    for (const date of renewalsBetween(sub, today - 1, today + 7)) {
      const diff = date - today
      if (isPaid(sub.id, date)) continue
      if (diff >= 0 && days.includes(diff)) out.push({ key: `sub:${sub.id}:${toKey(date)}:${diff}`, ...text.subDue(sub, card, date, diff) })
      if (diff === -1 && notify.overdue && own !== 'off') out.push({ key: `sub-late:${sub.id}:${toKey(date)}`, ...text.subLate(sub, card) })
    }
  }

  for (const card of cards) {
    if (card.kind !== 'credit' || card.statement_day == null) continue
    for (const { statement, due } of cardCyclesBetween(card, today - 1, today + 40)) {
      const diff = due - today
      if (notify.statement && statement === today) out.push({ key: `stmt:${card.id}:${toKey(statement)}`, ...text.statement(card, due) })
      if (isPaid(card.id, due)) continue
      if (diff >= 0 && notify.cardDays.includes(diff)) out.push({ key: `card:${card.id}:${toKey(due)}:${diff}`, ...text.cardDue(card, due, diff) })
      if (diff === -1 && notify.overdue) out.push({ key: `card-late:${card.id}:${toKey(due)}`, ...text.cardLate(card) })
    }
  }

  // Özet: pazartesi o haftanın, ayın 1'inde o ayın ödemeleri (tarih sırasıyla)
  const weekly = notify.summary === 'weekly' && now.weekday === 1
  const monthly = notify.summary === 'monthly' && now.dayOfMonth === 1
  if (weekly || monthly) {
    const { y, m } = parts(today)
    const end = weekly ? today + 6 : dayOf(y, m, daysInMonth(y, m))
    const due: { day: Day; name: string }[] = []
    for (const sub of subs)
      for (const date of renewalsBetween(sub, today, end)) if (!isPaid(sub.id, date)) due.push({ day: date, name: sub.name })
    for (const card of cards)
      if (card.kind === 'credit' && card.statement_day != null)
        for (const c of cardCyclesBetween(card, today, end)) if (!isPaid(card.id, c.due)) due.push({ day: c.due, name: card.bank_name })
    if (due.length > 0)
      out.push({ key: `summary:${weekly ? 'w' : 'm'}`, ...text.summary(weekly, due.sort((a, b) => a.day - b.day).map((d) => d.name)) })
  }
  return out
}

async function push(sub: PushRow, payload: Record<string, unknown>) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload))
    return true
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    // Telefon izni geri aldıysa ya da uygulama silindiyse adres artık geçersiz
    if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', sub.id)
    else console.error('push failed', status, (e as Error).message)
    return false
  }
}

/** "Bütün türleri dene": her bildirim türünden bir örnek, kullanıcının kendi abonelik ve kartlarıyla (yoksa örnek adlarla) */
async function samplesFor(userId: string) {
  const [{ data: subs }, { data: cards }] = await Promise.all([
    db.from('subscriptions').select('id, user_id, name, card_id, cycle, renewal_date').eq('user_id', userId).order('name'),
    db.from('cards').select('id, user_id, bank_name, last4, kind, statement_day').eq('user_id', userId).order('bank_name'),
  ])
  const today = nowInIstanbul().today
  const allCards = (cards ?? []) as CardRow[]
  const card = allCards.find((c) => c.kind === 'credit') ?? allCards[0] ?? { id: '', user_id: userId, bank_name: 'Garanti BBVA', last4: '4821', kind: 'credit', statement_day: 7 }
  const list = (subs ?? []) as SubRow[]
  const sub = list.find((s) => s.card_id) ?? list[0] ?? { id: '', user_id: userId, name: 'Netflix', card_id: card.id, cycle: 'monthly', renewal_date: toKey(today) }
  const subCard = allCards.find((c) => c.id === sub.card_id)
  const other = list.find((s) => s.id !== sub.id && !s.card_id) ?? { ...sub, name: list[1]?.name ?? 'Spotify', card_id: null }
  return [
    text.subDue(sub, subCard, today + 1, 1),
    text.subDue(other, undefined, today, 0),
    text.subLate(sub, subCard),
    text.statement(card, today + 10),
    text.cardDue(card, today + 3, 3),
    text.cardLate(card),
    text.summary(true, [...(list.length ? list.map((s) => s.name).slice(0, 4) : ['Netflix', 'Spotify', 'YouTube']), card.bank_name]),
  ]
}

async function runReminders() {
  const now = nowInIstanbul()
  const [{ data: pushRows }, { data: settings }, { data: subs }, { data: cards }, { data: payments }, { data: sentToday }] = await Promise.all([
    db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth'),
    db.from('user_settings').select('user_id, notify'),
    db.from('subscriptions').select('id, user_id, name, card_id, cycle, renewal_date'),
    db.from('cards').select('id, user_id, bank_name, last4, kind, statement_day'),
    db.from('payments').select('user_id, ref_id, due_date').gte('due_date', toKey(now.today - 60)),
    db.from('notification_log').select('user_id, key').eq('sent_on', toKey(now.today)),
  ])
  const phones = group(pushRows as PushRow[])
  const subsBy = group(subs as SubRow[])
  const cardsBy = group(cards as CardRow[])
  const notifyBy = new Map((settings ?? []).map((s) => [s.user_id as string, { ...DEFAULT_NOTIFY, ...(s.notify as Partial<Notify>) }]))
  const paidBy = new Map<string, Set<string>>()
  for (const p of payments ?? []) {
    const set = paidBy.get(p.user_id) ?? new Set<string>()
    set.add(`${p.ref_id}|${p.due_date}`)
    paidBy.set(p.user_id, set)
  }
  const sent = new Set((sentToday ?? []).map((r) => `${r.user_id}|${r.key}`))

  let total = 0
  for (const [userId, devices] of phones) {
    const notify = notifyBy.get(userId) ?? DEFAULT_NOTIFY
    if (!notify.enabled) continue
    const [h, m] = notify.time.split(':').map(Number)
    if (now.minutes < h * 60 + m) continue
    const messages = messagesFor(notify, subsBy.get(userId) ?? [], cardsBy.get(userId) ?? [], paidBy.get(userId) ?? new Set(), now)
      .filter((msg) => !sent.has(`${userId}|${msg.key}`))
    for (const msg of messages) {
      // Önce kaydet: iki çağrı üst üste gelirse aynı bildirim iki kez gitmesin
      const { error } = await db.from('notification_log').insert({ user_id: userId, key: msg.key, sent_on: toKey(now.today) })
      if (error) continue
      for (const device of devices) if (await push(device, { title: msg.title, body: msg.body, tag: msg.key, url: '/' })) total++
    }
  }
  return total
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}))

  // Uygulamadaki "Dene": giriş yapmış kullanıcının kendi telefonlarına
  if (body?.test) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data } = await db.auth.getUser(token)
    if (!data.user) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const { data: devices } = await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').eq('user_id', data.user.id)
    // Başlık bildirimin konusudur: iPhone altına her zaman "from Monthwise" ekliyor (başlık uygulama adı ya da boş olsa da;
    // 2026-10-07 telefonda denendi), uygulama adını başlıkta tekrarlamak iki kez yazdırır.
    const messages = body.test === 'all' ? await samplesFor(data.user.id) : [{ title: 'Deneme bildirimi', body: 'Hatırlatmalar bu telefona gelir.' }]
    let sent = 0
    for (const d of (devices ?? []) as PushRow[])
      for (const [i, msg] of messages.entries()) if (await push(d, { ...msg, tag: `test-${i}`, url: '/' })) sent++
    return Response.json({ sent })
  }

  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return Response.json({ error: 'unauthorized' }, { status: 401 })
  return Response.json({ sent: await runReminders() })
})
