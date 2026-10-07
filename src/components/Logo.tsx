import type { CSSProperties } from 'react'
import { contrastInk, contrastRatio, luminance } from '@/lib/color'
import { logoFor } from '@/lib/services'
import { cn } from '@/lib/utils'

// Logo kutusunun iki temadaki rengi (index.css'teki --logo-tile ile aynı)
const LIGHT_TILE = '#141414'
const DARK_TILE = '#FFFFFF'

interface Props {
  serviceKey: string | null
  name: string
  size?: number
  className?: string
  /** Logonun rengini zorla (ör. marka renkli kutuda beyaz) */
  color?: string
  /** false = kutusuz, sadece logo (zemin rengi çağıran yerde) */
  tile?: boolean
}

/** Kutudaki marka glifi: markanın rengi o temada kutuya karşı 3:1'e ulaşıyorsa o, ulaşmıyorsa kutunun mürekkebi (--logo-ink).
 *  Kutu temaya göre değiştiği için iki renk ayrı hesaplanır; index.css'teki .logo-glyph hangisinin görüneceğini seçer. */
function glyphVars(brand: string) {
  return {
    '--glyph-light': contrastRatio(brand, LIGHT_TILE) >= 3 ? brand : 'var(--logo-ink)',
    '--glyph-dark': contrastRatio(brand, DARK_TILE) >= 3 ? brand : 'var(--logo-ink)',
  } as CSSProperties
}

/** Servis logosu: kutu içinde markanın kendi renginde (kutu açık temada siyah, koyu temada beyaz). Logo yoksa renkli harf. */
export function Logo({ serviceKey, name, size = 34, className, color, tile = true }: Props) {
  const logo = logoFor(serviceKey, name)
  const inner = Math.round(size * 0.55)
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.24) }

  if (logo.type === 'letter') {
    // Neredeyse siyah marka (Midjourney, DAZN) koyu sayfada kaybolur: o zaman kutu, icon kutuları gibi temanın logo renklerinde olur
    const nearBlack = contrastRatio(logo.color, '#000000') < 1.5
    return (
      <div
        aria-hidden
        className={cn('flex shrink-0 items-center justify-center font-label font-semibold', className)}
        style={{
          ...style,
          background: nearBlack ? 'var(--logo-tile)' : logo.color,
          color: nearBlack ? 'var(--logo-ink)' : contrastInk(logo.color),
          fontSize: inner,
        }}
      >
        {logo.letter}
      </div>
    )
  }
  return (
    <div aria-hidden className={cn('flex shrink-0 items-center justify-center', tile && 'bg-[var(--logo-tile)]', className)} style={style}>
      {logo.type === 'image' ? (
        // Koyu kopya (on-light) açık zeminde kullanılır: kutu koyu temada beyaz, kutusuz logo açık temada beyaz yüzeyde.
        // Kutusuz logoda bu yüzden açık temada koyu kopya, koyu temada orijinal görünür.
        <>
          <img src={tile ? logo.url : (logo.onLight ?? logo.url)} alt="" className={cn(logo.onLight && 'dark:hidden')} style={{ width: inner, height: inner }} />
          {logo.onLight && <img src={tile ? logo.onLight : logo.url} alt="" className="hidden dark:block" style={{ width: inner, height: inner }} />}
        </>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width={inner}
          height={inner}
          className="logo-glyph"
          style={color ? { fill: color } : tile ? glyphVars(logo.color) : { fill: luminance(logo.color) < 0.2 ? '#fff' : logo.color }}
        >
          <path d={logo.path} />
        </svg>
      )}
    </div>
  )
}
