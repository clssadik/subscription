import { bankLogo } from '@/lib/banks'
import { cn } from '@/lib/utils'

interface Props {
  bankName: string
  /** Kutunun zemini: genelde kartın rengi */
  color: string
  size: number
  className?: string
}

/** Küçük banka kutusu: servis logolarıyla aynı yuvarlak kare; banka renginde zemin, üstünde beyaz sembol. Sembol yoksa baş harf. */
export function BankMark({ bankName, color, size, className }: Props) {
  const { symbol, letter } = bankLogo(bankName)
  const inner = Math.round(size * 0.6)
  return (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.24), background: color }}
    >
      {symbol ? (
        <img src={symbol} alt="" className="object-contain" style={{ width: inner, height: inner }} />
      ) : (
        <span className="font-label font-semibold leading-none text-white" style={{ fontSize: Math.round(size * 0.5) }}>{letter}</span>
      )}
    </span>
  )
}

/** Karttaki banka: beyaz tam logo. Logo yoksa banka adı; çok ince logoda sembol + ad. className logonun yüksekliğini verir. */
export function BankBrand({ bankName, className }: { bankName: string; className: string }) {
  const { logo, symbol, wide } = bankLogo(bankName)
  if (logo && !wide) {
    return <img src={logo} alt={bankName} className={cn('relative block max-w-full object-contain object-left', className)} />
  }
  return (
    <span className="relative flex min-w-0 items-center gap-1.5">
      {symbol && <img src={symbol} alt="" className="h-5 w-auto shrink-0" />}
      <span className="truncate font-label text-[13px] font-medium">{bankName}</span>
    </span>
  )
}
