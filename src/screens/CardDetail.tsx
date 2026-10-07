import { CheckCircle2Icon, ChevronLeftIcon, PencilIcon } from 'lucide-react'
import { addMonths, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { haptic } from '@/lib/haptics'
import { play } from '@/lib/sound'
import { HoldButton } from '@/components/HoldButton'
import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { PaidNote } from '@/components/PaidNote'
import { RoundButton } from '@/components/ScreenHeader'
import { canMarkPaid, daysUntil, dueLabel, hasDue, monthlyCost, nextCardCycle, overdueCardCycles, paymentThisMonth, statementOfDue, toKey, type CardCycle } from '@/lib/dates'
import { contrastRatio } from '@/lib/color'
import { formatDate, formatMoney } from '@/lib/format'
import { serviceColor } from '@/lib/services'
import { useStore } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import type { Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BankMark } from '@/components/BankMark'
import type { Nav } from '@/App'

export function CardDetail({ id, nav, onBack }: { id: string; nav: Nav; onBack: () => void }) {
  const { state, dispatch } = useStore()
  const surfaces = useSurfaces()
  const card = state.cards.find((c) => c.id === id)
  if (!card) return null

  // Banka kartında son ödeme yok
  const cycle = hasDue(card) ? nextCardCycle(card, state.payments) : null
  const due = cycle?.due ?? null
  // Son ödemesi geçmiş, ödenmemiş ekstreler (en eskisi başta)
  const overdue = hasDue(card) ? overdueCardCycles(card, state.payments) : []
  // Aylık maliyete göre büyükten küçüğe: banka kartında yaydaki dilimlerle liste aynı sırada
  const onCard = state.subscriptions.filter((s) => s.cardId === card.id).sort((a, b) => monthlyCost(b) - monthlyCost(a))
  const monthlyTry = onCard.filter((s) => s.currency === 'TRY').reduce((sum, s) => sum + monthlyCost(s), 0)

  // Ekstrenin ödeme kaydını açar ya da kaldırır (son ödeme gününe göre tutulur)
  function toggleDue(due: Date) {
    dispatch({ type: 'payment/toggle', kind: 'card', refId: card!.id, dueDate: toKey(due) })
  }

  function markPaid(c: CardCycle) {
    haptic()
    play('paid')
    toggleDue(c.due)
    toast(`${card!.bankName} ${formatDate(c.statement, 'LLLL')} ekstresi ödendi`, {
      action: { label: 'Geri al', onClick: () => toggleDue(c.due) },
    })
  }

  // Ödendi notu: sıradaki ekstre ödenmişse o, değilse bu ay ödenen ekstre. Adı kesim ayından; geri alınabilir.
  const paidThis = paymentThisMonth(state.payments, card.id)
  const note = cycle?.paid ? cycle.due : paidThis ? parseISO(paidThis.dueDate) : null

  function undoPaid(due: Date) {
    haptic()
    play('undo')
    toggleDue(due)
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <RoundButton label="Geri" onClick={onBack}><ChevronLeftIcon className="size-5" /></RoundButton>
        <span className="text-[17px] font-semibold">Kart</span>
        <RoundButton label="Düzenle" onClick={() => nav.edit({ kind: 'card', id: card.id })}><PencilIcon className="size-[18px]" /></RoundButton>
      </div>

      {/* Ortada: banka sembolü, adı ve son 4 hane */}
      <div className="flex flex-col items-center text-center">
        <BankMark bankName={card.bankName} color={card.color} size={64} />
        <h1 className="num num-bold mt-2 max-w-full truncate text-2xl leading-tight">{card.bankName}</h1>
        <p className="num mt-1.5 rounded-full bg-surface px-3.5 py-1 text-xl tracking-[0.06em]">•••• {card.last4}</p>
      </div>

      {/* Son ödemesi geçen ekstreler: en önemli uyarı, her biri için ayrı "Ödendi" */}
      {overdue.length > 0 && (
        <section className="mt-3 rounded-[22px] bg-bh-red p-3.5 text-white">
          <h2 className="label opacity-90">Son ödemesi geçen</h2>
          <ul className="mt-1.5 grid gap-2">
            {overdue.map((c) => (
              <li key={toKey(c.due)} className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{formatDate(c.statement, 'LLLL')} ekstresi</span>
                  <span className="block truncate text-sm">
                    {formatDate(c.due, 'd MMMM')} · <span className="num-bold">{dueLabel(c.due)}</span>
                  </span>
                </span>
                <button onClick={() => markPaid(c)} className="pressable min-h-10 shrink-0 rounded-[14px] bg-white px-4 font-medium text-[#141414]">
                  Ödendi
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {/* Ödenmiş ekstre notu (geri alınabilir); ekstre adı kesim ayı. Ekstre zaten ödendiyse düğme çıkmaz: basınca işareti kaldırırdı */}
      {note && <PaidNote month={statementOfDue(note)} onUndo={() => undoPaid(note)} />}
      {cycle && !cycle.paid && canMarkPaid(cycle.due) && (
        <button onClick={() => markPaid(cycle)} className="pressable mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-ink font-semibold text-page">
          <CheckCircle2Icon className="size-[18px] text-bh-yellow" />
          {formatDate(cycle.statement, 'LLLL')} ekstresi ödendi
        </button>
      )}

      {onCard.length > 0 && (
        <>
          <h2 className="label mt-5 mb-2 px-1 text-subtle">Bu karttan çekilenler</h2>
          <ul className="grid gap-1.5">
            {onCard.map((s) => (
              <li key={s.id}>
                <HoldButton onOpen={() => nav.openSubscription(s.id)} className="pressable flex w-full items-center gap-3 rounded-[18px] bg-surface px-3 py-2.5 text-left">
                  <Logo serviceKey={s.serviceKey} name={s.name} size={30} />
                  <span className="flex-1 truncate font-medium">{s.name}</span>
                  {!cycle && s.currency === 'TRY' && <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: arcColor(s, surfaces.page) }} />}
                  <span className="num text-[15px]">
                    {formatMoney(s.amount, s.currency)}
                    {s.cycle === 'yearly' && <span className="text-[11px] text-subtle">/yıl</span>}
                  </span>
                </HoldButton>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

/**
 * Açık ve koyu temada yayların zeminleri: dilimler sayfanın ve kartların (listedeki kutular) üstünde,
 * gösterge yayı ise izin (track) üstünde durur.
 */
const SURFACES = {
  light: { page: ['#F1ECE2', '#FFFFFF'], track: ['#E2DBCD'] },
  dark: { page: ['#000000', '#141414'], track: ['#262626'] },
} as const

function useSurfaces() {
  return SURFACES[useTheme().resolved]
}

/** Renk zeminlerden birinde kaybolursa (siyah GitHub koyu temada, sarı Paycell açıkta) yazı rengi; değilse rengin kendisi. Stroke için style ile verilir. */
function strokeOn(color: string, zones: readonly string[]) {
  return zones.some((z) => contrastRatio(color, z) < 1.6) ? 'var(--ink)' : color
}

/** Yaydaki dilim rengi: servisin rengi */
function arcColor(s: Subscription, zones: readonly string[]) {
  return strokeOn(serviceColor(s.serviceKey, s.name), zones)
}

/**
 * Banka kartı için yarım daire: her abonelik aylık TL maliyeti oranında kendi renginde bir dilim (soldan büyükten küçüğe).
 * Ortada aylık toplam. Yabancı para birimleri kur bilinmediği için yayda yok (Anasayfa'daki şerit gibi).
 */
function ShareArc({ subscriptions, total }: { subscriptions: Subscription[]; total: number }) {
  const surfaces = useSurfaces()
  const W = 276
  const R = 112
  const cx = W / 2
  const cy = 140
  const GAP = 0.012 // dilimler arası boşluk (iki dilim arasında toplam iki kat)
  const MIN = 0.03 // en küçük dilimin görünür uzunluğu: küçük aboneliklerin dilimi boşlukta kaybolmasın
  const point = (p: number) => `${cx - R * Math.cos(Math.PI * p)} ${cy - R * Math.sin(Math.PI * p)}`
  const arc = (from: number, to: number) => `M ${point(from)} A ${R} ${R} 0 0 1 ${point(to)}`

  const items = subscriptions.filter((s) => s.currency === 'TRY').map((s) => ({ id: s.id, value: monthlyCost(s), color: arcColor(s, surfaces.page) }))
  const sum = items.reduce((t, i) => t + i.value, 0)
  // Dilimler yayın boşluk dışındaki kısmını payına göre doldurur. Payı MIN'in altında kalan dilim MIN'e çıkar,
  // fazlası büyük dilimlerden alınır: her dilim en az MIN, toplam hep tam yay.
  const room = 1 - Math.max(0, items.length - 1) * 2 * GAP
  const floor = Math.min(MIN, room / Math.max(1, items.length))
  const raw = items.map((i) => (sum > 0 ? i.value / sum : 1 / items.length) * room)
  const floored = raw.map((r) => Math.max(r, floor))
  const excess = floored.reduce((t, x) => t + x, 0) - room
  const above = raw.map((r) => Math.max(r - floor, 0))
  const aboveSum = above.reduce((t, x) => t + x, 0)
  const lengths = floored.map((f, n) => f - (aboveSum > 0 ? (excess * above[n]) / aboveSum : 0))
  // Her dilimin başı: önceki dilimlerin uzunlukları ve aralarındaki boşluklar
  const slices = items.map((i, n) => {
    const from = lengths.slice(0, n).reduce((t, l) => t + l + 2 * GAP, 0)
    return { ...i, from, to: from + lengths[n] }
  })

  return (
    <div className="relative mx-auto mt-3 w-[86%]">
      <svg viewBox={`0 0 ${W} 150`} className="w-full" role="img" aria-label={`Bu karttan aylık ${formatMoney(total)}, ${items.length} abonelik`}>
        {/* Stroke style ile: iOS Safari'de var() sunum özniteliğinde (stroke="var(..)") güvenilir değil */}
        {slices.length === 0 && <path d={arc(0, 1)} fill="none" style={{ stroke: 'var(--line)' }} strokeWidth={22} />}
        {slices.map((sl) => <path key={sl.id} d={arc(sl.from, sl.to)} fill="none" style={{ stroke: sl.color }} strokeWidth={22} />)}
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
  const surfaces = useSurfaces()
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
        <path d={arc(1)} fill="none" style={{ stroke: 'var(--line)' }} strokeWidth={22} />
        {progress > 0.01 && <path d={arc(progress)} fill="none" style={{ stroke: strokeOn(color, surfaces.track) }} strokeWidth={22} />}
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
