import { CardQuickStart } from '@/components/QuickStart'
import { AddButton, ScreenHeader } from '@/components/ScreenHeader'
import { BankBrand } from '@/components/BankMark'
import { daysUntil, hasDue, nextCardDue } from '@/lib/dates'
import { useStore } from '@/lib/store'
import type { CreditCard } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Nav } from '@/App'

/** Mozaik düzeni: 7 karolu bir blok (2 + 1 + 2 satır) boşluksuz dolar. Az kartta hepsi geniş. */
const BLOCK = ['tall', 'small', 'small', 'wide', 'small', 'tall', 'small'] as const
type Size = (typeof BLOCK)[number]

/** Karo köşelerindeki geometrik süsler; sırayla döner */
const SHAPES = [
  '-right-6 -bottom-6 size-[90px] rounded-full',
  '-top-2.5 -right-2.5 size-10 rounded-bl-full',
  '-right-3 -bottom-3 size-10 rounded-full',
  'top-[-14px] right-5 size-11 rounded-b-full',
  '-top-3 -right-3 size-10 rounded-full',
  '-bottom-2.5 -left-2.5 size-[60px] rounded-tr-full',
  '-right-2.5 -bottom-2.5 size-10 rounded-tl-full',
]

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
  const upcoming = cards.filter(hasDue).filter((c) => daysUntil(nextCardDue(c, payments)) >= 0 && nextCardDue(c, payments).getMonth() === new Date().getMonth())
  const sizeOf = (i: number): Size => (cards.length < 4 ? 'wide' : BLOCK[i % BLOCK.length])

  return (
    <>
      <ScreenHeader title="Kartlar" action={<AddButton label="Kart ekle" onClick={() => nav.addCard()} />} />

      <section className="mb-2 flex h-[76px] shrink-0 items-center justify-between overflow-hidden rounded-[22px] bg-hero pr-1 pl-3.5 text-hero-fg">
        <div>
          <div className="label opacity-70">Bu ay ödenecek</div>
          <div className="num num-bold mt-0.5 text-[28px] leading-none">{upcoming.length > 0 ? `${upcoming.length} kart` : 'Yok'}</div>
        </div>
        <CardFan items={upcoming.map((c) => ({ card: c, due: nextCardDue(c, payments) }))} />
      </section>

      {/* Mozaik kendi içinde kaydırılır; üstteki özet yerinde kalır */}
      <div
        className="min-h-48 flex-1 overflow-y-auto overscroll-contain pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent)' }}
      >
        <div className="grid auto-rows-[64px] grid-flow-dense grid-cols-2 gap-2">
          {cards.map((c, i) => (
            <Tile key={c.id} card={c} size={sizeOf(i)} shape={SHAPES[i % SHAPES.length]} onClick={() => onSelect(c.id)} />
          ))}
        </div>
      </div>
    </>
  )
}

function Tile({ card, size, shape, onClick }: { card: CreditCard; size: Size; shape: string; onClick: () => void }) {
  // Büyük karolarda sadece banka kartı yazılır; son ödeme günü karoda gösterilmez
  const debitNote = size !== 'small' && !hasDue(card)
  return (
    <button
      onClick={onClick}
      className={cn(
        'pressable relative flex flex-col justify-start overflow-hidden rounded-[18px] p-3 text-left text-white',
        size === 'tall' && 'row-span-2',
        size === 'wide' && 'col-span-2',
      )}
      style={{ background: card.color }}
    >
      <span aria-hidden className={cn('absolute bg-black/20', shape)} />
      {/* Hem yükseklik hem genişlik sınırı: uzun yazılı logolar (Akbank) küçülür, hepsi aynı ağırlıkta durur */}
      <BankBrand bankName={card.bankName} className={size === 'tall' ? 'h-5 max-w-[116px]' : 'h-4 max-w-[96px]'} />
      <span className={cn('num absolute bottom-3 left-3 leading-none! tracking-[0.02em]',size === 'tall' ? 'text-[22px]' : 'text-lg', debitNote && size === 'tall' && 'bottom-[30px]')}>•• {card.last4}</span>
      {debitNote && <span className={cn('absolute text-[11px] opacity-85', size === 'tall' ? 'bottom-2.5 left-3' : 'right-3 bottom-3')}>banka kartı</span>}
    </button>
  )
}

/**
 * Özet kartındaki cüzdan: bu ay ödenecek kartlar el kartı gibi açılır.
 * Hepsi alttaki ortak bir noktadan döner; en yakın son ödeme en üstte (sağda, çipli).
 */
function CardFan({ items }: { items: { card: CreditCard; due: Date }[] }) {
  const fan = [...items].sort((a, b) => b.due.getTime() - a.due.getTime()).slice(-8).map((x) => x.card)
  const n = fan.length
  if (n === 0) return null
  // Kart azsa yelpaze daralır; çoksa en fazla ±32 derece açılır
  const spread = Math.min(32, 8 * (n - 1))
  return (
    <div aria-hidden className="relative h-[76px] w-[190px] shrink-0 self-end">
      {fan.map((c, i) => {
        const angle = n === 1 ? 0 : -spread + (2 * spread * i) / (n - 1)
        return (
          <span
            key={c.id}
            className="absolute top-5 left-[65px] h-10 w-[60px] origin-[50%_300%] rounded-[7px] ring-1 ring-white/25"
            style={{ transform: `rotate(${angle}deg)`, background: c.color }}
          >
            {i === n - 1 && <span className="absolute top-2 left-2 h-2 w-3 rounded-[2px] bg-bh-yellow" />}
          </span>
        )
      })}
    </div>
  )
}
