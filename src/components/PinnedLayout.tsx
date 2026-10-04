import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { TOP_FOG, fog, type FogLevel } from '@/lib/fog'
import { useScrollLimit } from '@/lib/useScrollLimit'
import { useScrollMemory } from '@/lib/useScrollMemory'
import { cn } from '@/lib/utils'

/**
 * Üstte sabit duran başlık + blok ve altından kayan liste (Anasayfa'daki yapının aynısı).
 * Tek kayan alan var: başlık ve blok da onun içinde, en üste yapışık (sticky). Böylece sayfanın neresinden tutulursa tutulsun
 * liste kayar; iPhone iki uçta da esnetince başlık ve blok listeyle birlikte hareket eder (src/lib/useScrollLimit.ts).
 * Blok opak zemin üzerindedir; son 30px'te zemin sis seviyesine iner. Kaydırınca bloğun altına 32px'lik solma eklenir (sis → şeffaf).
 * Liste cam menünün arkasına kadar uzanır. Sis seviyesi src/lib/fog.ts içinde.
 */
export function PinnedLayout({
  scrollKey,
  header,
  top,
  children,
  fogLevel = 'normal',
}: {
  /** Kaydırma yerinin hatırlandığı ad (sekme adı) */
  scrollKey: string
  header: ReactNode
  top: ReactNode
  children: ReactNode
  fogLevel?: FogLevel
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const block = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  // Listenin üst boşluğu bloğun yüksekliği kadar; blok boyu değişirse (ör. yazı tipi yüklenince, sekme değişince) yeniden ölçülür
  const [blockHeight, setBlockHeight] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const edge = fog(TOP_FOG[fogLevel])
  const limit = useScrollLimit(scroller, content)
  useScrollMemory(scrollKey, scroller, blockHeight > 0)
  useLayoutEffect(() => {
    const el = block.current
    if (!el) return
    const measure = () => setBlockHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="relative -mb-24 flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        data-scroller
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
        className="relative -mx-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Blok, kaydırma sınırı kadar yüksek bir kutunun içinde yapışık: liste sona gelip esneyince blok da onunla gider */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10" style={{ height: limit }}>
        {/* Yüksekliği sıfır: akışta yer kaplamaz, liste altından geçer */}
        <div className="pointer-events-auto sticky top-0 h-0">
          <div ref={block} className="absolute inset-x-0 top-0 px-3 pb-2">
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
            {header}
            {top}
          </div>
        </div>
        </div>
        <div ref={content} style={{ paddingTop: blockHeight }}>
          {children}
        </div>
      </div>
    </div>
  )
}
