import { endOfMonth, endOfWeek, startOfDay } from 'date-fns'
import { useState } from 'react'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { SubscriptionQuickStart } from '@/components/QuickStart'
import { ScrollPage } from '@/components/ScrollPage'
import { AddButton, ScreenHeader, SearchBar, SearchButton } from '@/components/ScreenHeader'
import { PinnedLayout } from '@/components/PinnedLayout'
import { ShareBar } from '@/components/ShareBar'
import { SwipeRow } from '@/components/SwipeRow'
import { daysUntil, monthlyCost, nextRenewal } from '@/lib/dates'
import { formatDate, formatMoney } from '@/lib/format'
import { normalize } from '@/lib/services'
import { useStore } from '@/lib/store'
import { useUndoable } from '@/lib/undo'
import { CURRENCIES, type Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Nav } from '@/App'

export function SubscriptionsScreen({ nav }: { nav: Nav }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const { subscriptions, cards, payments } = state
  // null = arama kapalı. Açıkken üstteki toplam kutusu gizlenir, liste ada ve karta göre süzülür.
  const [query, setQuery] = useState<string | null>(null)
  const q = normalize(query ?? '')

  const cardLabel = (s: Subscription) => {
    const c = cards.find((c) => c.id === s.cardId)
    return c ? `${c.bankName} •• ${c.last4}` : 'kart seçilmedi'
  }

  const rows = subscriptions
    .filter((s) => !q || normalize(s.name).includes(q) || normalize(cardLabel(s)).includes(q))
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

  const row = ({ s, next }: (typeof rows)[number]) => {
    const isToday = daysUntil(next) === 0
    return (
      <SwipeRow
        key={s.id}
        onTap={() => nav.openSubscription(s.id)}
        onDelete={() => undoable(`${s.name} silindi`, () => dispatch({ type: 'subscription/delete', id: s.id }))}
      >
        <div className="flex items-center gap-3 py-1.5 pr-3 pl-1.5">
          {/* Takvim yaprağı gibi gün kutusu: açık temada zemin renginde, koyu temada soluk mavi; bugün sarı */}
          <div
            className={cn(
              'flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl',
              isToday ? 'bg-bh-yellow text-[#141414]' : 'bg-page dark:bg-bh-blue/30 dark:text-white',
            )}
          >
            <span className="num num-bold text-lg leading-none">{next.getDate()}</span>
            <span className={cn('label text-[8px]', !isToday && 'text-subtle dark:text-white/75')}>{formatDate(next, 'MMM').toLocaleUpperCase('tr')}</span>
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

  const header = (
    <ScreenHeader
      title="Abonelikler"
      action={
        <div className="flex gap-2">
          {subscriptions.length > 0 && <SearchButton open={query !== null} onClick={() => setQuery(query === null ? '' : null)} />}
          <AddButton label="Abonelik ekle" onClick={() => nav.add()} />
        </div>
      }
    />
  )

  return (
    <>
      {subscriptions.length === 0 ? (
        <ScrollPage>
          {header}
          <SubscriptionQuickStart nav={nav} />
        </ScrollPage>
      ) : (
        <PinnedLayout
          scrollKey="subscriptions"
          pinned={false}
          header={header}
          top={
            query !== null ? (
              <SearchBar value={query} onChange={setQuery} onClose={() => setQuery(null)} placeholder="Abonelik ya da kart ara" />
            ) : (
              /* Koyu temada beyaz kart: siyah zeminde öne çıksın */
              <section className="rounded-[22px] bg-surface p-3.5 dark:bg-[#F2F2F2] dark:text-[#141414]">
                <div className="flex justify-between text-subtle dark:text-[#141414]/60">
                  <span className="label">Aylık toplam</span>
                  <span className="label">{subscriptions.length} abonelik</span>
                </div>
                <div className="mt-0.5 leading-none">
                  <Money amount={totals[0].total} size={34} />
                  {totals.slice(1).filter((t) => t.total > 0).map((t) => (
                    <span key={t.currency} className="ml-2" style={{ fontSize: 34 }}>
                      <span className="num">+ </span>
                      <Money amount={t.total} currency={t.currency} size={34} />
                    </span>
                  ))}
                </div>
                <div className="mt-3"><ShareBar subscriptions={subscriptions} height={10} /></div>
              </section>
            )
          }
        >
          {q && groups.length === 0 && <p className="mt-6 text-center text-sm text-subtle">“{query?.trim()}” için sonuç yok</p>}
          {groups.map((g, i) => (
            <section key={g.title}>
              <h2 className={cn('label mb-1 px-1 text-subtle', i > 0 && 'mt-2')}>{g.title}</h2>
              <div className="grid gap-1.5">{g.list.map(row)}</div>
            </section>
          ))}
        </PinnedLayout>
      )}
    </>
  )
}
