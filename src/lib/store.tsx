import { format } from 'date-fns'
import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { bankColor } from './banks'
import { hasLogo, matchService, normalize } from './services'
import type { CreditCard, MissingLogo, Payment, Subscription } from './types'

// Şimdilik tüm veriler tarayıcının localStorage'ında (yani bu cihazda) duruyor.
// Supabase aşamasında bu dosyayı veritabanına bağlayacağız; ekranlar değişmeyecek.

const STORAGE_KEY = 'abonelik-takip:v1'

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
      return action.state
  }
}

/** Eski sürümde kaydedilmiş verileri yeni alanlarla tamamlar. */
function migrate(raw: Partial<State>): State {
  const cards = (raw.cards ?? []).map((c) => ({
    ...c,
    color: c.color ?? bankColor(c.bankName) ?? '#2B2A29',
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

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrate(JSON.parse(raw) as Partial<State>)
  } catch {
    // bozuk veya erişilemeyen kayıt: boş başla
  }
  return { cards: [], subscriptions: [], payments: [], missingLogos: [] }
}

const StoreContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // depolama doluysa veya kapalıysa yapacak bir şey yok
    }
  }, [state])

  return <StoreContext value={{ state, dispatch }}>{children}</StoreContext>
}

// eslint-disable-next-line react/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore, StoreProvider içinde kullanılmalı')
  return ctx
}

/** crypto.randomUUID sadece https/localhost'ta var; telefondan yerel ağ ile açınca yedek yöntem. */
// eslint-disable-next-line react/only-export-components
export function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
