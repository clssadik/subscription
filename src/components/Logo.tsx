import { contrastInk, contrastRatio, luminance } from '@/lib/color'
import { logoFor } from '@/lib/services'
import { cn } from '@/lib/utils'


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
        <>
          <img src={logo.url} alt="" className={cn(tile && logo.onLight && 'dark:hidden')} style={{ width: inner, height: inner }} />
          {tile && logo.onLight && <img src={logo.onLight} alt="" className="hidden dark:block" style={{ width: inner, height: inner }} />}
        </>
      ) : (
        <svg viewBox="0 0 24 24" width={inner} height={inner} style={{ fill: color ?? (luminance(logo.color) < 0.2 ? (tile ? 'var(--logo-ink)' : '#fff') : logo.color) }}>
          <path d={logo.path} />
        </svg>
      )}
    </div>
  )
}
