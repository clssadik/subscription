import type { User } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AddSheet, type SheetTarget } from '@/components/AddSheet'
import { BottomNav, type Tab } from '@/components/BottomNav'
import { Toaster } from '@/components/ui/sonner'
import { useUser } from '@/lib/auth'
import { initial } from '@/lib/format'
import { StoreProvider, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { AccountScreen } from '@/screens/AccountScreen'
import { CardDetail } from '@/screens/CardDetail'
import { CardsScreen } from '@/screens/CardsScreen'
import { HistoryScreen } from '@/screens/HistoryScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { LoginScreen } from '@/screens/LoginScreen'
import { SubscriptionDetail } from '@/screens/SubscriptionDetail'
import { SubscriptionsScreen } from '@/screens/SubscriptionsScreen'

/** Ekranların birbirine geçiş için kullandığı komutlar */
export interface Nav {
  add: (preset?: { serviceKey?: string; name?: string }) => void
  addCard: (bankName?: string) => void
  edit: (target: NonNullable<SheetTarget>) => void
  openSubscription: (id: string) => void
  openCard: (id: string) => void
  back: () => void
}

type Pending = { sheet: NonNullable<SheetTarget>; tab: Tab } | null

export default function App() {
  const user = useUser()
  // Girişsiz ekleme denenince hatırlanır. Giriş yapınca Main yeniden kurulduğu için burada tutuluyor.
  const pending = useRef<Pending>(null)
  const savePending = (p: Pending) => {
    pending.current = p
  }
  const takePending = () => {
    const p = pending.current
    pending.current = null
    return p
  }
  return (
    <>
      {user !== undefined && (
        // key: hesap değişince (giriş/çıkış) veriler sıfırdan yüklensin
        <StoreProvider key={user?.id ?? 'guest'} userId={user?.id ?? null}>
          <Main user={user} savePending={savePending} takePending={takePending} />
        </StoreProvider>
      )}
      <Toaster position="top-center" />
    </>
  )
}

function Main({
  user,
  savePending,
  takePending,
}: {
  user: User | null
  savePending: (p: Pending) => void
  takePending: () => Pending
}) {
  const { ready } = useStore()
  // Giriş yapan kullanıcıyı yarım kalan işine geri götür
  const [resume] = useState(() => (user ? takePending() : null))
  const [tab, setTab] = useState<Tab>(resume?.tab ?? 'home')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetTarget>(resume?.sheet ?? null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, detailId])

  /** Ekleme/düzenleme girişsiz yapılamaz: önce giriş ekranına götür */
  function openSheet(target: NonNullable<SheetTarget>) {
    if (user) return setSheet(target)
    savePending({ sheet: target, tab })
    setDetailId(null)
    setTab('account')
    toast('Eklemek için önce giriş yap')
  }

  const nav: Nav = {
    add: (preset) => openSheet({ kind: 'subscription', ...preset }),
    addCard: (bankName) => openSheet({ kind: 'card', bankName }),
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
      {/* Özet ve Abonelikler ekrana sığar (sayfa kaymaz); orada sadece liste kayar */}
      <main
        className={cn(
          'mx-auto max-w-md px-3 pt-[max(1rem,env(safe-area-inset-top))]',
          (tab === 'home' || tab === 'subscriptions' || (tab === 'cards' && !cardId)) && !detailId && ready ? 'flex h-svh flex-col overflow-y-auto pb-24' : 'min-h-svh pb-32',
        )}
      >
        {!ready ? (
          <p className="pt-24 text-center text-sm text-subtle">Yükleniyor…</p>
        ) : detailId ? (
          <SubscriptionDetail id={detailId} nav={nav} />
        ) : (
          <>
            {tab === 'home' && <HomeScreen nav={nav} />}
            {tab === 'subscriptions' && <SubscriptionsScreen nav={nav} />}
            {tab === 'account' && (user ? <AccountScreen user={user} /> : <LoginScreen />)}
            {tab === 'cards' &&
              (cardId ? <CardDetail id={cardId} nav={nav} onBack={() => setCardId(null)} /> : <CardsScreen nav={nav} onSelect={setCardId} />)}
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
          setCardId(null)
          if (t !== 'account') savePending(null)
        }}
      />
      <AddSheet target={sheet} onClose={() => setSheet(null)} />
    </>
  )
}
