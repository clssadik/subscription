import { CheckIcon } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { HoldButton } from '@/components/HoldButton'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { HomeQuickStart } from '@/components/QuickStart'
import { ScrollPage } from '@/components/ScrollPage'
import { AddButton, DateHeader } from '@/components/ScreenHeader'
import { ShareBar } from '@/components/ShareBar'
import { daysUntil, dueLabel, hasDue, monthItems, nextCardDue, nextRenewal, type MonthItem } from '@/lib/dates'
import { formatDate, formatMoney } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { play } from '@/lib/sound'
import { useStore } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { useScrollLimit } from '@/lib/useScrollLimit'
import { useScrollMemory } from '@/lib/useScrollMemory'
import { CURRENCIES } from '@/lib/types'
import { TOP_FOG, fog } from '@/lib/fog'
import { cn } from '@/lib/utils'
import { BankMark } from '@/components/BankMark'
import type { Nav } from '@/App'

// Üst bloğun tamamen küçülmesi için gereken kaydırma (px): bloğun küçülme mesafesinin iki katı, telefonda çok hızlı olmasın.
// Değişirse src/index.css'teki .shrink-block animation-range da değişmeli.
const COLLAPSE = 220
// Tarayıcı kaydırmaya bağlı animasyonu biliyor mu (iOS 26+). Biliyorsa küçülmeyi CSS yapar, JavaScript hiçbir şey yazmaz.
const SCROLL_TIMELINE = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()')
// Tüm para birimleri aynı tipografiyi kullanır: virgülden önceki ana kısım aynı boyut/renk, sonrası küçük ve soluk
const AMOUNT_SIZE = 'calc(42px - 16px * var(--p, 0))'

export function HomeScreen({ nav }: { nav: Nav }) {
  const { state, dispatch } = useStore()
  const theme = useTheme().resolved
  const { cards, subscriptions, payments } = state
  // Kaydırınca üst blok (toplam, sıradaki, iki küçük kart) birlikte küçülür; tarih başlığı sabit. --p 0 (en üstte) → 1 (COLLAPSE px kaydırınca).
  // Yeni iPhone'larda --p'yi kaydırmaya bağlı CSS animasyonu sürer (kaydırmayla aynı karede, geride kalmaz; src/index.css .shrink-block).
  // Eskilerde kaydırma olayından, karede en fazla bir kez ve sadece bloğa yazılır.
  // Blok listenin üstüne bindirilir (akışta yer kaplamaz): küçülürken liste alanının boyutu değişmez, hızlı kaydırmada zıplama olmaz.
  // Listenin üst boşluğu bloğun açık haldeki yüksekliği kadardır; blok boyu değişirse (ör. yazı tipi yüklenince) en üstteyken yeniden ölçülür.
  const block = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const [blockHeight, setBlockHeight] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  useLayoutEffect(() => {
    const el = block.current
    if (!el) return
    // Sadece blok tamamen açıkken ölç (açılma animasyonunun ara boyları listenin boşluğunu oynatmasın)
    const measure = () => Number(getComputedStyle(el).getPropertyValue('--p')) === 0 && setBlockHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })
  // iPhone iki uçta da esnetince başlık ve blok listeyle birlikte hareket eder (src/lib/useScrollLimit.ts)
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const limit = useScrollLimit(scroller, content)
  useScrollMemory('home', scroller, blockHeight > 0)
  const frame = useRef(0)
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    setScrolled(el.scrollTop > 0)
    if (SCROLL_TIMELINE || frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const p = Math.round(Math.min(1, Math.max(0, el.scrollTop / COLLAPSE)) * 1000) / 1000
      if (p === progress.current) return
      progress.current = p
      block.current?.style.setProperty('--p', String(p))
    })
  }
  const items = monthItems(cards, subscriptions, payments)
  const subItems = items.filter((i) => i.kind === 'subscription')

  const totals = CURRENCIES.map((c) => {
    const mine = subItems.filter((i) => i.subscription.currency === c)
    return {
      currency: c,
      total: mine.reduce((s, i) => s + i.subscription.amount, 0),
      paid: mine.filter((i) => i.paid).reduce((s, i) => s + i.subscription.amount, 0),
    }
  })
  const tryTotal = totals[0]
  const others = totals.slice(1).filter((t) => t.total > 0)

  const upcoming = subscriptions
    .map((s) => ({ s, date: nextRenewal(s, payments) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  const [first, second] = upcoming
  const nextCard = cards
    .filter(hasDue)
    .map((c) => ({ c, date: nextCardDue(c, payments) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0]

  function toggle(i: MonthItem) {
    haptic()
    const dueDate = formatDate(i.date, 'yyyy-MM-dd')
    const run = () =>
      i.kind === 'subscription'
        ? dispatch({ type: 'payment/toggle', kind: 'subscription', refId: i.subscription.id, dueDate, amount: i.subscription.amount, currency: i.subscription.currency })
        : dispatch({ type: 'payment/toggle', kind: 'card', refId: i.card.id, dueDate })
    run()
    // Ödendi işaretlenince ses ve kısa onay; işaret kaldırılınca ikisi de yok
    if (!i.paid) play('paid')
    if (!i.paid) toast(`${i.kind === 'subscription' ? i.subscription.name : `${i.card.bankName} ekstresi`} ödendi`, {
        action: {
          label: 'Geri al',
          onClick: () => {
            haptic()
            play('undo')
            run()
          },
        },
      })
  }

  if (subscriptions.length === 0 && cards.length === 0) {
    return (
      <ScrollPage>
        <DateHeader action={<AddButton label="Yeni ekle" onClick={() => nav.add()} />} />
        <HomeQuickStart nav={nav} />
      </ScrollPage>
    )
  }

  return (
    <div className="relative -mb-24 flex min-h-0 flex-1 flex-col">
      {/* Tek kayan alan: tarih başlığı ve blok da onun içinde, en üste yapışık (sticky). Böylece sayfanın neresinden tutulursa
          tutulsun liste kayar; iPhone en üstte esnetince başlık ve blok listeyle birlikte iner. Liste cam menünün arkasına kadar uzanır. */}
      <div
        ref={scroller}
        data-scroller
        onScroll={onScroll}
        className="relative -mx-3 mt-[calc(-1*var(--top-gap))] min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-[var(--top-gap)] pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Üstteki blok (toplam, sıradaki, iki küçük kart) yerinde sabit kalır ve kaydırınca birlikte küçülür.
            Arkası küçük kartların ortasına kadar opak zemin: aradaki boşluklardan içerik görünmez. Liste sadece küçük kartların
            alt yarısının arkasından geçer, kesimi kartların yuvarlak köşeleri yapar. Son 30px'te zemin %60'a iner; kaydırınca
            altına alttaki menüdeki gibi 40px'lik solma eklenir (%60 → şeffaf). */}
        {/* Yüksekliği sıfır: akışta yer kaplamaz, blok küçülürken liste alanı değişmez (hızlı kaydırmada zıplama olmaz) */}
        {/* Blok, kaydırma sınırı kadar yüksek bir kutunun içinde yapışık: liste sona gelip esneyince blok da onunla gider */}
        <div className="pointer-events-none absolute inset-x-0 top-[var(--top-gap)] z-10" style={{ height: limit }}>
        <div className="pointer-events-auto sticky top-0 h-0">
          <div ref={block} className="shrink-block absolute inset-x-0 top-0 px-3 pb-2">
            <DateHeader action={<AddButton label="Yeni ekle" onClick={() => nav.add()} />} />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-24 bottom-0 -z-10"
              style={{ background: `linear-gradient(to bottom, var(--page) calc(100% - 30px), ${fog(TOP_FOG.normal)})` }}
            />
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-0 top-full h-8 transition-opacity',
                scrolled ? 'opacity-100' : 'opacity-0',
              )}
              style={{ background: `linear-gradient(to bottom, ${fog(TOP_FOG.normal)}, transparent)` }}
            />
          {/* Bu ayın toplamı: 128 → 64px */}
          <section className="mb-2 flex h-[calc(128px-64px*var(--p,0))] flex-col overflow-hidden rounded-[22px] bg-hero px-3.5 py-[calc(14px-4px*var(--p,0))] text-hero-fg">
              <div className="label opacity-70">Bu ay ödenecek</div>
              <div className="mt-1 leading-none">
                <Money amount={tryTotal.total} size={AMOUNT_SIZE} />
                {others.map((o) => (
                  <span key={o.currency} className="ml-2" style={{ fontSize: AMOUNT_SIZE }}>
                    <span className="num">+ </span>
                    <Money amount={o.total} currency={o.currency} size={AMOUNT_SIZE} />
                  </span>
                ))}
              </div>
              {/* Şerit ve "ödendi" satırı küçülmenin ilk yarısında kaybolur */}
              <div className="mt-auto opacity-[calc(1-2*var(--p,0))]">
                {/* Kartın zemini: koyu temada mavi, açık temada siyah (index.css --hero) */}
                <ShareBar subscriptions={subscriptions} background={theme === 'dark' ? '#1F4FB4' : '#141414'} />
                <div className="mt-1.5 text-[11px] opacity-70">
                  {formatMoney(tryTotal.paid)}
                  {totals.slice(1).filter((t) => t.paid > 0).map((t) => ` + ${formatMoney(t.paid, t.currency)}`)} ödendi
                </div>
              </div>
          </section>

            <div className="grid grid-cols-2 gap-x-2 gap-y-[calc(8px-8px*var(--p,0))]">
              {/* Sıradaki ödeme: geniş sarı şerit, solda büyük geri sayım */}
              {first ? (
                <HoldButton
                  onOpen={() => nav.openSubscription(first.s.id)}
                  className="pressable col-span-2 flex items-center gap-4 rounded-[22px] bg-bh-yellow px-3.5 py-[calc(14px-4px*var(--p,0))] text-left text-[#141414]"
                >
                  <span className="min-w-16 text-center leading-none">
                    {daysUntil(first.date) === 0 ? (
                      <span className="num num-bold text-[length:calc(30px-8px*var(--p,0))]">Bugün</span>
                    ) : (
                      <>
                        <span className="num num-bold block text-[length:calc(56px-24px*var(--p,0))] leading-[0.85]">{daysUntil(first.date)}</span>
                        <span className="label">gün</span>
                      </>
                    )}
                  </span>
                  <span aria-hidden className="w-px self-stretch bg-black/15" />
                  <span className="min-w-0 flex-1">
                    {/* "Sıradaki" yazısı küçülürken kapanır */}
                    <span className="label block h-[calc(14px-14px*var(--p,0))] overflow-hidden opacity-[calc(0.7-1.4*var(--p,0))]">Sıradaki</span>
                    <span className="mt-[calc(6px-6px*var(--p,0))] flex items-center gap-2.5">
                      <Logo serviceKey={first.s.serviceKey} name={first.s.name} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{first.s.name}</span>
                        <span className="num block">{formatMoney(first.s.amount, first.s.currency)}</span>
                      </span>
                    </span>
                  </span>
                </HoldButton>
              ) : (
                <button onClick={() => nav.add()} className="pressable col-span-2 flex min-h-20 items-center justify-center rounded-[22px] bg-surface text-sm text-subtle">
                  + Abonelik ekle
                </button>
              )}

              {/* Altında: sonraki abonelik ve en yakın kart son ödemesi. Kaydırınca ikisi de solup tamamen kapanır */}
              {second ? (
                <HoldButton onOpen={() => nav.openSubscription(second.s.id)} className="pressable flex min-w-0 items-center gap-2.5 rounded-[18px] bg-surface px-2.5 py-[calc(10px-10px*var(--p,0))] text-left max-h-[calc(56px-56px*var(--p,0))] overflow-hidden opacity-[calc(1-2*var(--p,0))]">
                  <Logo serviceKey={second.s.serviceKey} name={second.s.name} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{second.s.name}</span>
                    <span className="block h-[calc(15px-15px*var(--p,0))] truncate text-[11px] text-subtle opacity-[calc(1-2*var(--p,0))]">{dueLabel(second.date)} · {formatMoney(second.s.amount, second.s.currency)}</span>
                  </span>
                </HoldButton>
              ) : (
                <button onClick={() => nav.add()} className="pressable flex min-h-[calc(52px-52px*var(--p,0))] items-center justify-center rounded-[18px] bg-surface text-sm text-subtle max-h-[calc(56px-56px*var(--p,0))] overflow-hidden opacity-[calc(1-2*var(--p,0))]">
                  + Abonelik ekle
                </button>
              )}

              {nextCard ? (
                <HoldButton onOpen={() => nav.openCard(nextCard.c.id)} className="pressable flex min-w-0 items-center gap-2.5 rounded-[18px] bg-bh-red px-2.5 py-[calc(10px-10px*var(--p,0))] text-left text-white max-h-[calc(56px-56px*var(--p,0))] overflow-hidden opacity-[calc(1-2*var(--p,0))]">
                  <BankMark bankName={nextCard.c.bankName} color="rgb(0 0 0 / 0.25)" size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{nextCard.c.bankName}</span>
                    <span className="block h-[calc(15px-15px*var(--p,0))] truncate text-[11px] opacity-[calc(0.85-1.7*var(--p,0))]">{dueLabel(nextCard.date)} · son ödeme</span>
                  </span>
                </HoldButton>
              ) : (
                <button onClick={() => nav.addCard()} className="pressable flex min-h-[calc(52px-52px*var(--p,0))] items-center justify-center rounded-[18px] bg-surface text-sm text-subtle max-h-[calc(56px-56px*var(--p,0))] overflow-hidden opacity-[calc(1-2*var(--p,0))]">
                  + Kart ekle
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
        {/* Listenin üst boşluğu bloğun açık haldeki yüksekliği kadar */}
        {/* En az kayan alan boyu + 1px: liste kısa olsa da iPhone'daki gibi esner */}
        <div ref={content} className="min-h-[calc(100%+1px)]" style={{ paddingTop: blockHeight }}>
            {/* Bu ayın bütün ödemeleri; soldaki yuvarlak "ödendi" işareti */}
            <h2 className="label mt-3 mb-2 px-1 text-subtle">{formatDate(new Date(), 'LLLL')} ödemeleri</h2>
            <ul className="grid gap-1.5">
              {items.map((i) => {
                const key = `${i.kind}-${i.kind === 'card' ? i.card.id : i.subscription.id}-${i.date.getTime()}`
                const past = daysUntil(i.date) < 0
                return (
                  <li key={key} className="flex items-center gap-3 rounded-[18px] bg-surface py-2 pr-3 pl-1.5 transition-transform duration-100 has-[button:active]:scale-[0.98]">
                    <button
                      onClick={() => toggle(i)}
                      aria-label={i.paid ? 'Ödenmedi olarak işaretle' : 'Ödendi olarak işaretle'}
                      aria-pressed={i.paid}
                      className="flex size-11 shrink-0 items-center justify-center"
                    >
                      <span className={cn('flex size-6 items-center justify-center rounded-full border-[1.5px] transition-colors', i.paid ? 'check-pop border-bh-green bg-bh-green text-white' : 'border-subtle/50')}>
                        {i.paid && <CheckIcon className="size-4" strokeWidth={2.5} />}
                      </span>
                    </button>
                    {i.kind === 'subscription' ? (
                      <HoldButton onOpen={() => nav.openSubscription(i.subscription.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <Logo serviceKey={i.subscription.serviceKey} name={i.subscription.name} size={30} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{i.subscription.name}</span>
                          <span className="block text-[11px] text-subtle">{formatDate(i.date, 'd MMM')} · {i.paid ? 'ödendi' : past ? 'geçti' : dueLabel(i.date)}</span>
                        </span>
                        <span className="num text-[15px]">{formatMoney(i.subscription.amount, i.subscription.currency)}</span>
                      </HoldButton>
                    ) : (
                      <HoldButton onOpen={() => nav.openCard(i.card.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <BankMark bankName={i.card.bankName} color={i.card.color} size={30} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{i.card.bankName}</span>
                          <span className="block text-[11px] text-subtle">{formatDate(i.date, 'd MMM')} · son ödeme · {i.paid ? 'ödendi' : past ? 'geçti' : dueLabel(i.date)}</span>
                        </span>
                        <span className="num text-[15px]">•• {i.card.last4}</span>
                      </HoldButton>
                    )}
                  </li>
                )
              })}
            </ul>
        </div>
      </div>
    </div>
  )
}

/** "4 gün" ya da "Bugün": kalan süre büyük rakamla */
export function BigDays({ date, small }: { date: Date; small?: boolean }) {
  const d = daysUntil(date)
  if (d === 0) return <span className={cn('num num-bold', small ? 'text-[26px]' : 'text-[34px]')}>Bugün</span>
  return (
    <>
      <span className={cn('num num-bold', small ? 'text-[30px]' : 'text-[52px]')}>{d}</span>
      <span className="text-sm"> gün</span>
    </>
  )
}
