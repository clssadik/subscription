import { addMonths, format, parseISO, startOfMonth } from 'date-fns'
import { CheckIcon } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { ScreenHeader } from '@/components/ScreenHeader'
import { formatDate, formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import { BankMark } from '@/components/BankMark'
import { cn } from '@/lib/utils'

export function HistoryScreen() {
  const { state } = useStore()
  const { payments, subscriptions, cards } = state

  // Son 6 ayda ödendi işaretlenen abonelik tutarları (TL). Kart ekstreleri tutarsız tutulduğu için dahil değil.
  const thisMonth = startOfMonth(new Date())
  const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth, i - 5))
  const sums = months.map((m) => {
    const key = format(m, 'yyyy-MM')
    return payments
      .filter((p) => p.kind === 'subscription' && p.currency === 'TRY' && p.dueDate.startsWith(key))
      .reduce((s, p) => s + (p.amount ?? 0), 0)
  })
  const current = sums[5]
  const prev = sums[4]
  const max = Math.max(...sums, 1)

  // Ay ay gruplanmış liste, yeniden eskiye
  const sorted = [...payments].sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  const groups = new Map<string, typeof sorted>()
  for (const p of sorted) {
    const k = p.dueDate.slice(0, 7)
    groups.set(k, [...(groups.get(k) ?? []), p])
  }

  return (
    <>
      <ScreenHeader title="Geçmiş" />
      <section className="mb-2 flex h-[176px] flex-col rounded-[22px] bg-hero p-3.5 text-hero-fg">
        <div className="flex justify-between">
          <span className="label opacity-70">{formatDate(thisMonth, 'LLLL')} ayında ödenen</span>
          {prev > 0 && <span className="label opacity-70">geçen ay {formatMoney(prev)}</span>}
        </div>
        <div className="mt-1 leading-none"><Money amount={current} size={32} /></div>
        <div className="mt-auto flex h-[70px] items-end gap-2" role="img" aria-label="Son 6 ayda ödenen abonelik tutarları">
          {months.map((m, i) => (
            <div key={i} className="flex-1 text-center">
              <div
                className={cn(i === 5 ? 'rounded-[14px_14px_4px_4px] bg-bh-yellow' : 'rounded bg-white/20')}
                style={{ height: Math.max(3, (sums[i] / max) * 52) }}
              />
              <div className="mt-1 text-[9px] opacity-70">{formatDate(m, 'LLL')}</div>
            </div>
          ))}
        </div>
      </section>


      {[...groups.entries()].map(([month, list]) => (
        <section key={month} className="mb-3">
          <h2 className="label mt-4 mb-1.5 px-1 text-subtle">{formatDate(parseISO(`${month}-01`), 'LLLL yyyy')}</h2>
          <ul className="grid gap-1.5">
            {list.map((p) => {
              const date = formatDate(parseISO(p.dueDate), 'd MMMM')
              if (p.kind === 'subscription') {
                const s = subscriptions.find((x) => x.id === p.refId)
                const card = cards.find((c) => c.id === s?.cardId)
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-[18px] bg-surface px-3 py-2.5">
                    <Logo serviceKey={s?.serviceKey ?? null} name={s?.name ?? '?'} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s?.name ?? 'Silinmiş abonelik'}</span>
                      <span className="block text-[11px] text-subtle">{date}{card ? ` · ${card.bankName}` : ''}</span>
                    </span>
                    <span className="num text-[15px]">{p.amount != null ? formatMoney(p.amount, p.currency) : ''}</span>
                  </li>
                )
              }
              const c = cards.find((x) => x.id === p.refId)
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-[18px] bg-surface px-3 py-2.5">
                  <BankMark bankName={c?.bankName ?? '?'} color={c?.color ?? '#888'} size={30} className="rounded-[15px_15px_5px_5px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c ? `${c.bankName} ekstresi` : 'Kart ekstresi'}</span>
                    <span className="block text-[11px] text-subtle">{date} · son ödeme</span>
                  </span>
                  <span className="flex items-center gap-1 text-[13px] text-bh-green"><CheckIcon className="size-4" />ödendi</span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </>
  )
}
