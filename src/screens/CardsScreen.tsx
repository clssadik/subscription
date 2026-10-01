import { CheckCircle2Icon, PencilIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { EmptyState, ScreenHeader } from '@/components/ScreenHeader'
import { BigDays } from '@/screens/HomeScreen'
import { NETWORKS } from '@/lib/banks'
import { monthlyCost, nextCardDue, toKey } from '@/lib/dates'
import { dayOf, formatDate, formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { CreditCard } from '@/lib/types'
import type { Nav } from '@/App'

export function CardsScreen({ nav, selectedId, onSelect }: { nav: Nav; selectedId: string | null; onSelect: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const { cards, subscriptions, payments } = state

  if (cards.length === 0) {
    return (
      <>
        <ScreenHeader title="Kartlar" />
        <EmptyState
          title="Kart ekle"
          text="Sadece banka adı ve son 4 hane. Son ödeme günü yaklaşınca burada ve özet ekranında görünür."
          action={<button onClick={nav.addCard} className="pressable min-h-11 rounded-full bg-ink px-5 text-page">Kart ekle</button>}
        />
      </>
    )
  }

  // Seçili kart en altta, açık hâlde; diğerleri üstte cüzdan gibi üst üste
  const selected = cards.find((c) => c.id === selectedId) ?? cards[0]
  const stack = cards.filter((c) => c.id !== selected.id)
  const due = nextCardDue(selected, payments)
  const onCard = subscriptions.filter((s) => s.cardId === selected.id)
  const monthlyTry = onCard.filter((s) => s.currency === 'TRY').reduce((sum, s) => sum + monthlyCost(s), 0)

  function markPaid() {
    const dueDate = toKey(due)
    dispatch({ type: 'payment/toggle', kind: 'card', refId: selected.id, dueDate })
    toast(`${selected.bankName} ${formatDate(due, 'LLLL')} ödemesi işaretlendi`, {
      action: { label: 'Geri al', onClick: () => dispatch({ type: 'payment/toggle', kind: 'card', refId: selected.id, dueDate }) },
    })
  }

  return (
    <>
      <ScreenHeader title="Kartlar" />
      <div>
        {stack.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="pressable -mb-3.5 flex h-[60px] w-full items-start justify-between rounded-[20px] px-3.5 pt-3 text-white"
            style={{ background: c.color }}
          >
            <span className="font-label text-sm font-medium">{c.bankName}</span>
            <span className="num text-xs opacity-85">•• {c.last4}</span>
          </button>
        ))}
        <BigCard card={selected} onEdit={() => nav.edit({ kind: 'card', id: selected.id })} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="flex h-[108px] flex-col rounded-[22px_52px_22px_22px] bg-bh-red p-3 text-white">
          <span className="label opacity-85">Son ödeme</span>
          <span className="mt-auto leading-none"><BigDays date={due} small /></span>
          <span className="text-[11px] opacity-80">{formatDate(due, 'd MMMM EEEE')}</span>
        </div>
        <div className="flex h-[108px] flex-col rounded-[22px] bg-surface p-3">
          <span className="label text-subtle">Bu karttan</span>
          <span className="num mt-auto text-xl">{formatMoney(monthlyTry)}</span>
          <div className="mt-1 flex">
            {onCard.slice(0, 5).map((s, i) => (
              <span key={s.id} className="rounded-[9px] border-2 border-surface" style={{ marginLeft: i ? -6 : 0 }}>
                <Logo serviceKey={s.serviceKey} name={s.name} size={20} />
              </span>
            ))}
            {onCard.length === 0 && <span className="text-[11px] text-subtle">abonelik yok</span>}
          </div>
        </div>
      </div>

      <button onClick={markPaid} className="pressable mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-ink font-semibold text-page">
        <CheckCircle2Icon className="size-[18px] text-bh-yellow" />
        {formatDate(due, 'LLLL')} ekstresi ödendi
      </button>

      {onCard.length > 0 && (
        <>
          <h2 className="label mt-5 mb-2 px-1 text-subtle">Bu karttan çekilenler</h2>
          <ul className="grid gap-1.5">
            {onCard.map((s) => (
              <li key={s.id}>
                <button onClick={() => nav.openSubscription(s.id)} className="flex w-full items-center gap-3 rounded-[18px] bg-surface px-3 py-2.5 text-left">
                  <Logo serviceKey={s.serviceKey} name={s.name} size={30} />
                  <span className="flex-1 truncate font-medium">{s.name}</span>
                  <span className="num text-[15px]">{formatMoney(s.amount, s.currency)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function BigCard({ card, onEdit }: { card: CreditCard; onEdit: () => void }) {
  const network = NETWORKS.find((n) => n.key === card.network)
  return (
    <div className="relative flex h-[168px] flex-col overflow-hidden rounded-[20px] px-3.5 py-3 text-white" style={{ background: card.color }}>
      <span aria-hidden className="absolute -right-10 -bottom-10 size-[130px] rounded-full bg-black/18" />
      <span aria-hidden className="absolute -top-[30px] right-[60px] size-[60px] rotate-90 rounded-br-full bg-bh-yellow/90" />
      <div className="relative flex items-start justify-between">
        <span className="font-label text-[15px] font-medium">{card.bankName}</span>
        <div className="flex items-center gap-1">
          {network &&
            (network.path ? (
              <svg viewBox="0 0 24 24" className="size-8" fill="currentColor" aria-label={network.label}><path d={network.path} /></svg>
            ) : (
              <span className="text-[13px] italic">{network.label}</span>
            ))}
          <button onClick={onEdit} aria-label="Kartı düzenle" className="-mr-2 flex size-10 items-center justify-center">
            <PencilIcon className="size-4" />
          </button>
        </div>
      </div>
      <div className="num relative mt-auto text-base tracking-[0.15em]">•••• {card.last4}</div>
      <div className="relative mt-1 flex justify-between text-[11px] opacity-85">
        <span>Kesim {dayOf(card.statementDay)} · Son ödeme {dayOf(card.dueDay)}</span>
        {card.limit > 0 && <span>{formatMoney(card.limit).replace(/,00$/, '')}</span>}
      </div>
    </div>
  )
}
