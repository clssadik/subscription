import { CheckIcon } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { HomeQuickStart } from '@/components/QuickStart'
import { AddButton, ScreenHeader } from '@/components/ScreenHeader'
import { ShareBar } from '@/components/ShareBar'
import { daysUntil, dueLabel, monthItems, nextCardDue, nextRenewal, type MonthItem } from '@/lib/dates'
import { formatDate, formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CURRENCIES } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Nav } from '@/App'

export function HomeScreen({ nav }: { nav: Nav }) {
  const { state, dispatch } = useStore()
  const { cards, subscriptions, payments } = state
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
        <ScreenHeader title={formatDate(new Date(), 'LLLL')} action={<AddButton label="Yeni ekle" onClick={() => nav.add()} />} />
        <HomeQuickStart nav={nav} />
      </>
    )
  }

  return (
    <>
      <ScreenHeader title={formatDate(new Date(), 'LLLL')} action={<AddButton label="Yeni ekle" onClick={() => nav.add()} />} />
      <div className="grid grid-cols-2 gap-2">
        {/* Bu ayın toplamı */}
        <section className="col-span-2 flex h-32 flex-col rounded-[22px] bg-hero p-3.5 text-hero-fg">
          <div className="label opacity-70">Bu ay ödenecek</div>
          <div className="mt-1 leading-none">
            <Money amount={tryTotal.total} size={42} />
            {others.map((o) => (
              <span key={o.currency} className="num ml-2 text-sm opacity-60">+ {formatMoney(o.total, o.currency)}</span>
            ))}
          </div>
          <div className="mt-auto">
            <ShareBar subscriptions={subscriptions} />
            <div className="mt-1.5 text-[11px] opacity-70">{formatMoney(tryTotal.paid)} ödendi</div>
          </div>
        </section>

        {/* Sıradaki ödeme: kemer biçimli sarı kutu */}
        {first ? (
          <button
            onClick={() => nav.openSubscription(first.s.id)}
            className="pressable row-span-2 flex h-[248px] flex-col items-center rounded-[110px_110px_22px_22px] bg-bh-yellow px-3 pt-7 pb-3 text-center text-[#141414]"
          >
            <span className="label">Sıradaki</span>
            <Logo serviceKey={first.s.serviceKey} name={first.s.name} size={52} className="my-3" />
            <span className="w-full truncate font-medium">{first.s.name}</span>
            <span className="mt-auto leading-none">
              <BigDays date={first.date} />
            </span>
            <span className="num mt-1 text-sm">{formatMoney(first.s.amount, first.s.currency)}</span>
          </button>
        ) : (
          <div className="row-span-2 flex h-[248px] items-center justify-center rounded-[110px_110px_22px_22px] bg-bh-yellow/30 p-4 text-center text-sm text-subtle">
            Abonelik eklediğinde sıradaki ödeme burada görünür.
          </div>
        )}

        {second ? (
          <button onClick={() => nav.openSubscription(second.s.id)} className="pressable flex h-[120px] flex-col rounded-[22px] bg-surface p-3 text-left">
            <div className="flex items-start justify-between">
              <Logo serviceKey={second.s.serviceKey} name={second.s.name} size={30} />
              <span className="label text-subtle">{dueLabel(second.date)}</span>
            </div>
            <span className="mt-auto truncate font-medium">{second.s.name}</span>
            <span className="num text-[17px]">{formatMoney(second.s.amount, second.s.currency)}</span>
          </button>
        ) : (
          <button onClick={() => nav.add()} className="pressable flex h-[120px] items-center justify-center rounded-[22px] bg-surface text-sm text-subtle">
            + Abonelik ekle
          </button>
        )}

        {nextCard ? (
          <button onClick={() => nav.openCard(nextCard.c.id)} className="pressable relative flex h-[120px] flex-col overflow-hidden rounded-[22px] bg-bh-red p-3 text-left text-white">
            <span aria-hidden className="absolute -right-7 -bottom-7 size-[84px] rounded-full bg-black/20" />
            <span className="label truncate opacity-90">{nextCard.c.bankName}</span>
            <span className="mt-auto leading-none"><BigDays date={nextCard.date} small /></span>
            <span className="text-[11px] opacity-85">son ödeme</span>
          </button>
        ) : (
          <button onClick={() => nav.addCard()} className="pressable flex h-[120px] items-center justify-center rounded-[22px] bg-surface text-sm text-subtle">
            + Kart ekle
          </button>
        )}
      </div>

      {/* Bu ayın bütün ödemeleri; soldaki yuvarlak "ödendi" işareti */}
      <h2 className="label mt-5 mb-2 px-1 text-subtle">{formatDate(new Date(), 'LLLL')} ödemeleri</h2>
      <ul className="grid gap-1.5">
        {items.map((i) => {
          const key = `${i.kind}-${i.kind === 'card' ? i.card.id : i.subscription.id}-${i.date.getTime()}`
          const past = daysUntil(i.date) < 0
          return (
            <li key={key} className={cn('flex items-center gap-3 rounded-[18px] bg-surface py-2 pr-3 pl-1.5', i.paid && 'opacity-50')}>
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
                  <span aria-hidden className="size-[30px] shrink-0 rounded-[15px_15px_5px_5px]" style={{ background: i.card.color }} />
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
    </>
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
