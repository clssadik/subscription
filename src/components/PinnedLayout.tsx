import { useRef, useState, type ReactNode } from 'react'
import { TOP_FOG, fog, type FogLevel } from '@/lib/fog'
import { cn } from '@/lib/utils'

/**
 * Üstte sabit duran blok ve altından kayan liste (Anasayfa'daki geçişin aynısı).
 * Blok opak zemin üzerindedir; son 30px'te zemin sis seviyesine iner. Liste bloğun 24px altına kadar uzanır, böylece satırlar
 * kartın yuvarlak alt köşelerinin arkasından geçer. Kaydırınca bloğun altına 32px'lik solma eklenir (sis → şeffaf).
 * Liste cam menünün arkasına kadar uzanır. Sis seviyesi src/lib/fog.ts içinde.
 * `collapse` verilirse blok Anasayfa'daki gibi katlanır: --p 0 (en üstte) → 1 (`collapse` px kaydırınca); boyutlar bu CSS değişkeniyle hesaplanır.
 */
export function PinnedLayout({
  top,
  children,
  fogLevel = 'normal',
  collapse,
}: {
  top: ReactNode
  children: ReactNode
  fogLevel?: FogLevel
  collapse?: number
}) {
  const block = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const edge = fog(TOP_FOG[fogLevel])
  return (
    <>
      <div ref={block} className="relative z-10 -mx-3 shrink-0 px-3 pb-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: `linear-gradient(to bottom, var(--page) calc(100% - 30px), ${edge})` }}
        />
        <div
          aria-hidden
          className={cn('pointer-events-none absolute inset-x-0 top-full h-8 transition-opacity', scrolled ? 'opacity-100' : 'opacity-0')}
          style={{ background: `linear-gradient(to bottom, ${edge}, transparent)` }}
        />
        {top}
      </div>
      <div
        onScroll={(e) => {
          const y = e.currentTarget.scrollTop
          if (collapse) block.current?.style.setProperty('--p', String(Math.min(1, y / collapse)))
          setScrolled(y > 0)
        }}
        className="-mt-8 -mb-24 min-h-48 flex-1 overflow-y-auto overscroll-contain pt-8 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Liste kısa olsa da blok tamamen katlanabilsin: içerik en az görünür alan + katlanma mesafesi kadar uzun */}
        {collapse ? <div style={{ minHeight: `calc(100% + ${collapse}px)` }}>{children}</div> : children}
      </div>
    </>
  )
}
