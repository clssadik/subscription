import { CardQuickStart } from '@/components/QuickStart'
import { AddButton, ScreenHeader } from '@/components/ScreenHeader'
import { BankMark } from '@/components/BankMark'
import { luminance } from '@/lib/color'
import { daysUntil, dueLabel, hasDue, nextCardDue } from '@/lib/dates'
import { formatDate } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { CreditCard } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Nav } from '@/App'

export function CardsScreen({ nav, onSelect }: { nav: Nav; onSelect: (id: string) => void }) {
  const { state } = useStore()
  const { cards, payments } = state

  if (cards.length === 0) {
    return (
      <>
        <ScreenHeader title="Kartlar" action={<AddButton label="Kart ekle" onClick={() => nav.addCard()} />} />
        <CardQuickStart nav={nav} />
      </>
    )
  }

  // Bu ay son ödemesi gelmemiş kredi kartları
  const upcoming = cards
    .filter(hasDue)
    .map((card) => ({ card, due: nextCardDue(card, payments) }))
    .filter(({ due }) => daysUntil(due) >= 0 && due.getMonth() === new Date().getMonth())
    .sort((a, b) => a.due.getTime() - b.due.getTime())
  // Liste: önce kredi kartları (son ödemesi en yakın olan üstte), sonra banka kartları
  const credit = cards
    .filter(hasDue)
    .map((card) => ({ card, due: nextCardDue(card, payments) }))
    .sort((a, b) => a.due.getTime() - b.due.getTime())
  const groups = [
    { title: 'Kredi kartları', list: credit },
    { title: 'Banka kartları', list: cards.filter((c) => !hasDue(c)).map((card) => ({ card, due: null })) },
  ].filter((g) => g.list.length > 0)

  return (
    <>
      <ScreenHeader title="Kartlar" action={<AddButton label="Kart ekle" onClick={() => nav.addCard()} />} />

      {/* Bauhaus afiş: solda sayı, sağda her ödenecek kart için kendi renginde bir şekil. Beyaz zemin (koyu temada da). */}
      <section className="mb-2 grid h-[196px] shrink-0 grid-cols-[1fr_150px] overflow-hidden rounded-[26px] bg-surface dark:bg-[#F2F2F2] dark:text-[#141414]">
        <div className="flex min-w-0 flex-col py-4 pl-[18px]">
          <div className="label text-subtle dark:text-[#141414]/60">Bu ay ödenecek</div>
          {upcoming.length > 0 ? (
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="num num-bold text-[96px] leading-[0.9]">{upcoming.length}</span>
              <span className="text-lg font-medium">kart</span>
            </div>
          ) : (
            <div className="num num-bold mt-1 text-[40px] leading-none">Yok</div>
          )}
          {upcoming[0] && (
            <div className="mt-auto pr-2 text-xs leading-snug">
              <span className="text-subtle dark:text-[#141414]/60">İlk son ödeme</span>
              <span className="block truncate font-medium">{upcoming[0].card.bankName} · {formatDate(upcoming[0].due, 'd MMMM')}</span>
            </div>
          )}
        </div>
        <Poster cards={upcoming.map((u) => u.card)} />
      </section>

      {/* Liste kendi içinde kaydırılır; üstteki özet yerinde kalır. Alan cam menünün arkasına kadar uzanır. */}
      <div className="-mb-24 min-h-48 flex-1 overflow-y-auto overscroll-contain pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="label mt-4 mb-1 px-1 text-subtle">{g.title}</h2>
            <ul className="grid gap-1.5">
              {g.list.map(({ card, due }) => (
                <li key={card.id}>
                  <CardRow card={card} due={due} onClick={() => onSelect(card.id)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

function CardRow({ card, due, onClick }: { card: CreditCard; due: Date | null; onClick: () => void }) {
  return (
    <button onClick={onClick} className="pressable flex w-full items-center gap-3 rounded-[18px] bg-surface py-2 pr-3 pl-2 text-left">
      <BankMark bankName={card.bankName} color={card.color} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{card.bankName}</span>
        <span className="block text-[11px] text-subtle">{due ? 'Kredi kartı' : 'Banka kartı'}</span>
      </span>
      {due ? (
        <span className="text-right">
          <span className="num block text-[15px]">•• {card.last4}</span>
          <span className="block text-[11px] text-subtle">{formatDate(due, 'd MMM')} · {dueLabel(due)}</span>
        </span>
      ) : (
        <span className="num text-[15px]">•• {card.last4}</span>
      )}
    </button>
  )
}

/** Afişin şekil yerleri (150px genişliğinde siyah panel). İlk yer daire: en yakın son ödeme oraya gelir ve sarı halka alır. */
const POSTER = [
  'top-3.5 left-3.5 size-14 rounded-full',
  'top-3.5 left-20 size-14 rounded-bl-full',
  'top-[78px] left-3.5 h-7 w-14 rounded-t-full',
  'top-[78px] left-20 h-14 w-7',
  'top-[78px] left-[114px] size-[22px] rounded-full',
  'top-[114px] left-3.5 size-14 rounded-tr-full',
  'top-[142px] left-20 h-7 w-14 rounded-b-full',
]

/** Bu ay ödenecek kartlar Bauhaus şekilleri olarak, son ödemesi en yakın olan başta. Boş kalan yerler koyu gri. */
function Poster({ cards }: { cards: CreditCard[] }) {
  return (
    <div aria-hidden className="relative bg-[#141414]">
      {POSTER.map((shape, i) => (
        // Siyah kartlar (Papara) siyah panelde kaybolmasın: ince açık kenar
        <span key={i} className={cn('absolute', shape, cards[i] && luminance(cards[i].color) < 0.12 && 'ring-1 ring-white/30')} style={{ background: cards[i]?.color ?? '#262626' }} />
      ))}
      {cards.length > 0 && <span className="absolute top-3.5 left-3.5 size-14 rounded-full ring-[3px] ring-bh-yellow" />}
    </div>
  )
}
