import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { AddSheet, type SheetTarget } from '@/components/AddSheet'
import { BottomNav, type Tab } from '@/components/BottomNav'
import { Toaster } from '@/components/ui/sonner'
import { AuthGate } from '@/lib/auth'
import { StoreProvider, useStore } from '@/lib/store'
import { AccountScreen } from '@/screens/AccountScreen'
import { initial } from '@/lib/format'
import { CardsScreen } from '@/screens/CardsScreen'
import { HistoryScreen } from '@/screens/HistoryScreen'
import { HomeScreen } from '@/screens/HomeScreen'
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
  return (
    <>
      <AuthGate>
        {(user) => (
          // key: başka hesapla girilince veriler sıfırdan yüklensin
          <StoreProvider key={user.id} userId={user.id}>
            <Main user={user} />
          </StoreProvider>
        )}
      </AuthGate>
      <Toaster position="top-center" />
    </>
  )
}

function Main({ user }: { user: User }) {
  const { ready } = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetTarget>(null)

  // Ekran değişince en üste dön
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, detailId])

  const nav: Nav = {
    add: () => setSheet({ kind: 'subscription' }),
    addCard: () => setSheet({ kind: 'card' }),
    edit: (target) => setSheet(target),
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
            {tab === 'account' && <AccountScreen user={user} />}
            {tab === 'cards' && <CardsScreen nav={nav} selectedId={cardId} onSelect={setCardId} />}
            {tab === 'history' && <HistoryScreen />}
          </>
        )}
      </main>
      <BottomNav
        tab={tab}
        initial={initial(user.email ?? '')}
        onTab={(t) => {
          setTab(t)
          setDetailId(null)
        }}
      />
      <AddSheet target={sheet} onClose={() => setSheet(null)} />
    </>
  )
}
