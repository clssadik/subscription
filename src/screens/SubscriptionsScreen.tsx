import { useState } from 'react'
import { Segmented } from '@/components/FormBits'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { EmptyState, ScreenHeader } from '@/components/ScreenHeader'
import { ShareBar } from '@/components/ShareBar'
import { SwipeRow } from '@/components/SwipeRow'
import { daysUntil, dueLabel, monthlyCost, nextRenewal } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import { useUndoable } from '@/lib/undo'
import { CURRENCIES, type Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Nav } from '@/App'

type Sort = 'date' | 'amount' | 'card'

export function SubscriptionsScreen({ nav }: { nav: Nav }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const [sort, setSort] = useState<Sort>('date')
  const { subscriptions, cards, payments } = state

  const rows = subscriptions.map((s) => ({ s, next: nextRenewal(s, payments) }))
  if (sort === 'date') rows.sort((a, b) => a.next.getTime() - b.next.getTime())
  if (sort === 'amount') rows.sort((a, b) => monthlyCost(b.s) - monthlyCost(a.s))

  const totals = CURRENCIES.map((c) => ({
    currency: c,
    total: subscriptions.filter((s) => s.currency === c).reduce((sum, s) => sum + monthlyCost(s), 0),
  }))

  const cardLabel = (s: Subscription) => {
    const c = cards.find((c) => c.id === s.cardId)
    return c ? `${c.bankName} •• ${c.last4}` : 'kart seçilmedi'
  }

  const row = ({ s, next }: (typeof rows)[number]) => (
    <SwipeRow
      key={s.id}
      onTap={() => nav.openSubscription(s.id)}
      onDelete={() => undoable(`${s.name} silindi`, () => dispatch({ type: 'subscription/delete', id: s.id }))}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Logo serviceKey={s.serviceKey} name={s.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{s.name}</div>
          <div className="truncate text-[11px] text-subtle">{cardLabel(s)}{s.cycle === 'yearly' ? ' · yıllık' : ''}</div>
        </div>
        <div className="text-right">
          <div className="num text-[15px]">{formatMoney(s.amount, s.currency)}</div>
          <div className={cn('label', daysUntil(next) <= 1 ? 'font-semibold text-bh-red' : 'text-subtle')}>{dueLabel(next)}</div>
        </div>
      </div>
    </SwipeRow>
  )

  return (
    <>
      <ScreenHeader title="Abonelikler" />
      {subscriptions.length === 0 ? (
        <EmptyState
          title="Abonelik yok"
          text="Netflix, Spotify, iCloud… Ekledikçe aylık toplamın burada oluşur."
          action={<button onClick={nav.add} className="pressable min-h-11 rounded-full bg-ink px-5 text-page">Abonelik ekle</button>}
        />
      ) : (
        <>
          <section className="mb-2 flex h-[108px] flex-col rounded-[22px] bg-hero p-3.5 text-hero-fg">
            <div className="flex justify-between opacity-70">
              <span className="label">Aylık toplam</span>
              <span className="label">{subscriptions.length} abonelik</span>
            </div>
            <div className="mt-1 leading-none">
              <Money amount={totals[0].total} size={34} />
              {totals.slice(1).filter((t) => t.total > 0).map((t) => (
                <span key={t.currency} className="num ml-2 text-sm opacity-60">+ {formatMoney(t.total, t.currency)}</span>
              ))}
            </div>
            <div className="mt-auto"><ShareBar subscriptions={subscriptions} height={7} /></div>
          </section>

          <Segmented
            className="mb-2 bg-surface"
            value={sort}
            onChange={setSort}
            options={[{ value: 'date', label: 'Tarihe göre' }, { value: 'amount', label: 'Tutara göre' }, { value: 'card', label: 'Karta göre' }]}
          />

          {sort === 'card' ? (
            [...cards.map((c) => ({ id: c.id, title: `${c.bankName} •• ${c.last4}`, color: c.color })), { id: null, title: 'Kart seçilmedi', color: 'transparent' }].map((g) => {
              const list = rows.filter((r) => r.s.cardId === g.id)
              if (list.length === 0) return null
              return (
                <section key={g.id ?? 'none'} className="mb-3">
                  <h2 className="label mb-1.5 flex items-center gap-2 px-1 text-subtle">
                    <span className="size-2.5 rounded-full" style={{ background: g.color }} />
                    {g.title}
                  </h2>
                  <div className="grid gap-1.5">{list.map(row)}</div>
                </section>
              )
            })
          ) : (
            <div className="grid gap-1.5">{rows.map(row)}</div>
          )}
          <p className="mt-3 text-center text-[11px] text-subtle">Silmek için satırı sola kaydır</p>
        </>
      )}
    </>
  )
}
