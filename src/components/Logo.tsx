import { luminance } from '@/lib/color'
import { logoFor } from '@/lib/services'
import { cn } from '@/lib/utils'


interface Props {
  serviceKey: string | null
  name: string
  size?: number
  className?: string
  /** Logonun rengini zorla (ör. marka renkli kutuda beyaz) */
  color?: string
}

/** Servis logosu: koyu kare üzerinde markanın kendi renginde. Logo yoksa renkli harf. */
export function Logo({ serviceKey, name, size = 34, className, color }: Props) {
  const logo = logoFor(serviceKey, name)
  const inner = Math.round(size * 0.55)
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.24) }

  if (logo.type === 'letter') {
    return (
      <div
        aria-hidden
        className={cn('flex shrink-0 items-center justify-center font-label font-semibold', className)}
        style={{ ...style, background: logo.color, color: luminance(logo.color) > 0.6 ? '#141414' : '#fff', fontSize: inner }}
      >
        {logo.letter}
      </div>
    )
  }
  return (
    <div aria-hidden className={cn('flex shrink-0 items-center justify-center bg-[var(--logo-tile)]', className)} style={style}>
      {logo.type === 'image' ? (
        <img src={logo.url} alt="" style={{ width: inner, height: inner }} />
      ) : (
        <svg viewBox="0 0 24 24" width={inner} height={inner} fill={color ?? (luminance(logo.color) < 0.2 ? '#fff' : logo.color)}>
          <path d={logo.path} />
        </svg>
      )}
    </div>
  )
}
