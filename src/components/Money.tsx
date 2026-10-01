import { splitMoney } from '@/lib/format'
import type { Currency } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Büyük tutar: ana kısım kalın, kuruş küçük ve soluk. "₺704,86" → ₺704 + ,86 */
export function Money({
  amount,
  currency = 'TRY',
  size = 34,
  className,
}: {
  amount: number
  currency?: Currency
  size?: number
  className?: string
}) {
  const { main, cents } = splitMoney(amount, currency)
  return (
    <span className={cn('num whitespace-nowrap', className)}>
      <span className="num-bold" style={{ fontSize: size }}>{main}</span>
      <span className="opacity-60" style={{ fontSize: Math.round(size * 0.47) }}>{cents}</span>
    </span>
  )
}
