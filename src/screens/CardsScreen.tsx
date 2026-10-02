import { CardQuickStart } from '@/components/QuickStart'
import { AddButton, ScreenHeader } from '@/components/ScreenHeader'
import { useState } from 'react'
import { BankBrand, BankMark } from '@/components/BankMark'
import { Segmented } from '@/components/FormBits'
import { PinnedLayout } from '@/components/PinnedLayout'
import { luminance } from '@/lib/color'
import { daysUntil, hasDue, nextCardDue, nextStatement } from '@/lib/dates'
import { formatDate } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { CreditCard } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Nav } from '@/App'

export function CardsScreen({ nav, onSelect }: { nav: Nav; onSelect: (id: string) => void }) {
  const { state } = useStore()
  const { cards, payments } = state
  const [tab, setTab] = useState<'credit' | 'debit'>('credit')

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
  // Liste: kredi kartları (hesap kesimi en yakın olan üstte) ya da banka kartları; üstteki seçiciyle
  const credit = cards
    .filter(hasDue)
    .map((card) => ({ card, statement: nextStatement(card) }))
    .sort((a, b) => a.statement.getTime() - b.statement.getTime())
  const debit = cards.filter((c) => !hasDue(c))
  const shown = credit.length === 0 ? 'debit' : debit.length === 0 ? 'credit' : tab

  return (
    <>
      <ScreenHeader title="Kartlar" action={<AddButton label="Kart ekle" onClick={() => nav.addCard()} />} />

      <PinnedLayout
        fade={false}
        top={
          <>
            {/* Bauhaus afiş: solda sayı, sağda her ödenecek kart için kendi renginde bir şekil. Beyaz zemin (koyu temada da). */}
            <section className="grid h-[196px] shrink-0 grid-cols-[1fr_150px] overflow-hidden rounded-[26px] bg-surface dark:bg-[#F2F2F2] dark:text-[#141414]">
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

            {credit.length > 0 && debit.length > 0 && (
              <Segmented
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'credit', label: `Kredi kartları · ${credit.length}` },
                  { value: 'debit', label: `Banka kartları · ${debit.length}` },
                ]}
                className="mt-2 bg-line"
                activeClass="bg-white text-[#141414] dark:bg-[#F2F2F2]"
              />
            )}
          </>
        }
      >
        <ul className="grid gap-1.5">
          {shown === 'credit'
            ? credit.map(({ card, statement }) => (
                <li key={card.id}>
                  <CreditRow card={card} statement={statement} onClick={() => onSelect(card.id)} />
                </li>
              ))
            : debit.map((card) => (
                <li key={card.id}>
                  <DebitRow card={card} onClick={() => onSelect(card.id)} />
                </li>
              ))}
        </ul>
      </PinnedLayout>
    </>
  )
}

/** Kredi kartı: bankanın renginde satır, orijinal logo ve son 4 hane; sağda sıradaki hesap kesimi */
function CreditRow({ card, statement, onClick }: { card: CreditCard; statement: Date; onClick: () => void }) {
  return (
    <button onClick={onClick} className="pressable flex min-h-14 w-full items-center gap-3 rounded-[18px] px-3.5 py-2 text-left text-white" style={{ background: card.color }}>
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <BankBrand bankName={card.bankName} className="h-4 max-w-[120px]" />
        <span className="num shrink-0 text-[15px] opacity-90">•• {card.last4}</span>
      </span>
      <span className="shrink-0 text-right leading-tight">
        <span className="label block text-[9px] opacity-75">Kesim</span>
        <span className="num text-[15px]">{formatDate(statement, 'd MMM')}</span>
      </span>
    </button>
  )
}

function DebitRow({ card, onClick }: { card: CreditCard; onClick: () => void }) {
  return (
    <button onClick={onClick} className="pressable flex w-full items-center gap-3 rounded-[18px] bg-surface py-2 pr-3 pl-2 text-left">
      <BankMark bankName={card.bankName} color={card.color} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{card.bankName}</span>
        <span className="block text-[11px] text-subtle">Banka kartı</span>
      </span>
      <span className="num text-[15px]">•• {card.last4}</span>
    </button>
  )
}

/** Afişin şekil yerleri (kartın içinde 142×180 yuvarlak köşeli siyah kutu). İlk yer daire: en yakın son ödeme oraya gelir ve sarı halka alır. */
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
    <div aria-hidden className="relative my-2 mr-2 rounded-[20px] bg-[#141414]">
      {POSTER.map((shape, i) => (
        // Siyah kartlar (Papara) siyah panelde kaybolmasın: ince açık kenar
        <span key={i} className={cn('absolute', shape, cards[i] && luminance(cards[i].color) < 0.12 && 'ring-1 ring-white/30')} style={{ background: cards[i]?.color ?? '#262626' }} />
      ))}
      {cards.length > 0 && <span className="absolute top-3.5 left-3.5 size-14 rounded-full ring-[3px] ring-bh-yellow" />}
    </div>
  )
}
