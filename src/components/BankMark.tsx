import { bankLogo } from '@/lib/banks'
import { contrastInk } from '@/lib/color'
import { cn } from '@/lib/utils'

interface Props {
  bankName: string
  /** Kutunun zemini: genelde kartın rengi */
  color: string
  size: number
  className?: string
}

/** Banka logoları beyaz çizili; koyu yazı rengi gerektiğinde beyazı #141414'e indirir */
const inkFilter = (ink: string) => (ink === '#FFFFFF' ? undefined : 'brightness(0.08)')

/**
 * Küçük banka kutusu: servis logolarıyla aynı yuvarlak kare; banka renginde zemin, üstünde sembol ya da baş harf.
 * Yazı ve sembol rengi zemine göre (sarı Paycell'de koyu, siyah Papara'da beyaz).
 */
export function BankMark({ bankName, color, size, className }: Props) {
  const { symbol, letter } = bankLogo(bankName)
  const inner = Math.round(size * 0.6)
  const ink = contrastInk(color)
  return (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.24), background: color, color: ink }}
    >
      {symbol ? (
        <img src={symbol} alt="" className="object-contain" style={{ width: inner, height: inner, filter: inkFilter(ink) }} />
      ) : (
        <span className="font-label font-semibold leading-none" style={{ fontSize: Math.round(size * 0.5) }}>{letter}</span>
      )}
    </span>
  )
}

/** Karttaki banka: tam logo. Logo yoksa banka adı; çok ince logoda sembol + ad. className logonun yüksekliğini verir. ink: logo ve yazı rengi (zemine göre). */
export function BankBrand({ bankName, className, ink = '#FFFFFF' }: { bankName: string; className: string; ink?: string }) {
  const { logo, symbol, wide } = bankLogo(bankName)
  const filter = inkFilter(ink)
  if (logo && !wide) {
    return <img src={logo} alt={bankName} className={cn('relative block max-w-full object-contain object-left', className)} style={{ filter }} />
  }
  return (
    <span className="relative flex min-w-0 items-center gap-1.5">
      {symbol && <img src={symbol} alt="" className="h-5 w-auto shrink-0" style={{ filter }} />}
      <span className="truncate font-label text-[13px] font-medium">{bankName}</span>
    </span>
  )
}
