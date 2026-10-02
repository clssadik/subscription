import { CardQuickStart } from '@/components/QuickStart'
import { AddButton, ScreenHeader } from '@/components/ScreenHeader'
import { BankBrand } from '@/components/BankMark'
import { luminance } from '@/lib/color'
import { daysUntil, hasDue, nextCardDue } from '@/lib/dates'
import { formatDate } from '@/lib/format'
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
  const upcoming = cards
    .filter(hasDue)
    .map((card) => ({ card, due: nextCardDue(card, payments) }))
    .filter(({ due }) => daysUntil(due) >= 0 && due.getMonth() === new Date().getMonth())
    .sort((a, b) => a.due.getTime() - b.due.getTime())
  const sizeOf = (i: number): Size => (cards.length < 4 ? 'wide' : BLOCK[i % BLOCK.length])

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

      {/* Mozaik kendi içinde kaydırılır; üstteki özet yerinde kalır. Alan cam menünün arkasına kadar uzanır. */}
      <div className="-mb-24 min-h-48 flex-1 overflow-y-auto overscroll-contain pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
