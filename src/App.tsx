import type { User } from '@supabase/supabase-js'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { AddSheet, type SheetTarget } from '@/components/AddSheet'
import { InstallGate } from '@/components/InstallGate'
import { PermissionGate } from '@/components/PermissionGate'
import { ScrollPage } from '@/components/ScrollPage'
import { BottomNav, type Tab } from '@/components/BottomNav'
import { Toaster } from '@/components/ui/sonner'
import { useUser } from '@/lib/auth'
import { toKey } from '@/lib/dates'
import { shouldShowInstallGate, skipInstallGate } from '@/lib/install'
import { initials, useSettings } from '@/lib/settings'
import { StoreProvider, useStore } from '@/lib/store'
import { transition, type Motion } from '@/lib/transition'
import { scrollToTop } from '@/lib/useScrollMemory'
import { useSwipeBack } from '@/lib/useSwipeBack'
import { cn } from '@/lib/utils'
import { AccountScreen, AccountSubPage, type AccountPage } from '@/screens/AccountScreen'
import { AuthFlow, NameGate } from '@/screens/AuthScreens'
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
// Hesap da kalıcı: alt sayfası (Profil, Bildirimler…) detay gibi üstünde açılır, sağa çekince altında görünür.
const LIST_TABS: Tab[] = ['home', 'subscriptions', 'cards', 'history', 'account']
const isListTab = (t: Tab) => LIST_TABS.includes(t)

/** Bugünün anahtarı (yyyy-MM-dd): gün değişince değişir */
const todayKey = () => toKey(new Date())
/** Bir sonraki yerel gece yarısına kadar geçen süre (ms) */
const msUntilMidnight = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
}

export default function App() {
  const user = useUser()
  // Ad ve bildirim ekranları açıkken arkadaki uygulama inert olur (dokunulmaz, odaklanılmaz). Ekranlar açık olduğunu kendisi bildirir.
  const [nameGate, setNameGate] = useState(false)
  const [notifyGate, setNotifyGate] = useState(false)
  // Telefonda tarayıcıdan açıldıysa önce ana ekrana ekleme rehberi
  const [gate, setGate] = useState(shouldShowInstallGate)
  if (gate)
    return (
      <InstallGate
        onContinue={() =>
          transition('fade', () => {
            skipInstallGate()
            setGate(false)
          })
        }
      />
    )
  const gated = nameGate || notifyGate
  return (
    <>
      {/* Giriş yapılmamışken sadece karşılama / giriş ekranları (alt menü yok) */}
      {user === null && <AuthFlow />}
      {/* Ekran açıkken uygulama dokunulmaz ve odaklanılmaz; ekranlar bunun üstünde kalır */}
      {user && (
        <div inert={gated} aria-hidden={gated || undefined}>
          {/* key: hesap değişince veriler sıfırdan yüklensin */}
          <StoreProvider key={user.id} userId={user.id}>
            <Main user={user} />
          </StoreProvider>
        </div>
      )}
      {/* İlk girişte bir kez bildirim izni (sadece ana ekran uygulamasında, izin henüz sorulmadıysa). Ad ekranı açıksa altında kalır */}
      {user && <PermissionGate covered={nameGate} onOpenChange={setNotifyGate} />}
      {/* Ad zorunlu: adı olmayan herkes önce adını girer (bildirim izninin de üstünde, ilk o görünür) */}
      {user && <NameGate userId={user.id} onOpenChange={setNameGate} />}
      <Toaster position="top-center" />
    </>
  )
}

function Main({ user }: { user: User }) {
  const { ready, state } = useStore()
  const { settings } = useSettings(user.id)
  const [tab, setTab] = useState<Tab>('home')
  const [detailId, setDetailId] = useState<string | null>(null)
  // Kart detayı hangi sekmeden açıldıysa onun üstünde açılır; geri basınca o sekmeye dönülür
  const [cardId, setCardId] = useState<string | null>(null)
  // Hesap'ın açık alt sayfası (Profil, Bildirimler…): detay sayfası gibi açılır
  const [accountPage, setAccountPage] = useState<AccountPage | null>(null)
  const [sheet, setSheet] = useState<SheetTarget>(null)

  // Gün değişince (gece yarısı ya da uygulama ertesi gün öne gelince) ekranlar yeni tarihle çizilsin. Ekranlar tarihi her çizimde
  // hesaplar; bu değer değişince Ana bileşen de yeniden çizilir. Değer kullanılmaz, değişmesi yeterli.
  const [, setDay] = useState(todayKey)
  useEffect(() => {
    let timer = 0
    const sync = () => {
      setDay(todayKey())
      window.clearTimeout(timer)
      // Bir sonraki gece yarısında uyanır (1 sn fazla: saat farkı yüzünden erken uyanıp günü değiştirmesin)
      timer = window.setTimeout(sync, msUntilMidnight() + 1000)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    sync()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', sync)
    window.addEventListener('focus', sync)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  // Sayfa geçişi (iPhone'daki gibi): detay sağ kenardan gelir, eski sayfa biraz sola kayıp kararır; geri dönünce tersi (View Transitions).
  // Alt menüden sekme değişince yeni sayfa sekmenin yönünden kısa bir kaymayla gelir (Web Animations; sekmeler silinmediği için).
  // View Transitions olmayan tarayıcılarda detay geçişleri CSS animasyonuyla olur. Animasyonlar src/index.css'te.
  const screen = `${tab}:${detailId ?? ''}:${cardId ?? ''}:${accountPage ?? ''}`
  // null = geçişi View Transitions yaptı, CSS animasyonu gerekmez
  const [cssMotion, setCssMotion] = useState<Motion | null>(null)
  // Açılmış liste sekmeleri (hep yerinde kalır)
  const [visited, setVisited] = useState<Tab[]>([tab])
  const listShown = ready && !detailId && !cardId && !accountPage && isListTab(tab)

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

  // Üstteki katmanı kapatır (detay → kart → hesap alt sayfası): sağa çekerek geri dönüş ve Android geri tuşu aynısını yapar
  const closeTop = () => {
    if (detailId) setDetailId(null)
    else if (cardId) setCardId(null)
    else setAccountPage(null)
  }

  // Detay sayfasında sağa çekerek geri dönüş (iPhone gibi): altta önceki sekme görünür. Bırakınca geri dönüş animasyonsuz yapılır,
  // çünkü sayfa zaten parmakla kaydırılıp kapatıldı (src/lib/useSwipeBack.ts).
  const detailPage = useRef<HTMLElement>(null)
  const inDetail = ready && !!(detailId || cardId || accountPage)
  // Abonelik bir kartın üstünde açıksa altta o kart durur (kart sekmesinin listesi değil)
  const underCardId = ready && detailId && cardId ? cardId : null
  const underCard = useRef<HTMLElement>(null)
  useSwipeBack(detailPage, {
    enabled: inDetail,
    key: screen,
    under: () => (underCardId ? underCard.current : document.querySelector<HTMLElement>(`main[data-tab="${tab}"]`)),
    onBack: () =>
      flushSync(() => {
        setCssMotion(null)
        closeTop()
      }),
  })

  // Android geri tuşu: açık katmanlar tarayıcı geçmişiyle eşleşir. Açılan her katman bir kayıt ekler, kapanan her katman bir geri adımı
  // atar (kaydırma ve geri düğmesi de böyle kapanır). Geri tuşu üstteki katmanı kapatır. Sekmeler ve alttan açılan paneller kayıt eklemez.
  const layerCount = (detailId ? 1 : 0) + (cardId ? 1 : 0) + (accountPage ? 1 : 0)
  const historyDepth = useRef(0)
  useLayoutEffect(() => {
    const have = historyDepth.current
    if (layerCount === have) return
    try {
      if (layerCount > have) for (let n = have + 1; n <= layerCount; n++) history.pushState({ monthwise: n }, '')
      else history.go(layerCount - have)
      historyDepth.current = layerCount
    } catch {
      // Geçmiş kullanılamazsa geri tuşu uygulamadan çıkar; uygulamanın kendisi çalışmaya devam eder
    }
  })
  // Olay dinleyicisi tek sefer bağlanır; her çizimden sonra en güncel işlevleri okur
  const latest = useRef({ go, closeTop })
  useLayoutEffect(() => {
    latest.current = { go, closeTop }
  })
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const target = (e.state as { monthwise?: number } | null)?.monthwise ?? 0
      // Geçmiş zaten bu kadarsa (kendi geri adımımızın ardından gelen olay) bir şey yapılmaz: kapanış iki kez olmaz
      if (target >= historyDepth.current) return
      historyDepth.current = target
      latest.current.go('pop', latest.current.closeTop)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // Sayfa açık bir detayla yenilenince tarayıcıda kalan eski kayıt sıfırlanır (yoksa geri tuşu boş bir adım atardı)
  useEffect(() => {
    try {
      if ((history.state as { monthwise?: number } | null)?.monthwise) history.replaceState(null, '')
    } catch {
      // geçmiş kullanılamıyorsa atlanır
    }
  }, [])

  // Açık detayın aboneliği ya da kartı silinince (düzenle → sil) önceki sayfaya dönülür: yoksa sayfa boş kalıyordu
  useEffect(() => {
    if (!ready) return
    if (detailId && !state.subscriptions.some((s) => s.id === detailId)) go('pop', () => setDetailId(null))
    else if (cardId && !state.cards.some((c) => c.id === cardId)) go('pop', () => setCardId(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go her çizimde yeniden oluşur; sadece veri değişince bakılır
  }, [ready, state.subscriptions, state.cards, detailId, cardId])

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

  // Ekranlar tam ekran (.app-screen, src/index.css): ana ekran uygulamasında boyları ekranın tam boyuna göre
  return (
    <>
      {/* Liste sekmeleri ekrana sığar (sayfa kaymaz); sadece içlerindeki liste kayar. Görünmeyenler yerinde bekler. */}
      {ready &&
        visited.filter(isListTab).map((t) => {
          const active = listShown && t === tab
          return (
            <main
              key={t}
              data-tab={t}
              data-screen-active={active || undefined}
              // Hesap iPhone Ayarlar renklerinde (src/index.css)
              data-settings={t === 'account' || undefined}
              inert={!active}
              aria-hidden={!active || undefined}
              className={cn(
                'app-screen mx-auto flex max-w-md flex-col bg-page px-3 pt-[var(--top-gap)] pb-24',
                // Görünmeyen sekme ekranın dışında bekler: iPhone görünmez de olsa üstteki listeye parmağı verip kaydırmayı/esnemeyi yutuyordu
                !active && 'pointer-events-none invisible -translate-x-[200vw]',
              )}
            >
              {t === 'home' && <HomeScreen nav={nav} />}
              {t === 'subscriptions' && <SubscriptionsScreen nav={nav} />}
              {t === 'cards' && <CardsScreen nav={nav} onSelect={nav.openCard} />}
              {t === 'history' && <HistoryScreen nav={nav} />}
              {t === 'account' && (
                <ScrollPage>
                  <AccountScreen user={user} open={(page) => go('push', () => setAccountPage(page))} />
                </ScrollPage>
              )}
            </main>
          )
        })}
      {/* Abonelik kartın üstünde açıksa kart sayfası altta gizli bekler: sağa çekince o görünür (src/lib/useSwipeBack.ts). Dokunulmaz. */}
      {underCardId && (
        <main
          ref={underCard}
          inert
          aria-hidden
          className="app-screen mx-auto flex max-w-md flex-col bg-page px-3 pt-[var(--top-gap)] pb-24 pointer-events-none invisible -translate-x-[200vw]"
        >
          <ScrollPage>
            <CardDetail id={underCardId} nav={nav} onBack={() => {}} />
          </ScrollPage>
        </main>
      )}
      {!listShown && (
        <main
          key={ready ? screen : 'loading'}
          ref={detailPage}
          data-screen-active
          // Hesap ve alt sayfaları iPhone Ayarlar renklerinde (src/index.css)
          data-settings={(ready && !!accountPage) || undefined}
          // Liste sekmeleri gibi sabit ve kendi kayan alanı var: sayfanın kendisi kaymaz (iPhone'da yukarıdan çekince yenileme olmaz, iki uçta esner)
          className={cn(
            cssMotion && `screen-${cssMotion}`,
            // Yatay hareketleri tarayıcı değil sağa çekerek geri dönüş alır; dikey kaydırma normal
            inDetail && 'touch-pan-y',
            'app-screen mx-auto flex max-w-md flex-col bg-page px-3 pt-[var(--top-gap)] pb-24',
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
              accountPage && <AccountSubPage page={accountPage} user={user} onBack={() => go('pop', () => setAccountPage(null))} />
            )}
          </ScrollPage>
        </main>
      )}
      {/* Üst kenar: yukarı kayan liste en üste varmadan zemin rengine solar (keskin kesim ve iOS'un kenar bulanıklığı görünmez).
          İçerik bu katmanın altından başlar (--top-gap, src/index.css). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[var(--top-gap)]"
        style={{ background: 'linear-gradient(to bottom, var(--page) calc(100% - 14px), transparent)' }}
      />
      <BottomNav
        tab={tab}
        initial={initials(settings.name, user.email ?? '')}
        onTab={(t) => {
          // Açık sekmeye tekrar basınca en başa kay
          if (t === tab && !detailId && !cardId && !accountPage) {
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
            setAccountPage(null)
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
