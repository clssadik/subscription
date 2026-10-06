import { format } from 'date-fns'
import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { bankColor } from './banks'
import { loadAll, pushChanges } from './db'
import { DEMO_ID } from './demo'
import { hasLogo, matchService, normalize } from './services'
import type { CreditCard, MissingLogo, Payment, Subscription } from './types'

// Veriler Supabase'de, kullanıcının hesabında duruyor. Ekran her değişikliği hemen gösterir,
// arkada da farkı veritabanına yazar. Son görülen veriler internetsiz açılış için cihazda saklanır.

const cacheKey = (userId: string) => `abonelik-takip:cache:${userId}`
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
  | { type: 'payment/toggle'; kind: Payment['kind']; refId: string; dueDate: string; amount?: number; currency?: Payment['currency'] }
  | { type: 'state/restore'; state: State }
  | { type: 'state/load'; state: State }

function upsert<T extends { id: string }>(list: T[], item: T) {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item]
}

function noteMissingLogo(list: MissingLogo[], sub: Subscription): MissingLogo[] {
  if (hasLogo(sub.serviceKey)) return list
  const n = normalize(sub.name)
  if (list.some((m) => normalize(m.name) === n)) return list
  return [...list, { name: sub.name, firstSeen: format(new Date(), 'yyyy-MM-dd') }]
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
        payments: state.payments.filter((p) => p.refId !== action.id),
      }
    case 'subscription/save':
      return {
        ...state,
        subscriptions: upsert(state.subscriptions, action.subscription),
        missingLogos: noteMissingLogo(state.missingLogos, action.subscription),
      }
    case 'subscription/delete':
      return {
        ...state,
        subscriptions: state.subscriptions.filter((s) => s.id !== action.id),
        payments: state.payments.filter((p) => p.refId !== action.id),
      }
    case 'payment/toggle': {
      const existing = state.payments.find((p) => p.refId === action.refId && p.dueDate === action.dueDate)
      if (existing) return { ...state, payments: state.payments.filter((p) => p !== existing) }
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
    serviceKey: s.serviceKey !== undefined ? s.serviceKey : (matchService(s.name)?.key ?? null),
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

// eslint-disable-next-line react/only-export-components
export function clearCache(userId: string) {
  try {
    localStorage.removeItem(cacheKey(userId))
  } catch {
    // erişilemiyorsa yapacak bir şey yok
  }
}

const StoreContext = createContext<{ state: State; dispatch: React.Dispatch<Action>; ready: boolean; refresh: () => Promise<void> } | null>(null)

/** userId null ise (giriş yok) veriler boş kalır ve hiçbir yere yazılmaz.
 *  Test hesabında veriler sadece cihazda tutulur, Supabase'e gitmez. */
export function StoreProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const remote = !!userId && userId !== DEMO_ID
  const [cached] = useState(() => (userId ? readCache(userId) : null))
  const [state, dispatch] = useReducer(reducer, cached ?? EMPTY)
  const [ready, setReady] = useState(!remote || !!cached)
  // Veritabanında olduğunu bildiğimiz son durum; yeni durumla farkı gönderilir
  const server = useRef<State>(cached ?? EMPTY)
  // Yazmalar sırayla gitsin diye zincir (hızlı iki dokunuş birbirini ezmesin)
  const queue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    if (!remote) return
    let cancelled = false
    loadAll()
      .then((data) => {
        if (cancelled) return
        const fresh = migrate(data)
        // Logosu artık olan notlar migrate'te düşer; bu fark veritabanına silme olarak gider
        server.current = { ...fresh, missingLogos: data.missingLogos }
        dispatch({ type: 'state/load', state: fresh })
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setReady(true)
        toast.error('Veriler yüklenemedi. İnternet bağlantısını kontrol edin.')
      })
    return () => {
      cancelled = true
    }
  }, [remote])

  useEffect(() => {
    if (!userId) return
    try {
      localStorage.setItem(cacheKey(userId), JSON.stringify(state))
    } catch {
      // depolama doluysa veya kapalıysa yapacak bir şey yok
    }
    if (!remote || state === server.current) return
    const before = server.current
    server.current = state
    queue.current = queue.current.then(() =>
      pushChanges(before, state).catch(() => {
        toast.error('Değişiklik kaydedilemedi. İnternet bağlantısını kontrol edin.')
        // Ekranı veritabanındaki gerçek durumla eşitle
        return loadAll().then((data) => {
          const fresh = migrate(data)
          server.current = fresh
          dispatch({ type: 'state/load', state: fresh })
        }).catch(() => {})
      }),
    )
  }, [state, userId, remote])

  /** Aşağı çekip yenileme: girişliyse veritabanından yeniden yükler; yerelde sadece ekranı tazeler (ör. gün değiştiyse) */
  async function refresh() {
    if (!remote) {
      dispatch({ type: 'state/load', state: { ...state } })
      return
    }
    try {
      const data = await loadAll()
      const fresh = migrate(data)
      server.current = { ...fresh, missingLogos: data.missingLogos }
      dispatch({ type: 'state/load', state: fresh })
    } catch {
      toast.error('Veriler yenilenemedi. İnternet bağlantısını kontrol edin.')
    }
  }

  return <StoreContext value={{ state, dispatch, ready, refresh }}>{children}</StoreContext>
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
