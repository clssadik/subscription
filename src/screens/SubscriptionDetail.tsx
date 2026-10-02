import { CheckCircle2Icon, ChevronLeftIcon, PencilIcon } from 'lucide-react'
import { parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { PaidNote } from '@/components/PaidNote'
import { RoundButton } from '@/components/ScreenHeader'
import { canMarkPaid, daysUntil, dueLabel, nextRenewal, paidThisMonth, toKey } from '@/lib/dates'
import { dayOf, formatDate, formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CYCLE_LABELS } from '@/lib/types'
import type { Nav } from '@/App'

export function SubscriptionDetail({ id, nav }: { id: string; nav: Nav }) {
  const { state, dispatch } = useStore()
  const sub = state.subscriptions.find((s) => s.id === id)
  if (!sub) return null

  const card = state.cards.find((c) => c.id === sub.cardId)
  const next = nextRenewal(sub, state.payments)
  const history = state.payments
    .filter((p) => p.refId === sub.id)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  const totalPaid = history.reduce((s, p) => s + (p.amount ?? 0), 0)
  const anchor = parseISO(sub.renewalDate)

  function markPaid() {
    const dueDate = toKey(next)
    const label = formatDate(next, 'd MMMM')
    dispatch({ type: 'payment/toggle', kind: 'subscription', refId: sub!.id, dueDate, amount: sub!.amount, currency: sub!.currency })
    toast(`${label} ödemesi işaretlendi`, {
      action: { label: 'Geri al', onClick: () => dispatch({ type: 'payment/toggle', kind: 'subscription', refId: sub!.id, dueDate }) },
    })
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <RoundButton label="Geri" onClick={nav.back}><ChevronLeftIcon className="size-5" /></RoundButton>
        <span className="label text-subtle">Abonelik</span>
        <RoundButton label="Düzenle" onClick={() => nav.edit({ kind: 'subscription', id: sub.id })}><PencilIcon className="size-[18px]" /></RoundButton>
      </div>

      <section className="flex h-[200px] flex-col items-center rounded-[120px_120px_22px_22px] bg-bh-yellow px-4 pt-6 pb-3.5 text-center text-[#141414]">
        <Logo serviceKey={sub.serviceKey} name={sub.name} size={50} />
        <h1 className="mt-1.5 font-label text-xl font-medium">{sub.name}</h1>
        <p className="text-[11px] opacity-75">{CYCLE_LABELS[sub.cycle]} · {card ? `${card.bankName} •• ${card.last4}` : 'kart seçilmedi'}</p>
        <div className="mt-auto flex items-baseline gap-3">
          <Money amount={sub.amount} currency={sub.currency} size={34} />
          <span className="label rounded-lg bg-[#141414] px-2 py-1 text-bh-yellow">{dueLabel(next)}</span>
        </div>
      </section>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label="Sonraki" value={formatDate(next, 'd MMMM')} sub={formatDate(next, 'EEEE')} />
        <Stat
          label="Periyot"
          value={CYCLE_LABELS[sub.cycle]}
          sub={sub.cycle === 'monthly' ? `her ayın ${dayOf(anchor.getDate())}` : `her yıl ${formatDate(anchor, 'd MMMM')}`}
          shape={<span aria-hidden className="absolute -top-[18px] -right-[18px] size-[50px] rounded-full bg-bh-blue/90" />}
        />
        <Stat
          label="Yıllık maliyet"
          value={formatMoney(sub.cycle === 'monthly' ? sub.amount * 12 : sub.amount, sub.currency)}
          sub="bu fiyatla"
          shape={<span aria-hidden className="absolute right-0 bottom-0 size-[34px] rounded-tl-full bg-bh-red" />}
        />
        <Stat label="Toplam ödenen" value={formatMoney(totalPaid, sub.currency)} sub={`${history.length} ödeme`} />
      </div>

      {/* Gelecek ayın ödemesi, ay değişmeden işaretlenemez */}
      {canMarkPaid(next) ? (
        <button onClick={markPaid} className="pressable mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-ink font-semibold text-page">
          <CheckCircle2Icon className="size-[18px] text-bh-yellow" />
          {daysUntil(next) <= 0 ? 'Ödendi olarak işaretle' : `${formatDate(next, 'd MMMM')} ödendi olarak işaretle`}
        </button>
      ) : (
        paidThisMonth(state.payments, sub.id) && <PaidNote month={new Date()} />
      )}

      <h2 className="label mt-5 mb-2 px-1 text-subtle">Geçmiş</h2>
      {history.length === 0 ? (
        <p className="rounded-[18px] bg-surface px-3.5 py-3 text-sm text-subtle">Henüz ödendi işaretlenmiş bir ödeme yok.</p>
      ) : (
        <ul className="grid gap-1.5">
          {history.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 rounded-[18px] bg-surface px-3.5 py-2.5">
              <CheckCircle2Icon className="size-[18px] text-bh-green" />
              <span className="flex-1">{formatDate(parseISO(p.dueDate), 'd MMMM yyyy')}</span>
              <span className="num text-sm">{p.amount != null ? formatMoney(p.amount, p.currency) : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Stat({ label, value, sub, shape }: { label: string; value: string; sub: string; shape?: React.ReactNode }) {
  return (
    <div className="relative flex h-[92px] flex-col overflow-hidden rounded-[22px] bg-surface p-3">
      {shape}
      <span className="label relative text-subtle">{label}</span>
      <span className="num mt-auto text-lg">{value}</span>
      <span className="text-[11px] text-subtle">{sub}</span>
    </div>
  )
}
