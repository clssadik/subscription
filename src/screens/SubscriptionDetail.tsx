import { CheckCircle2Icon, ChevronLeftIcon, PencilIcon } from 'lucide-react'
import { parseISO } from 'date-fns'
import { useCallback, useState } from 'react'
import { play } from '@/lib/sound'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { PaidNote } from '@/components/PaidNote'
import { PaidOverlay } from '@/components/PaidOverlay'
import { haptic } from '@/lib/haptics'
import { RoundButton } from '@/components/ScreenHeader'
import { TearTicket } from '@/components/TearTicket'
import { canMarkPaid, daysUntil, dueLabel, nextRenewal, paidThisMonth, toKey } from '@/lib/dates'
import { dayOf, formatDate, formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CURRENCIES, CYCLE_LABELS } from '@/lib/types'
import type { Nav } from '@/App'

export function SubscriptionDetail({ id, nav }: { id: string; nav: Nav }) {
  const { state, dispatch } = useStore()
  // Koçan koparılınca açılan "Ödendi" ekranı
  const [paid, setPaid] = useState<{ title: string; detail: string } | null>(null)
  const closePaid = useCallback(() => setPaid(null), [])
  // Geri alınınca artar: koçan fişe geri uçar
  const [restored, setRestored] = useState(0)
  const sub = state.subscriptions.find((s) => s.id === id)
  if (!sub) return null

  const card = state.cards.find((c) => c.id === sub.cardId)
  const next = nextRenewal(sub, state.payments)
  const history = state.payments
    .filter((p) => p.refId === sub.id)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  // Ödemeler kendi para biriminde toplanır: para birimi sonradan değişen abonelikte eski ödemeler eski birimiyle kalır.
  // Birimi kaydedilmemiş eski ödemeler aboneliğin birimi sayılır.
  const paidTotals = CURRENCIES.map((c) => {
    const mine = history.filter((p) => (p.currency ?? sub.currency) === c)
    return { currency: c, count: mine.length, total: mine.reduce((s, p) => s + (p.amount ?? 0), 0) }
  }).filter((t) => t.count > 0)
  const anchor = parseISO(sub.renewalDate)

  // Titreşim koçan koparken (dokunuşun içinde) verilir; burada ses, kayıt ve "Ödendi" ekranı
  function markPaid() {
    play('paid')
    const dueDate = toKey(next)
    dispatch({ type: 'payment/toggle', kind: 'subscription', refId: sub!.id, dueDate, amount: sub!.amount, currency: sub!.currency })
    setPaid({ title: `${sub!.name} · ${formatMoney(sub!.amount, sub!.currency)}`, detail: `${formatDate(next, 'd MMMM')} ödemesi` })
  }

  // Bu ayın işaretli ödemesi (sayfadaki "Geri al" bunu kaldırır, koçan geri gelir)
  const thisMonth = toKey(new Date()).slice(0, 7)
  const paidNow = history.find((p) => p.dueDate.startsWith(thisMonth))
  function undoPaid() {
    if (!paidNow) return
    haptic()
    play('undo')
    dispatch({ type: 'payment/toggle', kind: 'subscription', refId: sub!.id, dueDate: paidNow.dueDate })
    setRestored((n) => n + 1)
  }

  return (
    <>
      {/* Üst kısım (başlık satırı ve fiş): sağa çekmek koçanı keser, sayfanın sağa çekerek geri dönüşü burada çalışmaz.
          "band": bu yükseklikte ekranın kenarları da dahil (koçanı kesmeye ekranın sol kenarından başlanıyordu). Aşağıdan sağa çekince geri dönülür. */}
      <div data-no-swipe-back="band">
        <div className="mb-3 flex items-center justify-between">
          <RoundButton label="Geri" onClick={nav.back}><ChevronLeftIcon className="size-5" /></RoundButton>
          <span className="text-[17px] font-semibold">Abonelik</span>
          <RoundButton label="Düzenle" onClick={() => nav.edit({ kind: 'subscription', id: sub.id })}><PencilIcon className="size-[18px]" /></RoundButton>
        </div>

        {/* Ödeme kartı (fiş): tutar en büyük şey. Bu dönemin ödemesi işaretlenebiliyorsa koçan sağa çekilip koparılır = ödendi. */}
        <TearTicket
          canTear={canMarkPaid(next)}
          hint={daysUntil(next) <= 0 ? 'Kesip ödendi olarak işaretleyin' : `${formatDate(next, 'd MMMM')} ödemesini kesip işaretleyin`}
          onTear={markPaid}
          restore={restored}
          // Gelecek ayların ödemesi o ay gelmeden işaretlenemez: koçanda nedeni yazar (bu ay ödendiyse alttaki not yeter)
          note={paidThisMonth(state.payments, sub.id) ? undefined : `${formatDate(next, 'd MMMM')} ödemesi o ay gelince kesilebilir`}
          top={
            <>
              <span aria-hidden className="absolute -top-8 -right-8 size-28 rounded-full bg-bh-blue dark:bg-bh-yellow" />
              <Logo serviceKey={sub.serviceKey} name={sub.name} size={44} className="relative" />
              <h1 className="relative mt-3 truncate font-label text-lg font-medium">{sub.name}</h1>
              <div className="relative leading-tight">
                <Money amount={sub.amount} currency={sub.currency} size={46} />
              </div>
            </>
          }
          stub={
            <div className="flex justify-between gap-3 text-[11px] opacity-75">
              <span className="truncate">{sub.onBill ? 'Fatura' : card ? `${card.bankName} •• ${card.last4}` : 'ödeme seçilmedi'}</span>
              <span className="shrink-0">
                {CYCLE_LABELS[sub.cycle]} · {sub.cycle === 'monthly' ? `her ayın ${dayOf(anchor.getDate())}` : `her yıl ${formatDate(anchor, 'd MMMM')}`}
              </span>
            </div>
          }
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="flex h-[92px] flex-col rounded-[22px] bg-bh-yellow p-3 text-[#141414]">
          <span className="label">{daysUntil(next) < 0 ? 'Gecikmiş' : 'Sonraki'}</span>
          <span className="num mt-auto text-lg">{formatDate(next, 'd MMMM')}</span>
          <span className="text-[11px]">{dueLabel(next)} · {formatDate(next, 'EEEE')}</span>
        </div>
        <Stat
          label="Yıllık maliyet"
          value={formatMoney(sub.cycle === 'monthly' ? sub.amount * 12 : sub.amount, sub.currency)}
          shape={<span aria-hidden className="absolute right-0 bottom-0 size-[34px] rounded-tl-full bg-bh-red" />}
        />
      </div>

      {/* Bu ayın ödemesi yapıldıysa not; işaretleme fişin koçanını koparmakla olur */}
      {!canMarkPaid(next) && paidThisMonth(state.payments, sub.id) && <PaidNote month={new Date()} onUndo={undoPaid} />}

      <div className="mt-5 mb-2 flex items-baseline justify-between px-1 text-subtle">
        <h2 className="label">Geçmiş</h2>
        {history.length > 0 && <span className="num text-[11px]">{paidTotals.map((t) => formatMoney(t.total, t.currency)).join(' + ')} · {history.length} ödeme</span>}
      </div>
      {history.length === 0 ? (
        <p className="rounded-[18px] bg-surface px-3.5 py-3 text-sm text-subtle">Henüz ödeme yok.</p>
      ) : (
        <ul className="grid gap-1.5">
          {history.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 rounded-[18px] bg-surface px-3.5 py-2.5">
              <CheckCircle2Icon className="size-[18px] text-bh-green" />
              <span className="flex-1">{formatDate(parseISO(p.dueDate), 'd MMMM yyyy')}</span>
              <span className="num text-sm">{p.amount != null ? formatMoney(p.amount, p.currency ?? sub.currency) : ''}</span>
            </li>
          ))}
        </ul>
      )}
      {paid && <PaidOverlay title={paid.title} detail={paid.detail} onClose={closePaid} />}
    </>
  )
}

function Stat({ label, value, sub, shape }: { label: string; value: string; sub?: string; shape?: React.ReactNode }) {
  return (
    <div className="relative flex h-[92px] flex-col overflow-hidden rounded-[22px] bg-surface p-3">
      {shape}
      <span className="label relative text-subtle">{label}</span>
      <span className="num mt-auto text-lg">{value}</span>
      {sub && <span className="text-[11px] text-subtle">{sub}</span>}
    </div>
  )
}
