import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type { CreditCard, Subscription } from './types'

// Şimdilik tüm veriler tarayıcının localStorage'ında (yani bu cihazda) duruyor.
// Supabase aşamasında bu dosyayı veritabanına bağlayacağız; ekranlar değişmeyecek.

const STORAGE_KEY = 'abonelik-takip:v1'

interface State {
  cards: CreditCard[]
  subscriptions: Subscription[]
}

type Action =
  | { type: 'card/save'; card: CreditCard }
  | { type: 'card/delete'; id: string }
  | { type: 'subscription/save'; subscription: Subscription }
  | { type: 'subscription/delete'; id: string }

function upsert<T extends { id: string }>(list: T[], item: T) {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item]
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'card/save':
      return { ...state, cards: upsert(state.cards, action.card) }
    case 'card/delete':
      return {
        cards: state.cards.filter((c) => c.id !== action.id),
        // Silinen karta bağlı abonelikler silinmez, sadece kartsız kalır
        subscriptions: state.subscriptions.map((s) =>
          s.cardId === action.id ? { ...s, cardId: null } : s,
        ),
      }
    case 'subscription/save':
      return { ...state, subscriptions: upsert(state.subscriptions, action.subscription) }
    case 'subscription/delete':
      return { ...state, subscriptions: state.subscriptions.filter((s) => s.id !== action.id) }
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    // bozuk veya erişilemeyen kayıt: boş başla
  }
  return { cards: [], subscriptions: [] }
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
