import { addMonths, format, parseISO, startOfMonth } from 'date-fns'
import { CheckIcon, Undo2Icon } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { PinnedLayout } from '@/components/PinnedLayout'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SearchButton, SearchSwap } from '@/components/Search'
import { SwipeRow } from '@/components/SwipeRow'
import { formatDate, formatMoney } from '@/lib/format'
import { CURRENCIES, type Currency } from '@/lib/types'
import { normalize } from '@/lib/services'
import { useStore } from '@/lib/store'
import { useSearch } from '@/lib/useSearch'
import { BankMark } from '@/components/BankMark'
import { useUndoable } from '@/lib/undo'
import { cn } from '@/lib/utils'
import type { Nav } from '@/App'

/** Metin, aramanın (normalize edilmiş) bir kelimesinin başıyla başlıyor mu: "mu" hem "Apple Music" hem "Music" için tutar */
function startsWord(text: string | undefined, q: string) {
  const words = (text ?? '').split(/\s+/).map(normalize).filter(Boolean)
  return words.some((_, i) => words.slice(i).join('').startsWith(q))
}

export function HistoryScreen({ nav }: { nav: Nav }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const { payments, subscriptions, cards } = state
  // Arama açıkken üstteki grafik kapanır; liste abonelik adına ya da o aboneliğin kartının banka adına göre süzülür
  const search = useSearch()
  const { q } = search
  const matches = (p: (typeof payments)[number]) => {
    if (p.kind === 'card') return startsWord(cards.find((x) => x.id === p.refId)?.bankName, q)
    const s = subscriptions.find((x) => x.id === p.refId)
    return startsWord(s?.name, q) || startsWord(cards.find((c) => c.id === s?.cardId)?.bankName, q)
  }

  // Sola kaydırıp "Kaldır": ödendi işareti kalkar, ödeme yeniden bekleyen olur. Mesajdaki "Geri al" geri getirir.
  const unmark = (p: (typeof payments)[number], name: string) =>
    undoable(`${name} ödemesi kaldırıldı`, () => dispatch({ type: 'payment/remove', id: p.id }), [p.id])

  // Son 6 ayda ödendi işaretlenen abonelik tutarları, para birimi bazında. Kart ekstreleri tutarsız tutulduğu için dahil değil.
  const thisMonth = startOfMonth(new Date())
  const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth, i - 5))
  // Para birimi eklenmeden önce kaydedilen ödemeler aboneliğin şimdiki birimiyle sayılır (abonelik silinmişse TL)
  const currencyOf = (p: (typeof payments)[number]) => p.currency ?? subscriptions.find((s) => s.id === p.refId)?.currency ?? 'TRY'
  const paidIn = (m: Date, currency: Currency) => {
    const key = format(m, 'yyyy-MM')
    return payments
      .filter((p) => p.kind === 'subscription' && currencyOf(p) === currency && p.dueDate.startsWith(key))
      .reduce((s, p) => s + (p.amount ?? 0), 0)
  }
  const sums = months.map((m) => paidIn(m, 'TRY'))
  // Kur bilgisi olmadığı için yabancı para TL ile toplanmaz; ayrı gösterilir.
  const foreign = CURRENCIES.filter((c) => c !== 'TRY').map((currency) => ({
    currency,
    sums: months.map((m) => paidIn(m, currency)),
  }))
  const current = sums[5]
  const prev = sums[4]
  const max = Math.max(...sums, 1)
  // Grafik ekran okuyucuya da değerleriyle okunur: ay adı ve tutar
  const chartText = months.map((m, i) => `${formatDate(m, 'LLLL')} ${formatMoney(sums[i])}`).join(', ')
  const paidThisMonth = foreign.filter((f) => f.sums[5] > 0)
  const paidLastMonth = [
    ...(prev > 0 ? [formatMoney(prev)] : []),
    ...foreign.filter((f) => f.sums[4] > 0).map((f) => formatMoney(f.sums[4], f.currency)),
  ]

  // Ay ay gruplanmış liste, yeniden eskiye
  const sorted = payments.filter((p) => !q || matches(p)).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  const groups = new Map<string, typeof sorted>()
  for (const p of sorted) {
    const k = p.dueDate.slice(0, 7)
    groups.set(k, [...(groups.get(k) ?? []), p])
  }

  return (
    <>
      <PinnedLayout
        scrollKey="history"
        pinned={false}
        header={
          <ScreenHeader
            title="Geçmiş"
            action={payments.length > 0 && <SearchButton search={search} />}
          />
        }
        top={
          <SearchSwap search={search} placeholder="Abonelik ya da banka ara">
            <section className="flex h-[176px] flex-col rounded-[22px] bg-hero p-3.5 text-hero-fg">
              <div className="flex justify-between gap-2">
                <span className="label opacity-70">{formatDate(thisMonth, 'LLLL')} ayında ödenen</span>
                {paidLastMonth.length > 0 && (
                  <span className="label text-right opacity-70">geçen ay {paidLastMonth.join(' + ')}</span>
                )}
              </div>
              <div className="mt-1 leading-none">
                <Money amount={current} size={32} />
                {paidThisMonth.map((f) => (
                  <span key={f.currency} className="ml-2" style={{ fontSize: 32 }}>
                    <span className="num">+ </span>
                    <Money amount={f.sums[5]} currency={f.currency} size={32} />
                  </span>
                ))}
              </div>
              <div className="mt-auto flex h-[70px] items-end gap-2" role="img" aria-label={`Son 6 ayda ödenen TL abonelik tutarları: ${chartText}`}>
                {months.map((m, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div
                      className={cn(i === 5 ? 'rounded-[14px_14px_4px_4px] bg-bh-yellow' : 'rounded bg-white/20')}
                      style={{ height: Math.max(3, (sums[i] / max) * 52) }}
                    />
                    <div className="mt-1 text-[10px] opacity-70">{formatDate(m, 'LLL')}</div>
                  </div>
                ))}
              </div>
            </section>
          </SearchSwap>
        }
      >
        {q && groups.size === 0 && <p className="mt-6 text-center text-sm text-subtle">“{search.query?.trim()}” için sonuç yok</p>}
        {/* Henüz hiçbir şey ödendi işaretlenmemişse */}
        {payments.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-[22px] bg-surface px-6 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-bh-green/15 text-bh-green">
              <CheckIcon className="size-6" strokeWidth={2.2} />
            </span>
            <p className="mt-3 font-medium">Henüz ödeme yok.</p>
          </div>
        )}
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
                    <li key={p.id}>
                      <SwipeRow
                        actionLabel="Kaldır"
                        actionIcon={Undo2Icon}
                        onTap={s ? () => nav.openSubscription(s.id) : undefined}
                        onDelete={() => unmark(p, s?.name ?? 'Abonelik')}
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <Logo serviceKey={s?.serviceKey ?? null} name={s?.name ?? '?'} size={30} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{s?.name ?? 'Silinmiş abonelik'}</span>
                            <span className="block text-[11px] text-subtle">{date}{card ? ` · ${card.bankName}` : ''}</span>
                          </span>
                          <span className="num text-[15px]">{p.amount != null ? formatMoney(p.amount, currencyOf(p)) : ''}</span>
                        </div>
                      </SwipeRow>
                    </li>
                  )
                }
                const c = cards.find((x) => x.id === p.refId)
                return (
                  <li key={p.id}>
                    <SwipeRow
                      actionLabel="Kaldır"
                      actionIcon={Undo2Icon}
                      onTap={c ? () => nav.openCard(c.id) : undefined}
                      onDelete={() => unmark(p, c ? `${c.bankName} ekstre` : 'Ekstre')}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <BankMark bankName={c?.bankName ?? '?'} color={c?.color ?? '#888'} size={30} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{c ? `${c.bankName} ekstresi` : 'Silinmiş kart'}</span>
                          <span className="block text-[11px] text-subtle">{date} · son ödeme</span>
                        </span>
                        {c && <span className="num text-[15px]">•• {c.last4}</span>}
                      </div>
                    </SwipeRow>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </PinnedLayout>
    </>
  )
}
