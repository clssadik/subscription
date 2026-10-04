import type { User } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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

type Motion = 'push' | 'pop' | 'fade' | 'tab-right' | 'tab-left'

// Alt menüdeki sıra: sağdaki sekmeye geçince sayfa sağdan, soldakine geçince soldan gelir
const TAB_ORDER: Tab[] = ['home', 'subscriptions', 'cards', 'history', 'account']

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
  // Kart detayı hangi sekmeden açıldıysa onun üstünde açılır; geri basınca o sekmeye dönülür
  const [cardId, setCardId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetTarget>(resume?.sheet ?? null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, detailId, cardId])

  // Sayfa geçişi (iPhone'daki gibi): detay sağ kenardan gelir, eski sayfa biraz sola kayıp kararır; geri dönünce tersi.
  // Alt menüden sekme değişince sayfa sekmenin yönünden kısa bir kaymayla gelir. Animasyonlar src/index.css'te (::view-transition).
  // View Transitions olmayan tarayıcılarda sadece yeni sayfa kısa bir animasyonla belirir.
  const screen = `${tab}:${detailId ?? ''}:${cardId ?? ''}`
  const [motion, setMotion] = useState<Motion>('fade')
  function go(next: Motion, update: () => void) {
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotion(next)
      return update()
    }
    document.documentElement.dataset.motion = next
    document.startViewTransition(() => flushSync(update))
  }

  /** Ekleme/düzenleme girişsiz yapılamaz: önce giriş ekranına götür */
  function openSheet(target: NonNullable<SheetTarget>) {
    if (user) return setSheet(target)
    savePending({ sheet: target, tab })
    go('fade', () => {
      setDetailId(null)
      setTab('account')
    })
    toast('Eklemek için önce giriş yap')
  }

  const nav: Nav = {
    add: (preset) => openSheet({ kind: 'subscription', ...preset }),
    addCard: (bankName) => openSheet({ kind: 'card', bankName }),
    edit: openSheet,
    openSubscription: (id) => go('push', () => setDetailId(id)),
    openCard: (id) =>
      go('push', () => {
        setCardId(id)
        setDetailId(null)
      }),
    back: () => go('pop', () => setDetailId(null)),
  }

  return (
    <>
      {/* Özet ve Abonelikler ekrana sığar (sayfa kaymaz); orada sadece liste kayar */}
      <main
        key={ready ? screen : 'loading'}
        className={cn(
          !document.startViewTransition && `screen-${motion}`,
          'mx-auto max-w-md px-3 pt-[max(1rem,env(safe-area-inset-top))]',
          (tab === 'home' || tab === 'subscriptions' || tab === 'history' || tab === 'cards') && !detailId && !cardId && ready ? 'flex h-svh flex-col overflow-y-auto pb-24' : 'min-h-svh pb-32',
        )}
      >
        {!ready ? (
          <LoadingSkeleton />
        ) : detailId ? (
          <SubscriptionDetail id={detailId} nav={nav} />
        ) : cardId ? (
          <CardDetail id={cardId} nav={nav} onBack={() => go('pop', () => setCardId(null))} />
        ) : (
          <>
            {tab === 'home' && <HomeScreen nav={nav} />}
            {tab === 'subscriptions' && <SubscriptionsScreen nav={nav} />}
            {tab === 'account' && (user ? <AccountScreen user={user} /> : <LoginScreen />)}
            {tab === 'cards' && <CardsScreen nav={nav} onSelect={nav.openCard} />}
            {tab === 'history' && <HistoryScreen nav={nav} />}
          </>
        )}
      </main>
      <BottomNav
        tab={tab}
        initial={user ? initial(user.email ?? '') : null}
        onTab={(t) => {
          if (t !== 'account') savePending(null)
          if (t === tab && !detailId && !cardId) return
          // Aynı sekmeye basınca detaydan listeye geri dönülür
          go(t === tab ? 'pop' : TAB_ORDER.indexOf(t) > TAB_ORDER.indexOf(tab) ? 'tab-right' : 'tab-left', () => {
            setTab(t)
            setDetailId(null)
            setCardId(null)
          })
        }}
      />
      <AddSheet target={sheet} onClose={() => setSheet(null)} />
    </>
  )
}

/** Veriler gelene kadar Anasayfa'nın iskeleti: aynı yerlerde nefes alan gri kutular */
function LoadingSkeleton() {
  return (
    <div aria-busy aria-label="Yükleniyor" className="grid gap-2">
      <div className="mb-1 flex items-center justify-between">
        <div className="skeleton h-8 w-36 rounded-xl" />
        <div className="skeleton size-11 rounded-full" />
      </div>
      <div className="skeleton h-32 rounded-[22px]" />
      <div className="skeleton h-[92px] rounded-[22px]" />
      <div className="grid grid-cols-2 gap-2">
        <div className="skeleton h-[60px] rounded-[18px]" />
        <div className="skeleton h-[60px] rounded-[18px]" />
      </div>
      <div className="skeleton mt-3 h-3 w-28 rounded" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-[54px] rounded-[18px]" />
      ))}
    </div>
  )
}
