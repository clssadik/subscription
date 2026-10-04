import { CheckCircle2Icon, ChevronLeftIcon, PencilIcon } from 'lucide-react'
import { parseISO } from 'date-fns'
import { toast } from 'sonner'
import { haptic } from '@/lib/haptics'
import { play } from '@/lib/sound'
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
    haptic()
    play('paid')
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

      {/* Ödeme kartı (fiş): tutar en büyük şey. Kesik çizgide iki yanda zemin renginde yarım daire, fiş koçanı gibi. */}
      <section className="relative overflow-hidden rounded-[22px] bg-hero px-4 pt-4 pb-3.5 text-hero-fg">
        <span aria-hidden className="absolute -top-8 -right-8 size-28 rounded-full bg-bh-blue dark:bg-metal" />
        <Logo serviceKey={sub.serviceKey} name={sub.name} size={44} className="relative" />
        <h1 className="relative mt-3 truncate font-label text-lg font-medium">{sub.name}</h1>
        <div className="relative leading-tight">
          <Money amount={sub.amount} currency={sub.currency} size={46} />
        </div>
        <div aria-hidden className="relative -mx-4 my-3 flex items-center">
          <span className="-ml-3 size-6 shrink-0 rounded-full bg-page" />
          <span className="mx-1.5 flex-1 border-t border-dashed border-current opacity-25" />
          <span className="-mr-3 size-6 shrink-0 rounded-full bg-page" />
        </div>
        <div className="flex justify-between gap-3 text-[11px] opacity-75">
          <span className="truncate">{card ? `${card.bankName} •• ${card.last4}` : 'kart seçilmedi'}</span>
          <span className="shrink-0">
            {CYCLE_LABELS[sub.cycle]} · {sub.cycle === 'monthly' ? `her ayın ${dayOf(anchor.getDate())}` : `her yıl ${formatDate(anchor, 'd MMMM')}`}
          </span>
        </div>
      </section>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="flex h-[92px] flex-col rounded-[22px] metal p-3 text-[#141414]">
          <span className="label">Sonraki</span>
          <span className="num mt-auto text-lg">{formatDate(next, 'd MMMM')}</span>
          <span className="text-[11px]">{dueLabel(next)} · {formatDate(next, 'EEEE')}</span>
        </div>
        <Stat
          label="Yıllık maliyet"
          value={formatMoney(sub.cycle === 'monthly' ? sub.amount * 12 : sub.amount, sub.currency)}
          sub="bu fiyatla"
          shape={<span aria-hidden className="absolute right-0 bottom-0 size-[34px] rounded-tl-full bg-bh-red" />}
        />
      </div>

      {/* Gelecek ayın ödemesi, ay değişmeden işaretlenemez */}
      {canMarkPaid(next) ? (
        <button onClick={markPaid} className="pressable mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-ink font-semibold text-page">
          <CheckCircle2Icon className="size-[18px] text-metal" />
          {daysUntil(next) <= 0 ? 'Ödendi olarak işaretle' : `${formatDate(next, 'd MMMM')} ödendi olarak işaretle`}
        </button>
      ) : (
        paidThisMonth(state.payments, sub.id) && <PaidNote month={new Date()} />
      )}

      <div className="mt-5 mb-2 flex items-baseline justify-between px-1 text-subtle">
        <h2 className="label">Geçmiş</h2>
        {history.length > 0 && <span className="num text-[11px]">{formatMoney(totalPaid, sub.currency)} · {history.length} ödeme</span>}
      </div>
      {history.length === 0 ? (
        <p className="rounded-[18px] bg-surface px-3.5 py-3 text-sm text-subtle">Sıradaki ödeme {formatDate(next, 'd MMMM')}. Ödendi işaretleyince burada görünür.</p>
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
