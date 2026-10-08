// Monthwise hatırlatmaları (tutarsız; başlık ve metin tek satıra sığacak kadar kısa, ~38 harf): her 15 dakikada (pg_cron) çağrılır, saati gelmiş kullanıcılara yaklaşan ödemeleri Web Push ile gönderir.
// Aynı hatırlatma notification_log sayesinde günde bir kez gider.
// Tarih kuralları uygulamadakiyle aynı (src/lib/dates.ts): yenilenmeler hep ilk tarihten sayılır, kart son ödemesi = kesim + 10 gün.
//
// Gizli değerler (Supabase → Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET.
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase tarafından kendiliğinden verilir. "Verify JWT" kapalı olmalı (çağıranı kendimiz denetliyoruz).

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const TZ = 'Europe/Istanbul'
const APP_URL = 'https://monthwise-tr.vercel.app'
/** Cron her 15 dakikada çalışır; günün son turu 23:45. Daha geç seçilen saat 23:45'te gönderilir. */
const LAST_RUN_MINUTES = 23 * 60 + 45

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

/** Aboneliğin [start, end] aralığındaki yenilenmeleri. İlk yenilenme tarihinden (anchor) önce hiçbiri üretilmez. */
function renewalsBetween(sub: SubRow, start: Day, end: Day): Day[] {
  const anchor = fromKey(sub.renewal_date)
  const step = sub.cycle === 'monthly' ? 1 : 12
  const a = parts(anchor)
  const s = parts(start)
  // Hep ilk tarihten sayılır. Anchor ileride ise n 0'da kalır, öncesi üretilmez.
  let n = Math.max(0, Math.floor(((s.y - a.y) * 12 + (s.m - a.m)) / step) - 1)
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

/** Ödemenin dönemi (src/lib/dates.ts → periodKey ile aynı): kartta kesimin ayı, aylık abonelikte ayı, yıllıkta yılı */
type PeriodKind = 'card' | 'monthly' | 'yearly'
function periodKey(kind: PeriodKind, day: Day) {
  if (kind === 'card') return toKey(day - 10).slice(0, 7)
  return toKey(day).slice(0, kind === 'yearly' ? 4 : 7)
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
/** En çok `max` karakter (kod noktası); uzunsa sonu "…" ile kesilir */
const clip = (s: string, max: number) => ([...s].length > max ? [...s].slice(0, max - 1).join('') + '…' : s)

// ---------- Veri ----------

type SubRow = { id: string; user_id: string; name: string; card_id: string | null; cycle: 'monthly' | 'yearly'; renewal_date: string }
type CardRow = { id: string; user_id: string; bank_name: string; last4: string; kind: 'credit' | 'debit'; statement_day: number | null }
/** Bir ödeme: vade günü ve abonelikte türü (eski kayıtlarda yok) */
type PaidRow = { day: Day; cycle: 'monthly' | 'yearly' | null }
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

/** Kayıtlı bildirim ayarları. Tipi bozuk ya da eksik alan varsayılana düşer (ör. saat "25:00" ise 09:00). */
function notifyFrom(raw: unknown): Notify {
  const r: Record<string, unknown> = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const d = DEFAULT_NOTIFY
  const days = (v: unknown, fallback: number[]) => (Array.isArray(v) && v.every((x) => Number.isInteger(x)) ? (v as number[]) : fallback)
  const perSubscription: Record<string, 'off' | number> = {}
  const per = r.perSubscription
  if (typeof per === 'object' && per !== null && !Array.isArray(per))
    for (const [id, v] of Object.entries(per)) if (v === 'off' || Number.isInteger(v)) perSubscription[id] = v as 'off' | number
  const time = r.time
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : d.enabled,
    subscriptionDays: days(r.subscriptionDays, d.subscriptionDays),
    cardDays: days(r.cardDays, d.cardDays),
    statement: typeof r.statement === 'boolean' ? r.statement : d.statement,
    time: typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : d.time,
    overdue: typeof r.overdue === 'boolean' ? r.overdue : d.overdue,
    summary: r.summary === 'off' || r.summary === 'weekly' || r.summary === 'monthly' ? r.summary : d.summary,
    perSubscription,
  }
}

function group<T extends { user_id: string }>(rows: T[] | null) {
  const map = new Map<string, T[]>()
  for (const r of rows ?? []) map.set(r.user_id, [...(map.get(r.user_id) ?? []), r])
  return map
}

/** Sorgunun satırları. Hata varsa istisna: o zaman hiçbir hatırlatma gönderilmez (istek 500 döner). */
type ReadResult = { data: unknown[] | null; error: { message: string } | null }

/** Supabase bir istekte en çok 1000 satır döndürür; tablo eksik okunmasın diye sayfa sayfa çekilir */
const PAGE = 1000
async function readAll(page: (from: number, to: number) => PromiseLike<ReadResult>): Promise<ReadResult> {
  const data: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const res = await page(from, from + PAGE - 1)
    if (res.error) return res
    const rows = res.data ?? []
    data.push(...rows)
    if (rows.length < PAGE) return { data, error: null }
  }
}

function rowsOf<T>(res: ReadResult, table: string) {
  if (res.error) throw new Error(`${table} read failed: ${res.error.message}`)
  return (res.data ?? []) as T[]
}

// ---------- Bildirim metinleri ----------
// Tutar yok. Başlık ne olduğunu, metin ne zaman ve hangi karttan olduğunu söyler; ikisi de tek satıra sığar.

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
function messagesFor(notify: Notify, subs: SubRow[], cards: CardRow[], paid: Map<string, PaidRow[]>, now: ReturnType<typeof nowInIstanbul>): Message[] {
  const { today } = now
  // Ödendi: aynı kayıt için aynı dönemde bir ödeme var mı (kesim ya da yenilenme tarihi sonradan değişse de geçerli).
  // Abonelikte ödemenin türü de tutmalı; türü boş (eski) ödeme her türle eşleşir (bkz. src/lib/dates.ts findPayment)
  const isPaid = (ref: string, day: Day, kind: PeriodKind) =>
    (paid.get(ref) ?? []).some((p) => (kind === 'card' || !p.cycle || p.cycle === kind) && periodKey(kind, p.day) === periodKey(kind, day))
  const out: Message[] = []

  const cardOf = new Map(cards.map((c) => [c.id, c]))
  for (const sub of subs) {
    const own = notify.perSubscription[sub.id]
    const days = own === 'off' ? [] : own !== undefined ? [own] : notify.subscriptionDays
    const card = sub.card_id ? cardOf.get(sub.card_id) : undefined
    for (const date of renewalsBetween(sub, today - 1, today + 7)) {
      const diff = date - today
      if (isPaid(sub.id, date, sub.cycle)) continue
      if (diff >= 0 && days.includes(diff)) out.push({ key: `sub:${sub.id}:${toKey(date)}:${diff}`, ...text.subDue(sub, card, date, diff) })
      if (diff === -1 && notify.overdue && own !== 'off') out.push({ key: `sub-late:${sub.id}:${toKey(date)}`, ...text.subLate(sub, card) })
    }
  }

  for (const card of cards) {
    if (card.kind !== 'credit' || card.statement_day == null) continue
    for (const { statement, due } of cardCyclesBetween(card, today - 1, today + 40)) {
      const diff = due - today
      if (notify.statement && statement === today) out.push({ key: `stmt:${card.id}:${toKey(statement)}`, ...text.statement(card, due) })
      if (isPaid(card.id, due, 'card')) continue
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
      for (const date of renewalsBetween(sub, today, end)) if (!isPaid(sub.id, date, sub.cycle)) due.push({ day: date, name: sub.name })
    for (const card of cards)
      if (card.kind === 'credit' && card.statement_day != null)
        for (const c of cardCyclesBetween(card, today, end)) if (!isPaid(card.id, c.due, 'card')) due.push({ day: c.due, name: card.bank_name })
    if (due.length > 0)
      out.push({ key: `summary:${weekly ? 'w' : 'm'}`, ...text.summary(weekly, due.sort((a, b) => a.day - b.day).map((d) => d.name)) })
  }
  return out
}

/** TTL: 12 saat içinde ulaşmayan hatırlatma düşer (ertesi gün eski bildirim gelmesin). timeout: takılan adres turu durdurmasın. */
const PUSH_OPTIONS = { TTL: 43200, timeout: 10000 }

/** Tek telefona gönderimin sonucu: ulaştı, adres artık geçersiz (kaldırıldı), atlandı (bilinmeyen sunucu) ya da geçici hata */
type PushResult = 'ok' | 'gone' | 'skipped' | 'error'

/** Adres yalnızca bilinen Web Push sunucularına (Chrome/Android, Safari/iPhone, Firefox, Edge/Windows) ve https ile kabul edilir */
function isKnownPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint)
    const host = url.hostname
    const known =
      host === 'fcm.googleapis.com' ||
      host === 'push.services.mozilla.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host.endsWith('.push.apple.com') ||
      host.endsWith('.notify.windows.com')
    return url.protocol === 'https:' && url.port === '' && known
  } catch {
    return false
  }
}

/** Log için sunucu adı. Adresin tamamı loglanmaz (gizli kısmı içerir). */
const hostOf = (endpoint: string) => {
  try {
    return new URL(endpoint).host
  } catch {
    return 'invalid url'
  }
}

async function push(sub: PushRow, payload: Record<string, unknown>): Promise<PushResult> {
  // Adres kullanıcı verisinden geliyor: tanınmayan sunucuya istek atılmaz
  if (!isKnownPushEndpoint(sub.endpoint)) {
    console.warn('push skipped, unknown endpoint host:', sub.id, hostOf(sub.endpoint))
    return 'skipped'
  }
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), PUSH_OPTIONS)
    return 'ok'
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    // Telefon izni geri aldıysa ya da uygulama silindiyse adres artık geçersiz
    if (status === 404 || status === 410) {
      const { error } = await db.from('push_subscriptions').delete().eq('id', sub.id)
      if (error) console.error('push_subscriptions delete failed', sub.id, error.message)
      return 'gone'
    }
    console.error('push failed', status, (e as Error).message)
    return 'error'
  }
}

/** Bir hatırlatmayı kullanıcının bütün telefonlarına gönderir. Dönen: ulaşan telefon sayısı. */
async function deliver(userId: string, devices: PushRow[], msg: Message, today: Day) {
  const claim = { user_id: userId, key: msg.key, sent_on: toKey(today) }
  // Önce kaydet: iki çağrı üst üste gelirse aynı bildirim iki kez gitmesin (primary key ikinciyi reddeder)
  const { error } = await db.from('notification_log').insert(claim)
  if (error) {
    if (error.code !== '23505') console.error('notification_log insert failed', userId, msg.key, error.message)
    return 0
  }
  const results: PushResult[] = []
  // Son sınır: başlık ve metin hiçbir koşulda çok uzun olmasın (Web Push yük sınırı)
  const payload = { title: clip(msg.title, 100), body: clip(msg.body, 200), tag: msg.key, url: '/' }
  for (const device of devices) results.push(await push(device, payload))
  const accepted = results.filter((r) => r === 'ok').length
  // Hiçbir telefona ulaşmadı ve geçici bir hata vardı: kaydı sil ki bir sonraki turda yeniden denensin.
  // Kaldırılmış (404/410) ya da atlanan adresler için yeniden denemek anlamsız; kayıt kalır.
  if (accepted === 0 && results.includes('error')) {
    const { error: releaseError } = await db.from('notification_log').delete().eq('user_id', userId).eq('key', msg.key).eq('sent_on', claim.sent_on)
    if (releaseError) console.error('notification_log release failed', userId, msg.key, releaseError.message)
  }
  return accepted
}

async function runReminders() {
  const now = nowInIstanbul()
  const [pushRes, settingsRes, subsRes, cardsRes, paymentsRes, sentRes] = await Promise.all([
    readAll((a, b) => db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').order('id').range(a, b)),
    readAll((a, b) => db.from('user_settings').select('user_id, notify').order('user_id').range(a, b)),
    readAll((a, b) => db.from('subscriptions').select('id, user_id, name, card_id, cycle, renewal_date').order('id').range(a, b)),
    readAll((a, b) => db.from('cards').select('id, user_id, bank_name, last4, kind, statement_day').order('id').range(a, b)),
    // Dönem eşleşmesi için geriye dönük: yıllık bir ödeme aydan eski olabilir, bu yüzden bir önceki yılın başından çekilir
    readAll((a, b) =>
      db.from('payments').select('user_id, ref_id, due_date, cycle').gte('due_date', toKey(dayOf(parts(now.today).y - 1, 1, 1))).order('id').range(a, b),
    ),
    readAll((a, b) => db.from('notification_log').select('user_id, key').eq('sent_on', toKey(now.today)).order('user_id').order('key').range(a, b)),
  ])
  // Bir okuma bile başarısızsa hiçbir şey gönderilmez: yoksa bildirimi kapalı kullanıcılara ya da ödenmiş faturalara hatırlatma gider
  const pushRows = rowsOf<PushRow>(pushRes, 'push_subscriptions')
  const settingsRows = rowsOf<{ user_id: string; notify: unknown }>(settingsRes, 'user_settings')
  // Ad ve banka adı kullanıcıdan geliyor: bildirim kısa kalsın diye 60 karakterle sınırlanır
  const subRows = rowsOf<SubRow>(subsRes, 'subscriptions').map((s) => ({ ...s, name: clip(s.name ?? '', 60) }))
  const cardRows = rowsOf<CardRow>(cardsRes, 'cards').map((c) => ({ ...c, bank_name: clip(c.bank_name ?? '', 60) }))
  const payRows = rowsOf<{ user_id: string; ref_id: string; due_date: string; cycle: PaidRow['cycle'] }>(paymentsRes, 'payments')
  const sentRows = rowsOf<{ user_id: string; key: string }>(sentRes, 'notification_log')

  const phones = group(pushRows)
  const subsBy = group(subRows)
  const cardsBy = group(cardRows)
  // Ayar satırı yoksa kullanıcı için varsayılanlar geçerli (okuma başarılı olduğu için bu güvenli)
  const notifyBy = new Map(settingsRows.map((s): [string, Notify] => [s.user_id, notifyFrom(s.notify)]))
  // Kullanıcı → kayıt → ödemelerin vade tarihi ve türü (dönem eşleşmesi messagesFor içinde)
  const paidBy = new Map<string, Map<string, PaidRow[]>>()
  for (const p of payRows) {
    const byRef = paidBy.get(p.user_id) ?? new Map<string, PaidRow[]>()
    byRef.set(p.ref_id, [...(byRef.get(p.ref_id) ?? []), { day: fromKey(p.due_date), cycle: p.cycle }])
    paidBy.set(p.user_id, byRef)
  }
  const sent = new Set(sentRows.map((r) => `${r.user_id}|${r.key}`))

  let total = 0
  for (const [userId, devices] of phones) {
    // Bir kullanıcının hatası (ör. bozuk bir kayıt) öteki kullanıcıların hatırlatmasını durdurmasın
    try {
      const notify = notifyBy.get(userId) ?? DEFAULT_NOTIFY
      if (!notify.enabled) continue
      const [h, m] = notify.time.split(':').map(Number)
      if (now.minutes < Math.min(h * 60 + m, LAST_RUN_MINUTES)) continue
      const messages = messagesFor(notify, subsBy.get(userId) ?? [], cardsBy.get(userId) ?? [], paidBy.get(userId) ?? new Map<string, PaidRow[]>(), now)
        .filter((msg) => !sent.has(`${userId}|${msg.key}`))
      for (const msg of messages) total += await deliver(userId, devices, msg, now.today)
    } catch (e) {
      console.error('reminders failed for user', userId, (e as Error).message)
    }
  }
  return total
}

/** Cron isteği: CRON_SECRET tanımlı ve boş olmayan olmalı, başlık birebir tutmalı */
function authorized(req: Request) {
  const secret = Deno.env.get('CRON_SECRET') ?? ''
  if (!secret) {
    console.error('CRON_SECRET is not set: every request is rejected')
    return false
  }
  return safeEqual(req.headers.get('x-cron-secret') ?? '', secret)
}

/** Sabit sürede karşılaştırma: yanlış olsa bile bütün baytlar okunur, süre gizli değer hakkında bilgi vermez */
function safeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

Deno.serve(async (req) => {
  if (!authorized(req)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  try {
    return Response.json({ sent: await runReminders() })
  } catch (e) {
    // Okuma başarısızsa hiçbir şey gönderilmedi; cron bir sonraki turda yeniden dener
    console.error('reminders aborted:', (e as Error).message)
    return Response.json({ error: 'aborted' }, { status: 500 })
  }
})
