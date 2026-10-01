import { CreditCardIcon, RepeatIcon } from 'lucide-react'
import { DueBadge } from '@/components/DueBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { monthlyCost, upcomingPayments } from '@/lib/dates'
import { formatMoney, formatShortDate } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CURRENCIES } from '@/lib/types'

export function HomeScreen() {
  const { state } = useStore()
  const upcoming = upcomingPayments(state.cards, state.subscriptions, 30)

  // Farklı para birimlerini kur bilgisi olmadan toplayamayız; ayrı ayrı gösteriyoruz.
  const totals = CURRENCIES.map((currency) => ({
    currency,
    total: state.subscriptions.filter((s) => s.currency === currency).reduce((sum, s) => sum + monthlyCost(s), 0),
  })).filter((t) => t.total > 0)

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Aylık abonelik maliyeti</CardTitle>
        </CardHeader>
        <CardContent>
          {totals.length === 0 ? (
            <p className="text-muted-foreground">Henüz abonelik yok.</p>
          ) : (
            <div className="grid gap-1">
              {totals.map((t) => (
                <p key={t.currency} className="text-2xl font-semibold tabular-nums">{formatMoney(t.total, t.currency)}</p>
              ))}
              <p className="text-xs text-muted-foreground">Yıllık abonelikler 12'ye bölünerek eklenir.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Önümüzdeki 30 gün</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground">Yaklaşan ödeme yok.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((p) =>
                p.kind === 'subscription' ? (
                  <li key={`s-${p.subscription.id}`} className="flex items-center gap-3 py-3">
                    <RepeatIcon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.subscription.name}</p>
                      <p className="text-sm text-muted-foreground">{formatShortDate(p.date)} · yenilenme</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium tabular-nums">{formatMoney(p.subscription.amount, p.subscription.currency)}</p>
                      <DueBadge date={p.date} />
                    </div>
                  </li>
                ) : (
                  <li key={`c-${p.card.id}`} className="flex items-center gap-3 py-3">
                    <CreditCardIcon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.card.bankName} •••• {p.card.last4}</p>
                      <p className="text-sm text-muted-foreground">{formatShortDate(p.date)} · son ödeme</p>
                    </div>
                    <DueBadge date={p.date} />
                  </li>
                ),
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
