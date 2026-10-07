import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Uygulama logosu: şeffaf zeminde beyaz işaret (açılış ekranıyla aynı dosya, public/logo-mark.png; scripts/app-logo.mjs üretir).
 * Açık temada siyah görünmesi için brightness-0 ile boyanır.
 */
export const LOGO_URL = '/logo-mark.png'

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
      <img src={LOGO_URL} alt="" width={size} height={size} className="shrink-0 brightness-0 dark:brightness-100" />
      <Wordmark style={{ fontSize: Math.round(size * 0.56) }} />
    </div>
  )
}
