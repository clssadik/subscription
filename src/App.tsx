import type { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { AddSheet, type SheetTarget } from '@/components/AddSheet'
import { ScrollPage } from '@/components/ScrollPage'
import { BottomNav, type Tab } from '@/components/BottomNav'
import { Toaster } from '@/components/ui/sonner'
import { useUser } from '@/lib/auth'
import { initials, useSettings } from '@/lib/settings'
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

// Liste sekmeleri: bir kez açılınca hep yerinde kalır, sekme değişince sadece görünen değişir.
// iPhone, sonradan oluşturulan kayan listeyi ilk dokunuşa kadar tam tanımıyor (ilk kaydırma takılıyordu); kalıcı liste bu sorunu yaşamaz.
// Kaydırma yeri de kendiliğinden korunur.
const LIST_TABS: Tab[] = ['home', 'subscriptions', 'cards', 'history']
const isListTab = (t: Tab) => LIST_TABS.includes(t)

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
  const { settings } = useSettings(user.id)
  const [tab, setTab] = useState<Tab>('home')
  const [detailId, setDetailId] = useState<string | null>(null)
  // Kart detayı hangi sekmeden açıldıysa onun üstünde açılır; geri basınca o sekmeye dönülür
  const [cardId, setCardId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetTarget>(null)

  // Sayfa geçişi (iPhone'daki gibi): detay sağ kenardan gelir, eski sayfa biraz sola kayıp kararır; geri dönünce tersi (View Transitions).
  // Alt menüden sekme değişince yeni sayfa sekmenin yönünden kısa bir kaymayla gelir (Web Animations; sekmeler silinmediği için).
  // View Transitions olmayan tarayıcılarda detay geçişleri CSS animasyonuyla olur. Animasyonlar src/index.css'te.
  const screen = `${tab}:${detailId ?? ''}:${cardId ?? ''}`
  // null = geçişi View Transitions yaptı, CSS animasyonu gerekmez
  const [cssMotion, setCssMotion] = useState<Motion | null>(null)
  // Açılmış liste sekmeleri (hep yerinde kalır)
  const [visited, setVisited] = useState<Tab[]>([tab])
  const listShown = ready && !detailId && !cardId && isListTab(tab)

  function go(next: Motion, update: () => void) {
    if (next === 'tab-right' || next === 'tab-left') {
      flushSync(update)
      setCssMotion(null)
      const el = document.querySelector<HTMLElement>('[data-screen-active]')
      if (el && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const x = next === 'tab-right' ? 40 : -40
        el.animate([{ opacity: 0, transform: `translateX(${x}px)` }, { opacity: 1, transform: 'none' }], {
          duration: 440,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        })
      }
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

  // Ekranlar dört kenara sabit (fixed inset-0): iPhone ana ekran uygulamasında svh/vh yüksekliği yanlış gelip sayfa taşabiliyordu
  return (
    <>
      {/* Liste sekmeleri ekrana sığar (sayfa kaymaz); sadece içlerindeki liste kayar. Görünmeyenler yerinde bekler. */}
      {ready &&
        visited.filter(isListTab).map((t) => {
          const active = listShown && t === tab
          return (
            <main
              key={t}
              data-screen-active={active || undefined}
              inert={!active}
              aria-hidden={!active || undefined}
              className={cn(
                'fixed inset-0 mx-auto flex max-w-md flex-col bg-page px-3 pt-[max(1rem,calc(env(safe-area-inset-top)+14px))] pb-24',
                // Görünmeyen sekme ekranın dışında bekler: iPhone görünmez de olsa üstteki listeye parmağı verip kaydırmayı/esnemeyi yutuyordu
                !active && 'pointer-events-none invisible -translate-x-[200vw]',
              )}
            >
              {t === 'home' && <HomeScreen nav={nav} />}
              {t === 'subscriptions' && <SubscriptionsScreen nav={nav} />}
              {t === 'cards' && <CardsScreen nav={nav} onSelect={nav.openCard} />}
              {t === 'history' && <HistoryScreen nav={nav} />}
            </main>
          )
        })}
      {!listShown && (
        <main
          key={ready ? screen : 'loading'}
          data-screen-active
          // Liste sekmeleri gibi sabit ve kendi kayan alanı var: sayfanın kendisi kaymaz (iPhone'da yukarıdan çekince yenileme olmaz, iki uçta esner)
          className={cn(
            cssMotion && `screen-${cssMotion}`,
            'fixed inset-0 mx-auto flex max-w-md flex-col bg-page px-3 pt-[max(1rem,calc(env(safe-area-inset-top)+14px))] pb-24',
          )}
        >
          <ScrollPage>
            {!ready ? (
              <LoadingSkeleton />
            ) : detailId ? (
              <SubscriptionDetail id={detailId} nav={nav} />
            ) : cardId ? (
              <CardDetail id={cardId} nav={nav} onBack={() => go('pop', () => setCardId(null))} />
            ) : (
              tab === 'account' && <AccountScreen user={user} />
            )}
          </ScrollPage>
        </main>
      )}
      {/* Saat/pil çubuğu: iOS 26 orayı şeffaf bırakmıyor, en üstteki sabit öğenin rengiyle dolduruyor. Bu katman zemin renginde:
          çubuk sayfayla tek parça görünür, yukarı kayan liste çubuğa varmadan 14px'te solar. İçerik bu katmanın altından başlar. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[calc(env(safe-area-inset-top)+14px)]"
        style={{ background: 'linear-gradient(to bottom, var(--page) env(safe-area-inset-top), transparent)' }}
      />
      <BottomNav
        tab={tab}
        initial={initials(settings.name, user.email ?? '')}
        onTab={(t) => {
          // Açık sekmeye tekrar basınca en başa kay
          if (t === tab && !detailId && !cardId) {
            scrollToTop(t)
            document.querySelector('[data-screen-active] [data-scroller]')?.scrollTo({ top: 0, behavior: 'smooth' })
            return
          }
          // Aynı sekmeye basınca detaydan listeye geri dönülür
          go(t === tab ? 'pop' : TAB_ORDER.indexOf(t) > TAB_ORDER.indexOf(tab) ? 'tab-right' : 'tab-left', () => {
            setTab(t)
            setVisited((v) => (v.includes(t) ? v : [...v, t]))
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
