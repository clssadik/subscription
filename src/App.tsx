import type { User } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AddSheet, type SheetTarget } from '@/components/AddSheet'
import { BottomNav, type Tab } from '@/components/BottomNav'
import { Toaster } from '@/components/ui/sonner'
import { useUser } from '@/lib/auth'
import { initial } from '@/lib/format'
import { StoreProvider, useStore } from '@/lib/store'
import { AccountScreen } from '@/screens/AccountScreen'
import { CardsScreen } from '@/screens/CardsScreen'
import { HistoryScreen } from '@/screens/HistoryScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { LoginScreen } from '@/screens/LoginScreen'
import { SubscriptionDetail } from '@/screens/SubscriptionDetail'
import { SubscriptionsScreen } from '@/screens/SubscriptionsScreen'

/** Ekranların birbirine geçiş için kullandığı komutlar */
export interface Nav {
  add: () => void
  addCard: () => void
  edit: (target: NonNullable<SheetTarget>) => void
  openSubscription: (id: string) => void
  openCard: (id: string) => void
  back: () => void
}

export default function App() {
  const user = useUser()
  return (
    <>
      {user !== undefined && (
        // key: hesap değişince (giriş/çıkış) veriler sıfırdan yüklensin
        <StoreProvider key={user?.id ?? 'guest'} userId={user?.id ?? null}>
          <Main user={user} />
        </StoreProvider>
      )}
      <Toaster position="top-center" />
    </>
  )
}

function Main({ user }: { user: User | null }) {
  const { ready } = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetTarget>(null)
  // Girişsiz ekleme denenince hatırlanır; giriş yapılınca form kendiliğinden açılır
  const pending = useRef<{ sheet: NonNullable<SheetTarget>; tab: Tab } | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, detailId])

  // Giriş yapan kullanıcıyı yarım kalan işine geri götür
  useEffect(() => {
    if (user && pending.current) {
      const p = pending.current
      pending.current = null
      setTab(p.tab)
      setSheet(p.sheet)
    }
  }, [user])

  /** Ekleme/düzenleme girişsiz yapılamaz: önce giriş ekranına götür */
  function openSheet(target: NonNullable<SheetTarget>) {
    if (user) return setSheet(target)
    pending.current = { sheet: target, tab }
    setDetailId(null)
    setTab('account')
    toast('Eklemek için önce giriş yap')
  }

  const nav: Nav = {
    add: () => openSheet({ kind: 'subscription' }),
    addCard: () => openSheet({ kind: 'card' }),
    edit: openSheet,
    openSubscription: (id) => setDetailId(id),
    openCard: (id) => {
      setCardId(id)
      setDetailId(null)
      setTab('cards')
    },
    back: () => setDetailId(null),
  }

  return (
    <>
      <main className="mx-auto min-h-svh max-w-md px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-32">
        {!ready ? (
          <p className="pt-24 text-center text-sm text-subtle">Yükleniyor…</p>
        ) : detailId ? (
          <SubscriptionDetail id={detailId} nav={nav} />
        ) : (
          <>
            {tab === 'home' && <HomeScreen nav={nav} />}
            {tab === 'subscriptions' && <SubscriptionsScreen nav={nav} />}
            {tab === 'account' && (user ? <AccountScreen user={user} /> : <LoginScreen />)}
            {tab === 'cards' && <CardsScreen nav={nav} selectedId={cardId} onSelect={setCardId} />}
            {tab === 'history' && <HistoryScreen />}
          </>
        )}
      </main>
      <BottomNav
        tab={tab}
        initial={user ? initial(user.email ?? '') : null}
        onTab={(t) => {
          setTab(t)
          setDetailId(null)
          if (t !== 'account') pending.current = null
        }}
      />
      <AddSheet target={sheet} onClose={() => setSheet(null)} />
    </>
  )
}
