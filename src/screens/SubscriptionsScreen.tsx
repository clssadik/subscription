import { endOfMonth, endOfWeek, startOfDay } from 'date-fns'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { SubscriptionQuickStart } from '@/components/QuickStart'
import { AddButton, ScreenHeader } from '@/components/ScreenHeader'
import { ShareBar } from '@/components/ShareBar'
import { SwipeRow } from '@/components/SwipeRow'
import { daysUntil, monthlyCost, nextRenewal } from '@/lib/dates'
import { formatDate, formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import { useUndoable } from '@/lib/undo'
import { CURRENCIES, type Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Nav } from '@/App'

export function SubscriptionsScreen({ nav }: { nav: Nav }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const { subscriptions, cards, payments } = state

  const rows = subscriptions
    .map((s) => ({ s, next: nextRenewal(s, payments) }))
    .sort((a, b) => a.next.getTime() - b.next.getTime())

  // Yaklaşan ödemeye göre üç grup
  const today = startOfDay(new Date())
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const monthEnd = endOfMonth(today)
  const groups = [
    { title: 'Bu hafta', list: rows.filter((r) => r.next <= weekEnd) },
    { title: 'Bu ay', list: rows.filter((r) => r.next > weekEnd && r.next <= monthEnd) },
    { title: 'Sonra', list: rows.filter((r) => r.next > monthEnd) },
  ].filter((g) => g.list.length > 0)

  const totals = CURRENCIES.map((c) => ({
    currency: c,
    total: subscriptions.filter((s) => s.currency === c).reduce((sum, s) => sum + monthlyCost(s), 0),
  }))

  const cardLabel = (s: Subscription) => {
    const c = cards.find((c) => c.id === s.cardId)
    return c ? `${c.bankName} •• ${c.last4}` : 'kart seçilmedi'
  }

  const row = ({ s, next }: (typeof rows)[number]) => {
    const isToday = daysUntil(next) === 0
    return (
      <SwipeRow
        key={s.id}
        onTap={() => nav.openSubscription(s.id)}
        onDelete={() => undoable(`${s.name} silindi`, () => dispatch({ type: 'subscription/delete', id: s.id }))}
      >
        <div className="flex items-center gap-3 py-1.5 pr-3 pl-1.5">
          {/* Takvim yaprağı gibi gün kutusu: soluk mavi, bugün sarı */}
          <div
            className={cn(
              'flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl',
              isToday ? 'bg-bh-yellow text-[#141414]' : 'bg-bh-blue/10 text-bh-blue dark:bg-bh-blue/30 dark:text-white',
            )}
          >
            <span className="num num-bold text-lg leading-none">{next.getDate()}</span>
            <span className={cn('label text-[8px]', !isToday && 'opacity-75')}>{formatDate(next, 'MMM').toLocaleUpperCase('tr')}</span>
          </div>
          <Logo serviceKey={s.serviceKey} name={s.name} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{s.name}</div>
            <div className="truncate text-[11px] text-subtle">{cardLabel(s)}{s.cycle === 'yearly' ? ' · yıllık' : ''}</div>
          </div>
          <span className="num text-[15px]">{formatMoney(s.amount, s.currency)}</span>
        </div>
      </SwipeRow>
    )
  }

  return (
    <>
      <ScreenHeader title="Abonelikler" action={<AddButton label="Abonelik ekle" onClick={() => nav.add()} />} />
      {subscriptions.length === 0 ? (
        <SubscriptionQuickStart nav={nav} />
      ) : (
        <>
          <section className="mb-2 rounded-[22px] bg-surface p-3.5">
            <div className="flex justify-between text-subtle">
              <span className="label">Aylık toplam</span>
              <span className="label">{subscriptions.length} abonelik</span>
            </div>
            <div className="mt-0.5 leading-none">
              <Money amount={totals[0].total} size={34} />
              {totals.slice(1).filter((t) => t.total > 0).map((t) => (
                <span key={t.currency} className="num ml-2 text-sm text-subtle">+ {formatMoney(t.total, t.currency)}</span>
              ))}
            </div>
            <div className="mt-3"><ShareBar subscriptions={subscriptions} height={10} /></div>
          </section>

          {/* Liste kendi içinde kaydırılır; üstteki toplam kartı yerinde kalır. Alan cam menünün arkasına kadar uzanır. */}
          <div className="-mb-24 min-h-48 flex-1 overflow-y-auto overscroll-contain pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map((g) => (
              <section key={g.title}>
                <h2 className="label mt-4 mb-1 px-1 text-subtle">{g.title}</h2>
                <div className="grid gap-1.5">{g.list.map(row)}</div>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  )
}
