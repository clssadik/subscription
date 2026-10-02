import { CheckCircle2Icon, ChevronLeftIcon, PencilIcon } from 'lucide-react'
import { addMonths } from 'date-fns'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { RoundButton } from '@/components/ScreenHeader'
import { daysUntil, hasDue, monthlyCost, nextCardDue, toKey } from '@/lib/dates'
import { dayOf, formatDate, formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Nav } from '@/App'

export function CardDetail({ id, nav, onBack }: { id: string; nav: Nav; onBack: () => void }) {
  const { state, dispatch } = useStore()
  const card = state.cards.find((c) => c.id === id)
  if (!card) return null

  // Banka kartında son ödeme yok
  const due = hasDue(card) ? nextCardDue(card, state.payments) : null
  const onCard = state.subscriptions.filter((s) => s.cardId === card.id)
  const monthlyTry = onCard.filter((s) => s.currency === 'TRY').reduce((sum, s) => sum + monthlyCost(s), 0)

  function markPaid() {
    if (!due) return
    const dueDate = toKey(due)
    dispatch({ type: 'payment/toggle', kind: 'card', refId: card!.id, dueDate })
    toast(`${card!.bankName} ${formatDate(due, 'LLLL')} ödemesi işaretlendi`, {
      action: { label: 'Geri al', onClick: () => dispatch({ type: 'payment/toggle', kind: 'card', refId: card!.id, dueDate }) },
    })
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <RoundButton label="Geri" onClick={onBack}><ChevronLeftIcon className="size-5" /></RoundButton>
        <span className="label text-subtle">Kart</span>
        <RoundButton label="Düzenle" onClick={() => nav.edit({ kind: 'card', id: card.id })}><PencilIcon className="size-[18px]" /></RoundButton>
      </div>

      <div className="flex items-center gap-2.5 px-1">
        <span aria-hidden className="size-9 shrink-0 rounded-[18px_18px_6px_6px] ring-1 ring-line ring-inset" style={{ background: card.color }} />
        <div className="min-w-0">
          <h1 className="num num-bold truncate text-xl leading-tight">{card.bankName}</h1>
          <p className="text-xs text-subtle">•••• {card.last4}</p>
        </div>
      </div>

      <Gauge color={card.color} due={due} />

      <div className="mt-2 grid grid-cols-2 gap-2">
        {hasDue(card) && card.statementDay && <Stat label="Kesim" value={dayOf(card.statementDay)} />}
        <Stat
          label="Bu karttan"
          value={formatMoney(monthlyTry)}
          sub={`${onCard.length} abonelik`}
          className={hasDue(card) && card.statementDay ? undefined : 'col-span-2'}
        />
      </div>

      {due && (
        <button onClick={markPaid} className="pressable mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-ink font-semibold text-page">
          <CheckCircle2Icon className="size-[18px] text-bh-yellow" />
          {formatDate(due, 'LLLL')} ekstresi ödendi
        </button>
      )}

      {onCard.length > 0 && (
        <>
          <h2 className="label mt-5 mb-2 px-1 text-subtle">Bu karttan çekilenler</h2>
          <ul className="grid gap-1.5">
            {onCard.map((s) => (
              <li key={s.id}>
                <button onClick={() => nav.openSubscription(s.id)} className="pressable flex w-full items-center gap-3 rounded-[18px] bg-surface px-3 py-2.5 text-left">
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

/**
 * Yarım daire gösterge: önceki son ödemeden sonrakine ne kadar yol kaldığı.
 * Dolu kısım banka renginde; uçtaki sarı nokta bugünü gösterir.
 */
function Gauge({ color, due }: { color: string; due: Date | null }) {
  const W = 276
  const R = 112
  const cx = W / 2
  const cy = 140
  const arc = (p: number) => `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx - R * Math.cos(Math.PI * p)} ${cy - R * Math.sin(Math.PI * p)}`

  const left = due ? daysUntil(due) : 0
  // Döngü uzunluğu: önceki ayın son ödeme gününden bu son ödemeye kadar geçen gün
  const total = due ? Math.max(1, daysUntil(due, addMonths(due, -1))) : 1
  const progress = due ? Math.min(1, Math.max(0, (total - left) / total)) : 0

  const end = { x: cx - R * Math.cos(Math.PI * progress), y: cy - R * Math.sin(Math.PI * progress) }

  return (
    <div className="relative mt-3">
      <svg viewBox={`0 0 ${W} 150`} className="w-full" role="img" aria-label={due ? `Son ödemeye ${left} gün kaldı` : 'Banka kartı'}>
        <path d={arc(1)} fill="none" stroke="var(--line)" strokeWidth={22} />
        {progress > 0.01 && <path d={arc(progress)} fill="none" stroke={color} strokeWidth={22} />}
        {due && <circle cx={end.x} cy={end.y} r={9} className="fill-bh-yellow" />}
      </svg>
      <div className="absolute inset-x-0 bottom-1.5 text-center">
        {due ? (
          <>
            {left === 0 ? (
              <span className="num num-bold text-[40px] leading-none">Bugün</span>
            ) : (
              <>
                <span className="num num-bold text-[54px] leading-none tracking-[-0.04em]">{left}</span>
                <span className="text-[15px]"> gün</span>
              </>
            )}
            <div className="mt-0.5 text-xs text-subtle">{formatDate(due, 'd MMMM EEEE')} · son ödeme</div>
          </>
        ) : (
          <>
            <span className="font-label text-2xl font-medium">Banka kartı</span>
            <div className="mt-0.5 text-xs text-subtle">son ödeme yok</div>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className={cn('flex h-[76px] flex-col rounded-[20px] bg-surface p-3', className)}>
      <span className="label text-subtle">{label}</span>
      <span className="num mt-auto text-xl">{value}</span>
      {sub && <span className="text-[11px] text-subtle">{sub}</span>}
    </div>
  )
}
