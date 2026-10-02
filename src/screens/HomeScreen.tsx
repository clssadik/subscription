import { CheckIcon } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { HomeQuickStart } from '@/components/QuickStart'
import { AddButton, DateHeader } from '@/components/ScreenHeader'
import { ShareBar } from '@/components/ShareBar'
import { daysUntil, dueLabel, hasDue, monthItems, nextCardDue, nextRenewal, type MonthItem } from '@/lib/dates'
import { formatDate, formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CURRENCIES } from '@/lib/types'
import { TOP_FOG, fog } from '@/lib/fog'
import { cn } from '@/lib/utils'
import { BankMark } from '@/components/BankMark'
import type { Nav } from '@/App'

// Üst bloğun tamamen küçülmesi için gereken kaydırma (px): bloğun küçülme mesafesinin iki katı, telefonda çok hızlı olmasın
const COLLAPSE = 220
// Tüm para birimleri aynı tipografiyi kullanır: virgülden önceki ana kısım aynı boyut/renk, sonrası küçük ve soluk
const AMOUNT_SIZE = 'calc(42px - 16px * var(--p, 0))'

export function HomeScreen({ nav }: { nav: Nav }) {
  const { state, dispatch } = useStore()
  const { cards, subscriptions, payments } = state
  // Kaydırınca üst blok (toplam, sıradaki, iki küçük kart) birlikte küçülür; tarih başlığı sabit. --p 0 (en üstte) → 1 (COLLAPSE px kaydırınca). Her karede yeniden çizmemek için CSS değişkeni.
  // Blok listenin üstüne bindirilir (akışta yer kaplamaz): küçülürken liste alanının boyutu değişmez, hızlı kaydırmada zıplama olmaz.
  // Listenin üst boşluğu bloğun açık haldeki yüksekliği kadardır; blok boyu değişirse (ör. yazı tipi yüklenince) en üstteyken yeniden ölçülür.
  const top = useRef<HTMLDivElement>(null)
  const block = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const [blockHeight, setBlockHeight] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  useLayoutEffect(() => {
    const el = block.current
    if (!el) return
    const measure = () => progress.current === 0 && setBlockHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const y = e.currentTarget.scrollTop
    progress.current = Math.min(1, Math.max(0, y / COLLAPSE))
    top.current?.style.setProperty('--p', String(progress.current))
    setScrolled(y > 0)
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
    if (i.kind === 'subscription')
      dispatch({ type: 'payment/toggle', kind: 'subscription', refId: i.subscription.id, dueDate: formatDate(i.date, 'yyyy-MM-dd'), amount: i.subscription.amount, currency: i.subscription.currency })
    else dispatch({ type: 'payment/toggle', kind: 'card', refId: i.card.id, dueDate: formatDate(i.date, 'yyyy-MM-dd') })
  }

  if (subscriptions.length === 0 && cards.length === 0) {
    return (
      <>
        <DateHeader action={<AddButton label="Yeni ekle" onClick={() => nav.add()} />} />
        <HomeQuickStart nav={nav} />
      </>
    )
  }

  return (
    <div ref={top} className="relative -mb-24 flex min-h-0 flex-1 flex-col">
      <DateHeader action={<AddButton label="Yeni ekle" onClick={() => nav.add()} />} />
      {/* Üstteki blok (toplam, sıradaki, iki küçük kart) yerinde sabit kalır ve kaydırınca birlikte küçülür.
          Arkası küçük kartların ortasına kadar opak zemin: aradaki boşluklardan içerik görünmez. Liste sadece küçük kartların
          alt yarısının arkasından geçer, kesimi kartların yuvarlak köşeleri yapar. Son 30px'te zemin %60'a iner; kaydırınca
          altına alttaki menüdeki gibi 40px'lik solma eklenir (%60 → şeffaf). */}
      <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={block} className="absolute inset-x-0 top-0 z-10 -mx-3 px-3 pb-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
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
            <ShareBar subscriptions={subscriptions} />
            <div className="mt-1.5 text-[11px] opacity-70">
              {formatMoney(tryTotal.paid)}
              {totals.slice(1).filter((t) => t.paid > 0).map((t) => ` + ${formatMoney(t.paid, t.currency)}`)} ödendi
            </div>
          </div>
      </section>

        <div className="grid grid-cols-2 gap-2">
          {/* Sıradaki ödeme: geniş sarı şerit, solda büyük geri sayım */}
          {first ? (
            <button
              onClick={() => nav.openSubscription(first.s.id)}
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
            </button>
          ) : (
            <button onClick={() => nav.add()} className="pressable col-span-2 flex min-h-20 items-center justify-center rounded-[22px] bg-surface text-sm text-subtle">
              + Abonelik ekle
            </button>
          )}

          {/* Altında: sonraki abonelik ve en yakın kart son ödemesi */}
          {second ? (
            <button onClick={() => nav.openSubscription(second.s.id)} className="pressable flex min-w-0 items-center gap-2.5 rounded-[18px] bg-surface px-2.5 py-[calc(10px-4px*var(--p,0))] text-left">
              <Logo serviceKey={second.s.serviceKey} name={second.s.name} size={32} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{second.s.name}</span>
                <span className="block h-[calc(15px-15px*var(--p,0))] truncate text-[11px] text-subtle opacity-[calc(1-2*var(--p,0))]">{dueLabel(second.date)} · {formatMoney(second.s.amount, second.s.currency)}</span>
              </span>
            </button>
          ) : (
            <button onClick={() => nav.add()} className="pressable flex min-h-[52px] items-center justify-center rounded-[18px] bg-surface text-sm text-subtle">
              + Abonelik ekle
            </button>
          )}

          {nextCard ? (
            <button onClick={() => nav.openCard(nextCard.c.id)} className="pressable flex min-w-0 items-center gap-2.5 rounded-[18px] bg-bh-red px-2.5 py-[calc(10px-4px*var(--p,0))] text-left text-white">
              <BankMark bankName={nextCard.c.bankName} color="rgb(0 0 0 / 0.25)" size={32} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{nextCard.c.bankName}</span>
                <span className="block h-[calc(15px-15px*var(--p,0))] truncate text-[11px] opacity-[calc(0.85-1.7*var(--p,0))]">{dueLabel(nextCard.date)} · son ödeme</span>
              </span>
            </button>
          ) : (
            <button onClick={() => nav.addCard()} className="pressable flex min-h-[52px] items-center justify-center rounded-[18px] bg-surface text-sm text-subtle">
              + Kart ekle
            </button>
          )}
        </div>
      </div>

      {/* Sadece bu ayın ödemeleri kayar. Bloğun tamamının arkasından başlar (üst boşluk = bloğun açık hali),
          aşağıda cam menünün arkasına kadar uzanır. */}
      <div
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-none pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingTop: blockHeight }}
      >
        <div>
          {/* Bu ayın bütün ödemeleri; soldaki yuvarlak "ödendi" işareti */}
          <h2 className="label mt-3 mb-2 px-1 text-subtle">{formatDate(new Date(), 'LLLL')} ödemeleri</h2>
          <ul className="grid gap-1.5">
            {items.map((i) => {
              const key = `${i.kind}-${i.kind === 'card' ? i.card.id : i.subscription.id}-${i.date.getTime()}`
              const past = daysUntil(i.date) < 0
              return (
                <li key={key} className="flex items-center gap-3 rounded-[18px] bg-surface py-2 pr-3 pl-1.5">
                  <button
                    onClick={() => toggle(i)}
                    aria-label={i.paid ? 'Ödenmedi olarak işaretle' : 'Ödendi olarak işaretle'}
                    aria-pressed={i.paid}
                    className="flex size-11 shrink-0 items-center justify-center"
                  >
                    <span className={cn('flex size-6 items-center justify-center rounded-full border-[1.5px]', i.paid ? 'border-bh-green bg-bh-green text-white' : 'border-subtle/50')}>
                      {i.paid && <CheckIcon className="size-4" strokeWidth={2.5} />}
                    </span>
                  </button>
                  {i.kind === 'subscription' ? (
                    <button onClick={() => nav.openSubscription(i.subscription.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <Logo serviceKey={i.subscription.serviceKey} name={i.subscription.name} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{i.subscription.name}</span>
                        <span className="block text-[11px] text-subtle">{formatDate(i.date, 'd MMM')} · {i.paid ? 'ödendi' : past ? 'geçti' : dueLabel(i.date)}</span>
                      </span>
                      <span className="num text-[15px]">{formatMoney(i.subscription.amount, i.subscription.currency)}</span>
                    </button>
                  ) : (
                    <button onClick={() => nav.openCard(i.card.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <BankMark bankName={i.card.bankName} color={i.card.color} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{i.card.bankName}</span>
                        <span className="block text-[11px] text-subtle">{formatDate(i.date, 'd MMM')} · son ödeme · {i.paid ? 'ödendi' : past ? 'geçti' : dueLabel(i.date)}</span>
                      </span>
                      <span className="num text-[13px] text-subtle">•• {i.card.last4}</span>
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
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
