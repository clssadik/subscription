import { CardQuickStart } from '@/components/QuickStart'
import { ScrollPage } from '@/components/ScrollPage'
import { AddButton, ScreenHeader } from '@/components/ScreenHeader'
import { useState } from 'react'
import { HoldButton } from '@/components/HoldButton'
import { BankBrand } from '@/components/BankMark'
import { Segmented } from '@/components/FormBits'
import { PinnedLayout } from '@/components/PinnedLayout'
import { luminance } from '@/lib/color'
import { daysUntil, dueLabel, dueThisMonth, hasDue, nextCardCycle, nextStatement, overdueCardCycles, paidThisMonth } from '@/lib/dates'
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
      <ScrollPage>
        <ScreenHeader title="Kartlar" action={<AddButton label="Kart ekle" onClick={() => nav.addCard()} />} />
        <CardQuickStart nav={nav} />
      </ScrollPage>
    )
  }

  // Kredi kartlarının sıradaki (ödenmemiş) dönemleri, en yakını başta; bu ay içinde olanlar afişte sayılır
  const dues = cards
    .filter(hasDue)
    .map((card) => ({ card, ...nextCardCycle(card, payments) }))
    .sort((a, b) => a.due.getTime() - b.due.getTime())
  // Son ödemesi geçmiş, ödenmemiş dönemler (en eskisi başta). Varsa afiş bunu gösterir, "yapıldı" demez.
  const overdue = cards
    .filter(hasDue)
    .flatMap((card) => overdueCardCycles(card, payments).map((c) => ({ card, ...c })))
    .sort((a, b) => a.due.getTime() - b.due.getTime())
  const upcoming = dues.filter(({ due, paid }) => !paid && daysUntil(due) >= 0 && dueThisMonth(due))
  // Bu ay ödenecek kalmadıysa afiş sıradakini gösterir ("Yok" yazmak yerine)
  const next = upcoming.length === 0 ? dues.find(({ due }) => daysUntil(due) >= 0) : undefined
  const paidNow = cards.filter((c) => hasDue(c) && paidThisMonth(payments, c.id)).length
  // Afişte gösterilen kartlar: gecikme varsa gecikenler, yoksa sıradaki ya da bu ay ödenecekler
  const posterCards = overdue.length > 0 ? [...new Map(overdue.map((o) => [o.card.id, o.card])).values()] : next ? [next.card] : upcoming.map((u) => u.card)
  // Liste: kredi kartları (hesap kesimi en yakın olan üstte) ya da banka kartları; üstteki seçiciyle
  const credit = cards
    .filter(hasDue)
    .map((card) => ({ card, statement: nextStatement(card) }))
    .sort((a, b) => a.statement.getTime() - b.statement.getTime())
  const debit = cards.filter((c) => !hasDue(c))
  const shown = credit.length === 0 ? 'debit' : debit.length === 0 ? 'credit' : tab

  return (
    <>
      <PinnedLayout
        scrollKey="cards"
        pinned={false}
        header={<ScreenHeader title="Kartlar" action={<AddButton label="Kart ekle" onClick={() => nav.addCard()} />} />}
        fogLevel="light"
        top={
          <>
            {/* Bauhaus afiş: solda sayı, sağda her ödenecek kart için kendi renginde bir şekil. Beyaz zemin (koyu temada da). */}
            <section className="grid h-[196px] shrink-0 grid-cols-[1fr_150px] overflow-hidden rounded-[26px] bg-surface dark:bg-[#F2F2F2] dark:text-[#141414]">
              <div className="flex min-w-0 flex-col py-4 pl-[18px]">
                {overdue.length > 0 ? (
                  <>
                    <div className="label text-subtle dark:text-[#141414]/60">Son ödemesi geçen</div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="num num-bold text-[96px] leading-[0.9] text-bh-red">{formatDate(overdue[0].due, 'd')}</span>
                      <span className="text-lg font-medium">{formatDate(overdue[0].due, 'MMMM')}</span>
                    </div>
                    <div className="mt-auto pr-2 text-xs leading-snug">
                      <span className="num-bold text-bh-red">
                        {dueLabel(overdue[0].due)}
                        {overdue.length > 1 && ` · ${overdue.length} ekstre`}
                      </span>
                      <span className="block truncate font-medium">{overdue[0].card.bankName} •• {overdue[0].card.last4}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="label text-subtle dark:text-[#141414]/60">{next ? 'Sonraki son ödeme' : upcoming.length > 0 ? 'Bu ay ödenecek' : 'Kartlar'}</div>
                    {next ? (
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="num num-bold text-[96px] leading-[0.9]">{formatDate(next.due, 'd')}</span>
                        <span className="text-lg font-medium">{formatDate(next.due, 'MMMM')}</span>
                      </div>
                    ) : (
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="num num-bold text-[96px] leading-[0.9]">{upcoming.length || cards.length}</span>
                        <span className="text-lg font-medium">kart</span>
                      </div>
                    )}
                    {(next ?? upcoming[0]) && (
                      <div className="mt-auto pr-2 text-xs leading-snug">
                        <span className="text-subtle dark:text-[#141414]/60">
                          {next ? (paidNow > 0 ? 'Bu ayki ödemeler yapıldı' : formatDate(next.due, 'EEEE')) : 'İlk son ödeme'}
                        </span>
                        <span className="block truncate font-medium">
                          {next ? `${next.card.bankName} •• ${next.card.last4}` : `${upcoming[0].card.bankName} · ${formatDate(upcoming[0].due, 'd MMMM')}`}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <Poster cards={posterCards} />
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
                  <CardRow card={card} statement={statement} onClick={() => onSelect(card.id)} />
                </li>
              ))
            : debit.map((card) => (
                <li key={card.id}>
                  <CardRow card={card} onClick={() => onSelect(card.id)} />
                </li>
              ))}
        </ul>
      </PinnedLayout>
    </>
  )
}

/** Kart satırı: bankanın renginde, orijinal logo ve son 4 hane; kredi kartında sağda sıradaki hesap kesimi */
function CardRow({ card, statement, onClick }: { card: CreditCard; statement?: Date; onClick: () => void }) {
  return (
    <HoldButton onOpen={onClick} className="pressable flex min-h-14 w-full items-center gap-3 rounded-[18px] px-3.5 py-2 text-left text-white" style={{ background: card.color }}>
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <BankBrand bankName={card.bankName} className="h-4 max-w-[120px]" />
        <span className="num shrink-0 text-[15px] opacity-90">•• {card.last4}</span>
      </span>
      {statement && (
        <span className="shrink-0 text-right leading-tight">
          <span className="label block text-[9px] opacity-75">Kesim</span>
          <span className="num text-[15px]">{formatDate(statement, 'd MMM')}</span>
        </span>
      )}
    </HoldButton>
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
