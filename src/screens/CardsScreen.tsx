import { CardQuickStart } from '@/components/QuickStart'
import { AddButton, ScreenHeader } from '@/components/ScreenHeader'
import { BankBrand } from '@/components/BankMark'
import { daysUntil, hasDue, nextCardDue } from '@/lib/dates'
import { dayOf } from '@/lib/format'
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

      <section className="mb-2 flex h-[68px] shrink-0 items-center justify-between rounded-[22px] bg-hero px-3.5 text-hero-fg">
        <div>
          <div className="label opacity-70">Bu ay son ödeme</div>
          <div className="num num-bold mt-0.5 text-[24px] leading-none">{upcoming.length > 0 ? `${upcoming.length} kart` : 'Yok'}</div>
        </div>
        <div aria-hidden className="flex gap-1">
          {upcoming.slice(0, 6).map((c) => (
            <span key={c.id} className="h-7 w-2.5 rounded-[5px_5px_2px_2px] ring-1 ring-white/25" style={{ background: c.color }} />
          ))}
        </div>
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
  const big = size !== 'small'
  const note = hasDue(card) ? `son ödeme ${dayOf(card.dueDay)}` : 'banka kartı'
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
      <BankBrand bankName={card.bankName} className={big ? 'h-5' : 'h-4'} />
      <span className={cn('num absolute bottom-3 left-3 leading-none! tracking-[0.02em]',big ? 'text-[22px]' : 'text-lg', size === 'tall' && 'bottom-[30px]')}>•• {card.last4}</span>
      {big && <span className={cn('absolute text-[11px] opacity-85', size === 'tall' ? 'bottom-2.5 left-3' : 'right-3 bottom-3')}>{note}</span>}
    </button>
  )
}
