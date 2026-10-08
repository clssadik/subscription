import { Logo } from '@/components/Logo'
import { Money } from '@/components/Money'
import { Group, Row, SubPageHeader } from '@/components/SettingsList'
import { contrastRatio } from '@/lib/color'
import { monthlyCost } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { CURRENCIES } from '@/lib/types'

/**
 * Harcama özeti: aylık ve yıllık toplam, en pahalı abonelikler, kartlara göre dağılım.
 * Kur bilgisi olmadığı için para birimleri birbirine eklenmez; sıralama ve dağılım TL üzerinden.
 */
export function SpendingSummary({ onBack }: { onBack: () => void }) {
  const { state } = useStore()
  const page = PAGE[useTheme().resolved]
  const subs = state.subscriptions
  const totals = CURRENCIES.map((currency) => ({
    currency,
    monthly: subs.filter((s) => s.currency === currency).reduce((sum, s) => sum + monthlyCost(s), 0),
  })).filter((t) => t.monthly > 0)

  const tl = subs.filter((s) => s.currency === 'TRY')
  // Önce TL abonelikler (birbiriyle kıyaslanabilir), yetmezse diğer para birimleri
  const byCost = (list: typeof subs) => [...list].sort((a, b) => monthlyCost(b) - monthlyCost(a))
  const top = [...byCost(tl), ...byCost(subs.filter((s) => s.currency !== 'TRY'))].slice(0, 3)
  const tlTotal = tl.reduce((sum, s) => sum + monthlyCost(s), 0)
  const byCard = state.cards
    .map((c) => ({ card: c, monthly: tl.filter((s) => s.cardId === c.id).reduce((sum, s) => sum + monthlyCost(s), 0) }))
    .filter((x) => x.monthly > 0)
    .sort((a, b) => b.monthly - a.monthly)
  const noCard = tl.filter((s) => !s.cardId).reduce((sum, s) => sum + monthlyCost(s), 0)

  return (
    <>
      <SubPageHeader title="Harcama özeti" onBack={onBack} />

      {subs.length === 0 ? (
        <p className="mt-10 text-center text-sm text-subtle">Henüz abonelik yok.</p>
      ) : (
        <>
          <section className="mt-3 rounded-[22px] bg-hero p-3.5 text-hero-fg">
            <span className="label opacity-70">Aylık</span>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 leading-none">
              {totals.map((t, i) => (
                <span key={t.currency} className="flex items-baseline gap-2">
                  {i > 0 && <span className="num text-2xl">+</span>}
                  <Money amount={t.monthly} currency={t.currency} size={34} />
                </span>
              ))}
            </div>
            <div className="mt-3 border-t border-white/15 pt-2.5">
              <span className="label opacity-70">Yıllık</span>
              <p className="num mt-0.5 text-lg">{totals.map((t) => formatMoney(t.monthly * 12, t.currency)).join(' + ')}</p>
            </div>
            <p className="mt-2 text-[12px] opacity-70">{subs.length} abonelik</p>
          </section>

          <Group title="En pahalı">
            {top.map((s) => (
              <Row
                key={s.id}
                icon={<Logo serviceKey={s.serviceKey} name={s.name} size={30} />}
                label={s.name}
                value={<span className="num text-ink">{formatMoney(monthlyCost(s), s.currency)}/ay</span>}
              />
            ))}
          </Group>

          {/* TL abonelik varsa her zaman: kartı seçilmemişler de "Kart seçilmemiş" satırında görünsün */}
          {tl.length > 0 && (
            <Group title="Kartlara göre (TL)">
              {byCard.map(({ card, monthly }) => (
                <div key={card.id} className="px-3.5 py-3">
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="truncate">{card.bankName} •• {card.last4}</span>
                    <span className="num">{formatMoney(monthly)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-page">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(4, (monthly / tlTotal) * 100)}%`, background: barFill(card.color, page) }} />
                  </div>
                </div>
              ))}
              {noCard > 0 && <Row label="Kart seçilmemiş" value={<span className="num">{formatMoney(noCard)}</span>} />}
            </Group>
          )}
        </>
      )}
    </>
  )
}

// Kart çubuğu bu sayfa zemininde durur (koyu temada siyah)
const PAGE = { light: '#F1ECE2', dark: '#000000' } as const

/** Kart rengi zemine çok yakınsa (koyu temada siyah Papara) yazı rengi; değilse rengin kendisi (CardDetail'deki strokeOn gibi) */
function barFill(color: string, page: string) {
  return contrastRatio(color, page) < 1.6 ? 'var(--ink)' : color
}
