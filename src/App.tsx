import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { AddSheet, type SheetTarget } from '@/components/AddSheet'
import { BottomNav, type Tab } from '@/components/BottomNav'
import { Toaster } from '@/components/ui/sonner'
import { useUser } from '@/lib/auth'
import { initial } from '@/lib/format'
import { StoreProvider, useStore } from '@/lib/store'
import { transition, type Motion } from '@/lib/transition'
import { scrollToTop } from '@/lib/useScrollMemory'
import { cn } from '@/lib/utils'
import { AccountScreen } from '@/screens/AccountScreen'
import { AuthFlow } from '@/screens/AuthScreens'
import { CardDetail } from '@/screens/CardDetail'
import { CardsScreen } from '@/screens/CardsScreen'
import { HistoryScreen } from '@/screens/HistoryScreen'
import { HomeScreen } from '@/screens/HomeScreen'
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

// Alt menüdeki sıra: sağdaki sekmeye geçince sayfa sağdan, soldakine geçince soldan gelir
const TAB_ORDER: Tab[] = ['home', 'subscriptions', 'cards', 'history', 'account']

export default function App() {
  const user = useUser()
  return (
    <>
      {/* Giriş yapılmamışken sadece karşılama / giriş ekranları (alt menü yok) */}
      {user === null && <AuthFlow />}
      {user && (
        // key: hesap değişince veriler sıfırdan yüklensin
        <StoreProvider key={user.id} userId={user.id}>
          <Main user={user} />
        </StoreProvider>
      )}
      <Toaster position="top-center" />
    </>
  )
}

function Main({ user }: { user: User }) {
  const { ready } = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [detailId, setDetailId] = useState<string | null>(null)
  // Kart detayı hangi sekmeden açıldıysa onun üstünde açılır; geri basınca o sekmeye dönülür
  const [cardId, setCardId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetTarget>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, detailId, cardId])

  // Sayfa geçişi (iPhone'daki gibi): detay sağ kenardan gelir, eski sayfa biraz sola kayıp kararır; geri dönünce tersi (View Transitions).
  // Alt menüden sekme değişince yeni sayfa sekmenin yönünden kısa bir kaymayla gelir: bu sade bir CSS animasyonu, çünkü
  // iPhone'da View Transitions ile açılan liste sekmelerinde kaydırma kilitleniyordu. Animasyonlar src/index.css'te.
  // View Transitions olmayan tarayıcılarda her geçiş CSS animasyonuyla olur.
  const screen = `${tab}:${detailId ?? ''}:${cardId ?? ''}`
  // null = geçişi View Transitions yaptı, CSS animasyonu gerekmez
  const [cssMotion, setCssMotion] = useState<Motion | null>(null)
  function go(next: Motion, update: () => void) {
    if (next.startsWith('tab')) {
      update()
      setCssMotion(next)
      return
    }
    // transition() desteklenmeyen tarayıcıda güncellemeyi hemen yapar ve false döner
    const viaView = transition(next, update)
    setCssMotion(viaView ? null : next)
  }

  const nav: Nav = {
    add: (preset) => setSheet({ kind: 'subscription', ...preset }),
    addCard: (bankName) => setSheet({ kind: 'card', bankName }),
    edit: setSheet,
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
      {/* Liste sekmeleri ekrana sığar (sayfa kaymaz); sadece içlerindeki liste kayar. İç içe ikinci bir kayan alan olmasın: iPhone'da kaydırma kilitlenebiliyor */}
      <main
        key={ready ? screen : 'loading'}
        className={cn(
          cssMotion && `screen-${cssMotion}`,
          'mx-auto max-w-md px-3 pt-[max(1rem,env(safe-area-inset-top))]',
          (tab === 'home' || tab === 'subscriptions' || tab === 'history' || tab === 'cards') && !detailId && !cardId && ready ? 'flex h-svh flex-col overflow-hidden pb-24' : 'min-h-svh pb-32',
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
            {tab === 'account' && <AccountScreen user={user} />}
            {tab === 'cards' && <CardsScreen nav={nav} onSelect={nav.openCard} />}
            {tab === 'history' && <HistoryScreen nav={nav} />}
          </>
        )}
      </main>
      <BottomNav
        tab={tab}
        initial={initial(user.email ?? '')}
        onTab={(t) => {
          // Açık sekmeye tekrar basınca en başa kay
          if (t === tab && !detailId && !cardId) {
            scrollToTop(t)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
          }
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
