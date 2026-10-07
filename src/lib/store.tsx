import { format, parseISO } from 'date-fns'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { bankColor } from './banks'
import { DbError, diffState, hasChanges, loadAll, pushChanges, type ListChanges } from './db'
import { DEMO_ID } from './demo'
import { findPayment, type PeriodKind } from './dates'
import { hasLogo, matchService, normalize } from './services'
import type { CreditCard, MissingLogo, Payment, Subscription } from './types'

// Veriler Supabase'de, kullanıcının hesabında duruyor. Ekran her değişikliği hemen gösterir,
// arkada da farkı veritabanına yazar. Son görülen veriler internetsiz açılış için cihazda saklanır.
// Gönderilemeyen değişiklikler de cihazda kalır; bağlantı gelince ya da bir sonraki açılışta yeniden denenir.

const cacheKey = (userId: string) => `abonelik-takip:cache:${userId}`
// Veritabanında onaylanmış son durum. Gönderilecek fark buna göre hesaplanır.
const baseKey = (userId: string) => `abonelik-takip:base:${userId}`
const EMPTY: State = { cards: [], subscriptions: [], payments: [], missingLogos: [] }

export interface State {
  cards: CreditCard[]
  subscriptions: Subscription[]
  payments: Payment[]
  /** Logosu olmayan servisler; Supabase bağlanınca oraya gönderilecek */
  missingLogos: MissingLogo[]
}

type Action =
  | { type: 'card/save'; card: CreditCard }
  | { type: 'card/delete'; id: string }
  | { type: 'subscription/save'; subscription: Subscription }
  | { type: 'subscription/delete'; id: string }
  /** paid verilirse yalnız o yöne değiştirir (true: işaretler, false: kaldırır); verilmezse aç-kapa yapar */
  | { type: 'payment/toggle'; kind: Payment['kind']; refId: string; dueDate: string; amount?: number; currency?: Payment['currency']; paid?: boolean }
  | { type: 'payment/remove'; id: string }
  /** Geri al: ids'teki silinmiş kayıtları before'dan geri koyar, aradaki diğer değişikliklere dokunmaz */
  | { type: 'undo/restore'; before: State; ids: string[] }
  | { type: 'state/restore'; state: State }
  | { type: 'state/load'; state: State }

function upsert<T extends { id: string }>(list: T[], item: T) {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item]
}

function noteMissingLogo(list: MissingLogo[], sub: Subscription): MissingLogo[] {
  if (hasLogo(sub.serviceKey)) return list
  const name = sub.name.trim()
  const n = normalize(name)
  if (list.some((m) => normalize(m.name) === n)) return list
  return [...list, { name, firstSeen: format(new Date(), 'yyyy-MM-dd') }]
}

/** Geri al: ids'teki silinmiş kayıtları yedekten geri koyar. Listede zaten olanlara ve aradaki diğer değişikliklere dokunmaz. */
function restoreDeleted(state: State, before: State, ids: string[]): State {
  const want = new Set(ids)
  // Yedekte olup şu an listede olmayanlar
  const missing = <T extends { id: string }>(now: T[], old: T[]) => {
    const have = new Set(now.map((x) => x.id))
    return old.filter((x) => want.has(x.id) && !have.has(x.id))
  }
  const cardsBack = missing(state.cards, before.cards)
  const cards = [...state.cards, ...cardsBack]
  const cardIds = new Set(cards.map((c) => c.id))
  const backIds = new Set(cardsBack.map((c) => c.id))
  // Kart geri geldiyse, silinince kartsız kalan abonelikler yeniden o karta bağlanır
  const relink = (s: Subscription) => {
    if (s.cardId) return s
    const was = before.subscriptions.find((x) => x.id === s.id)?.cardId
    return was && backIds.has(was) ? { ...s, cardId: was } : s
  }
  // Silinen abonelik geri gelirken kartı artık yoksa kartsız gelir (veritabanında olmayan karta bağlanamaz)
  const subsBack = missing(state.subscriptions, before.subscriptions).map((s) =>
    s.cardId && !cardIds.has(s.cardId) ? { ...s, cardId: null } : s,
  )
  // Aynı ödeme (aynı kayıt ve tarih) zaten işaretliyse ikinci kez eklenmez; veritabanında tekil
  const paymentsBack = missing(state.payments, before.payments).filter(
    (p) => !state.payments.some((q) => q.refId === p.refId && q.dueDate === p.dueDate),
  )
  return {
    ...state,
    cards,
    subscriptions: [...state.subscriptions.map(relink), ...subsBack],
    payments: [...state.payments, ...paymentsBack],
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'card/save':
      return { ...state, cards: upsert(state.cards, action.card) }
    case 'card/delete':
      return {
        ...state,
        cards: state.cards.filter((c) => c.id !== action.id),
        // Silinen karta bağlı abonelikler silinmez, sadece kartsız kalır
        subscriptions: state.subscriptions.map((s) =>
          s.cardId === action.id ? { ...s, cardId: null } : s,
        ),
        // Ödeme geçmişi kalır: Geçmiş ekranındaki toplamlar değişmez
      }
    case 'subscription/save':
      return {
        ...state,
        subscriptions: upsert(state.subscriptions, action.subscription),
        missingLogos: noteMissingLogo(state.missingLogos, action.subscription),
      }
    case 'subscription/delete':
      // Ödeme geçmişi kalır: Geçmiş ekranındaki toplamlar değişmez
      return {
        ...state,
        subscriptions: state.subscriptions.filter((s) => s.id !== action.id),
      }
    case 'payment/toggle': {
      // Dönem bazında aranır (lib/dates.ts): kesim ya da yenilenme günü değişmiş olsa da o dönemin ödemesi bulunur
      const kind: PeriodKind = action.kind === 'card' ? 'card' : (state.subscriptions.find((s) => s.id === action.refId)?.cycle ?? 'monthly')
      const existing = findPayment(state.payments, action.refId, parseISO(action.dueDate), kind)
      if (existing) {
        if (action.paid === true) return state
        return { ...state, payments: state.payments.filter((p) => p.id !== existing.id) }
      }
      if (action.paid === false) return state
      const payment: Payment = {
        id: newId(),
        kind: action.kind,
        refId: action.refId,
        dueDate: action.dueDate,
        paidAt: format(new Date(), 'yyyy-MM-dd'),
        amount: action.amount,
        currency: action.currency,
      }
      return { ...state, payments: [...state.payments, payment] }
    }
    case 'payment/remove':
      if (!state.payments.some((p) => p.id === action.id)) return state
      return { ...state, payments: state.payments.filter((p) => p.id !== action.id) }
    case 'undo/restore':
      return restoreDeleted(state, action.before, action.ids)
    case 'state/restore':
    case 'state/load':
      return action.state
  }
}

/** Eski sürümde kaydedilmiş verileri yeni alanlarla tamamlar. */
function migrate(raw: Partial<State>): State {
  const cards = (raw.cards ?? []).map((c) => ({
    ...c,
    color: c.color ?? bankColor(c.bankName) ?? '#2B2A29',
    kind: c.kind ?? 'credit',
    network: c.network ?? null,
  }))
  const subscriptions = (raw.subscriptions ?? []).map((s) => ({
    ...s,
    // Veritabanında servisi olmayan satır null gelir (undefined değil); bu yüzden ?? ile adından yeniden eşleşir
    serviceKey: s.serviceKey ?? matchService(s.name)?.key ?? null,
  }))
  // Logosu sonradan eklenmiş servislerin notunu kendiliğinden kapat
  const missingLogos = (raw.missingLogos ?? []).filter((m) => !hasLogo(matchService(m.name)?.key ?? null))
  return { cards, subscriptions, payments: raw.payments ?? [], missingLogos }
}

function readCache(userId: string): State | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    return raw ? migrate(JSON.parse(raw) as Partial<State>) : null
  } catch {
    return null
  }
}

function asList<T>(v: T[] | undefined): T[] {
  return Array.isArray(v) ? v : []
}

/** Veritabanında onaylanmış son durum. Eski sürümde hiç kaydedilmediyse null. */
function readBase(userId: string): State | null {
  try {
    const raw = localStorage.getItem(baseKey(userId))
    if (!raw) return null
    const saved = JSON.parse(raw) as Partial<State>
    return {
      cards: asList(saved.cards),
      subscriptions: asList(saved.subscriptions),
      payments: asList(saved.payments),
      missingLogos: asList(saved.missingLogos),
    }
  } catch {
    return null
  }
}

/** Cihazdaki kopya yazıldı mı? Yazılamadıysa onaylanmış durum da yazılmaz (bkz. persist). */
function writeCache(userId: string, state: State): boolean {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(state))
    return true
  } catch {
    // depolama doluysa ya da kapalıysa yapacak bir şey yok
    return false
  }
}

function writeBase(userId: string, state: State) {
  try {
    localStorage.setItem(baseKey(userId), JSON.stringify(state))
  } catch {
    // yazılamazsa eski onaylanmış durum kalır; fark fazla gider ama kayıp olmaz
  }
}

/** Önce ekranın son hali, sonra onaylanmış durum yazılır. Arada kesilirse onaylanmamış bir silme gönderilmez. */
function persist(userId: string, current: State, confirmed: State) {
  if (writeCache(userId, current)) writeBase(userId, confirmed)
}

// eslint-disable-next-line react/only-export-components
export function clearCache(userId: string) {
  try {
    localStorage.removeItem(cacheKey(userId))
    localStorage.removeItem(baseKey(userId))
  } catch {
    // erişilemiyorsa yapacak bir şey yok
  }
}

/** Farkı bir listeye uygular: silinenler çıkar, değişenler yerine geçer, yeniler sona eklenir. */
function applyDiff<T>(items: T[], changes: ListChanges<T>, key: (x: T) => string): T[] {
  const gone = new Set(changes.deletes)
  const changed = new Map<string, T>(changes.upserts.map((x) => [key(x), x] as const))
  const kept = items.filter((x) => !gone.has(key(x))).map((x) => changed.get(key(x)) ?? x)
  const seen = new Set(kept.map(key))
  return [...kept, ...changes.upserts.filter((x) => !seen.has(key(x)))]
}

/** Yerel değişiklikler (from → to farkı) veritabanından gelen yeni kopyanın üstüne uygulanır. */
function rebase(fresh: State, from: State, to: State): State {
  const changes = diffState(from, to)
  const cards = applyDiff(fresh.cards, changes.cards, (c) => c.id)
  // Kartı silinmiş aboneliğin kartı yoktur (veritabanındaki ON DELETE SET NULL ile aynı)
  const cardIds = new Set(cards.map((c) => c.id))
  return {
    cards,
    subscriptions: applyDiff(fresh.subscriptions, changes.subscriptions, (s) => s.id).map((s) =>
      s.cardId && !cardIds.has(s.cardId) ? { ...s, cardId: null } : s,
    ),
    payments: applyDiff(fresh.payments, changes.payments, (p) => p.id),
    missingLogos: applyDiff(fresh.missingLogos, changes.missingLogos, (m) => m.name),
  }
}

/** Ekran durumu ile veritabanı arasındaki eşitleme. Bileşenden bağımsız: değişiklikleri sırayla gönderir,
 *  bağlantı yoksa cihazda bekletir ve yeniden dener. */
function createSync(opts: {
  userId: string | null
  remote: boolean
  state: State
  base: State
  show: (state: State) => void
  ready: () => void
}) {
  const { userId, remote } = opts
  // En son durum: ekrana çizilmesini beklemez, arka plandaki okuma hep son değişiklikleri görür
  let latest = opts.state
  // Veritabanında olduğu bilinen son durum
  let base = opts.base
  // İlk okuma bitmeden hiçbir şey gönderilmez: veritabanı bilinmeden yazmak başkasının değişikliğinin üstüne yazabilir
  let loaded = false
  // Sunucunun reddettiği yazmanın durumu. Doluyken önce okuma yapılır; gönderim, reddedilen yazma ekrandan çıkana kadar durur
  let rejectedFrom: State | null = null
  // Ağ hatası mesajı zaten gösterildi mi; bağlantı gelip bir işlem tutunca sıfırlanır
  let alerted = false
  let stopped = false
  // Sırada bekleyen bir iş varsa yenisi eklenmez; iş başlayınca en son durum okunur
  let queued = false
  // Veritabanı işleri sırayla çalışır: okuma ve yazma birbirini ezmez
  let chain: Promise<void> = Promise.resolve()

  function show(next: State) {
    latest = next
    opts.show(next)
  }

  /** Ağ hatası: aynı sorun için mesaj bir kez gösterilir */
  function failed(message: string) {
    if (!alerted) toast.error(message)
    alerted = true
  }

  /** Veritabanı işini sıraya koyar */
  function schedule() {
    if (!remote || stopped || queued) return
    queued = true
    chain = chain
      .then(() => {
        queued = false
        return work()
      })
      .catch(() => {})
  }

  /** Gerekirse veritabanını oku, sonra bekleyen farkı gönder */
  async function work() {
    if (stopped) return
    if ((!loaded || rejectedFrom) && !(await reconcile())) return
    if (hasChanges(diffState(base, latest))) await push()
  }

  /** Veritabanını okur. Gönderilmemiş değişiklikler yeni veriye uygulanır; ekrandan kaybolmazlar.
   *  Sunucunun reddettiği yazma (rejectedFrom) bu farkın dışında kalır: onu sunucu zaten kabul etmedi. */
  async function reconcile(): Promise<boolean> {
    if (!userId || stopped) return false
    let data: State
    try {
      data = await loadAll()
    } catch {
      failed('Veriler yüklenemedi. İnternet bağlantısını kontrol edin.')
      opts.ready()
      return false
    }
    if (stopped) return false
    const fresh = migrate(data)
    const next = rebase(fresh, rejectedFrom ?? base, latest)
    // Logosu artık olan notlar migrate'te düşer; veritabanındaki hali ham listeden okunur
    base = { ...fresh, missingLogos: data.missingLogos }
    rejectedFrom = null
    loaded = true
    alerted = false
    show(next)
    persist(userId, latest, base)
    opts.ready()
    return true
  }

  /** Bekleyen farkı veritabanına yazar. Başarılıysa onaylanmış durum ilerler. */
  async function push() {
    if (!userId || stopped) return
    const target = latest
    try {
      await pushChanges(base, target)
    } catch (e) {
      if (e instanceof DbError && e.rejected) {
        // Sunucu değişikliği kabul etmedi: o yazma ekrandan çıkar, bu sırada yapılan yeni değişiklikler kalır
        toast.error('Değişiklik kaydedilemedi. İnternet bağlantısını kontrol edin.')
        rejectedFrom = target
        await reconcile()
      } else {
        // Bağlantı sorunu: değişiklik ekranda ve cihazda kalır, bağlantı gelince yeniden denenir
        failed('Değişiklik kaydedilemedi. İnternet bağlantısını kontrol edin.')
      }
      return
    }
    if (stopped) return
    alerted = false
    base = target
    persist(userId, latest, base)
  }

  return {
    /** Ekrandan gelen değişiklik: durum hemen hesaplanır ve cihaza yazılır, sonra gönderilmek üzere sıraya girer */
    dispatch(action: Action) {
      show(reducer(latest, action))
      if (userId) writeCache(userId, latest)
      schedule()
    },
    /** Ekran açılınca çalışır: ilk okuma ve bekleyen değişiklikler. Bağlantı gelince ya da uygulama öne gelince yeniden denenir. */
    start() {
      stopped = false
      schedule()
      const retry = () => {
        if (navigator.onLine !== false) schedule()
      }
      const onVisible = () => {
        if (document.visibilityState === 'visible') retry()
      }
      window.addEventListener('online', retry)
      document.addEventListener('visibilitychange', onVisible)
      return () => {
        stopped = true
        window.removeEventListener('online', retry)
        document.removeEventListener('visibilitychange', onVisible)
      }
    },
  }
}

const StoreContext = createContext<{ state: State; dispatch: React.Dispatch<Action>; ready: boolean } | null>(null)

/** userId null ise (giriş yok) veriler boş kalır ve hiçbir yere yazılmaz.
 *  Test hesabında veriler sadece cihazda tutulur, Supabase'e gitmez. */
export function StoreProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const remote = !!userId && userId !== DEMO_ID
  // Açılışta önce cihazdaki kopya çizilir (internetsiz açılış). Önceki oturumdan gönderilmemiş değişiklikler de oradadır.
  const [boot] = useState(() => {
    const cache = userId ? readCache(userId) : null
    const base = userId ? readBase(userId) : null
    return {
      state: cache ?? (base ? migrate(base) : EMPTY),
      // Onaylanmış durum eski sürümde kaydedilmediyse kopya onaylanmış sayılır
      base: base ?? cache ?? EMPTY,
      restored: !!(cache ?? base),
    }
  })
  const [state, setState] = useState<State>(boot.state)
  const [ready, setReady] = useState(!remote || boot.restored)
  const [sync] = useState(() =>
    createSync({ userId, remote, state: boot.state, base: boot.base, show: setState, ready: () => setReady(true) }),
  )

  useEffect(() => sync.start(), [sync])

  return <StoreContext value={{ state, dispatch: sync.dispatch, ready }}>{children}</StoreContext>
}

// eslint-disable-next-line react/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore, StoreProvider içinde kullanılmalı')
  return ctx
}

/** crypto.randomUUID sadece https/localhost'ta var; telefondan yerel ağ ile açınca aynı biçimde (UUID v4) üret. */
// eslint-disable-next-line react/only-export-components
export function newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
