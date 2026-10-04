import { CheckCircle2Icon, ChevronLeftIcon, PencilIcon } from 'lucide-react'
import { addMonths } from 'date-fns'
import { toast } from 'sonner'
import { haptic } from '@/lib/haptics'
import { play } from '@/lib/sound'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { PaidNote } from '@/components/PaidNote'
import { RoundButton } from '@/components/ScreenHeader'
import { canMarkPaid, daysUntil, hasDue, monthlyCost, nextCardCycle, paidThisMonth, toKey } from '@/lib/dates'
import { luminance } from '@/lib/color'
import { formatDate, formatMoney } from '@/lib/format'
import { serviceColor } from '@/lib/services'
import { useStore } from '@/lib/store'
import type { Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BankMark } from '@/components/BankMark'
import type { Nav } from '@/App'

export function CardDetail({ id, nav, onBack }: { id: string; nav: Nav; onBack: () => void }) {
  const { state, dispatch } = useStore()
  const card = state.cards.find((c) => c.id === id)
  if (!card) return null

  // Banka kartında son ödeme yok
  const cycle = hasDue(card) ? nextCardCycle(card, state.payments) : null
  const due = cycle?.due ?? null
  // Aylık maliyete göre büyükten küçüğe: banka kartında yaydaki dilimlerle liste aynı sırada
  const onCard = state.subscriptions.filter((s) => s.cardId === card.id).sort((a, b) => monthlyCost(b) - monthlyCost(a))
  const monthlyTry = onCard.filter((s) => s.currency === 'TRY').reduce((sum, s) => sum + monthlyCost(s), 0)

  function markPaid() {
    if (!due) return
    haptic()
    play('paid')
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

      {/* Ortada: banka sembolü, adı ve son 4 hane */}
      <div className="flex flex-col items-center text-center">
        <BankMark bankName={card.bankName} color={card.color} size={64} />
        <h1 className="num num-bold mt-2 max-w-full truncate text-2xl leading-tight">{card.bankName}</h1>
        <p className="num mt-1.5 rounded-full bg-surface px-3.5 py-1 text-xl tracking-[0.06em]">•••• {card.last4}</p>
      </div>

      {/* Kredi kartı: son ödemeye kalan gün. Banka kartında son ödeme yok: yay aboneliklerin aylık paylarını gösterir. */}
      {cycle ? (
        <>
          <Gauge color={card.color} due={due} previousDue={cycle.previousDue} />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Stat label="Kesim" value={formatDate(cycle.statement, 'd MMM')} sub={formatDate(cycle.statement, 'EEEE')} />
            <Stat label="Son ödeme" value={formatDate(cycle.due, 'd MMM')} sub={formatDate(cycle.due, 'EEEE')} />
            <Stat label="Bu karttan" value={formatMoney(monthlyTry)} sub={`${onCard.length} abonelik`} />
          </div>
        </>
      ) : (
        <ShareArc subscriptions={onCard} total={monthlyTry} />
      )}

      {/* Gelecek ayın ekstresi, ay değişmeden işaretlenemez */}
      {due && !canMarkPaid(due) && paidThisMonth(state.payments, card.id) && <PaidNote month={new Date()} />}
      {due && canMarkPaid(due) && (
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
                  {!cycle && s.currency === 'TRY' && <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: arcColor(s) }} />}
                  <span className="num text-[15px]">
                    {formatMoney(s.amount, s.currency)}
                    {s.cycle === 'yearly' && <span className="text-[11px] text-subtle">/yıl</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

/** Yaydaki dilim rengi: servisin rengi; siyah markalar (GitHub, Notion) koyu zeminde kaybolmasın diye yazı renginde */
function arcColor(s: Subscription) {
  const c = serviceColor(s.serviceKey, s.name)
  return luminance(c) < 0.2 ? 'var(--ink)' : c
}

/**
 * Banka kartı için yarım daire: her abonelik aylık TL maliyeti oranında kendi renginde bir dilim (soldan büyükten küçüğe).
 * Ortada aylık toplam. Yabancı para birimleri kur bilinmediği için yayda yok (Anasayfa'daki şerit gibi).
 */
function ShareArc({ subscriptions, total }: { subscriptions: Subscription[]; total: number }) {
  const W = 276
  const R = 112
  const cx = W / 2
  const cy = 140
  const GAP = 0.012
  const point = (p: number) => `${cx - R * Math.cos(Math.PI * p)} ${cy - R * Math.sin(Math.PI * p)}`
  const arc = (from: number, to: number) => `M ${point(from)} A ${R} ${R} 0 0 1 ${point(to)}`

  const items = subscriptions.filter((s) => s.currency === 'TRY').map((s) => ({ id: s.id, value: monthlyCost(s), color: arcColor(s) }))
  const sum = items.reduce((t, i) => t + i.value, 0)
  // Her dilimin başı = kendinden öncekilerin payları toplamı; aralarda küçük boşluk
  const slices = items.map((i, n) => {
    const from = items.slice(0, n).reduce((t, x) => t + x.value, 0) / sum
    const to = from + i.value / sum
    return { ...i, from: n === 0 ? 0 : from + GAP, to: n === items.length - 1 ? 1 : to - GAP }
  })

  return (
    <div className="relative mx-auto mt-3 w-[86%]">
      <svg viewBox={`0 0 ${W} 150`} className="w-full" role="img" aria-label={`Bu karttan aylık ${formatMoney(total)}, ${items.length} abonelik`}>
        {slices.length === 0 && <path d={arc(0, 1)} fill="none" stroke="var(--line)" strokeWidth={22} />}
        {slices.map((sl) => sl.to > sl.from && <path key={sl.id} d={arc(sl.from, sl.to)} fill="none" stroke={sl.color} strokeWidth={22} />)}
      </svg>
      <div className="absolute inset-x-0 bottom-1.5 text-center">
        {items.length > 0 ? (
          <>
            <Money amount={total} size={40} />
            <div className="mt-0.5 text-xs text-subtle">aylık · banka kartı</div>
          </>
        ) : (
          <>
            <span className="font-label text-2xl font-medium">Banka kartı</span>
            <div className="mt-0.5 text-xs text-subtle">henüz abonelik yok</div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Yarım daire gösterge: önceki son ödemeden sonrakine ne kadar yol kaldığı.
 * Dolu kısım banka renginde; uçtaki sarı nokta bugünü gösterir.
 */
function Gauge({ color, due, previousDue }: { color: string; due: Date | null; previousDue: Date | null }) {
  const W = 276
  const R = 112
  const cx = W / 2
  const cy = 140
  const arc = (p: number) => `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx - R * Math.cos(Math.PI * p)} ${cy - R * Math.sin(Math.PI * p)}`

  const left = due ? daysUntil(due) : 0
  // Döngü uzunluğu: önceki son ödemeden bu son ödemeye kadar geçen gün
  const total = due ? Math.max(1, daysUntil(due, previousDue ?? addMonths(due, -1))) : 1
  const progress = due ? Math.min(1, Math.max(0, (total - left) / total)) : 0

  const end = { x: cx - R * Math.cos(Math.PI * progress), y: cy - R * Math.sin(Math.PI * progress) }

  return (
    <div className="relative mx-auto mt-3 w-[86%]">
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
    <div className={cn('flex h-[76px] min-w-0 flex-col rounded-[20px] bg-surface p-3', className)}>
      <span className="label text-subtle">{label}</span>
      <span className="num mt-auto truncate text-lg">{value}</span>
      {sub && <span className="truncate text-[11px] text-subtle">{sub}</span>}
    </div>
  )
}
