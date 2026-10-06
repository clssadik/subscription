import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/** Uygulama logosu: kutusuz mavi çiçek (açılış ekranıyla aynı dosya, public/logo-flower.webp) */
export const FLOWER_URL = '/logo-flower.webp'

/**
 * "MONTHWISE" yazısı: ince Outfit, hepsi büyük harf, aralıklı (açılış ekranıyla aynı, index.html #splash).
 * lang="en": Türkçe büyük harfte "i" noktalı "İ" olmasın. Soldaki dolgu harf aralığının sağda bıraktığı boşluğu dengeler.
 */
export function Wordmark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span lang="en" className={cn('font-label pl-[0.24em] leading-none font-extralight tracking-[0.24em] uppercase', className)} style={style}>
      Monthwise
    </span>
  )
}

/** Logo ve adı yan yana */
export function Brand({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img src={FLOWER_URL} alt="" width={size} height={size} className="shrink-0" />
      <Wordmark style={{ fontSize: Math.round(size * 0.56) }} />
    </div>
  )
}
