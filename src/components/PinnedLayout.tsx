import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Üstte sabit duran blok ve altından kayan liste (Anasayfa'daki geçişin aynısı).
 * Blok opak zemin üzerindedir; son 30px'te zemin %60'a iner. Liste bloğun 24px altına kadar uzanır, böylece satırlar
 * kartın yuvarlak alt köşelerinin arkasından geçer. Kaydırınca bloğun altına 40px'lik solma eklenir (%60 → şeffaf).
 * Liste cam menünün arkasına kadar uzanır.
 * fade={false}: renkli satırlar için (solma onları kirletir). Blok tamamen opak, satırlar bloğun alt kenarında temizce kaybolur.
 */
export function PinnedLayout({ top, children, fade = true }: { top: ReactNode; children: ReactNode; fade?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  return (
    <>
      <div className={cn('relative z-10 -mx-3 shrink-0 px-3', fade ? 'pb-2' : 'bg-page')}>
        {fade && (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-page from-[calc(100%-30px)] to-page/60" />
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-0 top-full h-10 bg-linear-to-b from-page/60 to-transparent transition-opacity',
                scrolled ? 'opacity-100' : 'opacity-0',
              )}
            />
          </>
        )}
        {top}
      </div>
      <div
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
        className={cn(
          '-mb-24 min-h-48 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          fade ? '-mt-8 pt-8' : 'pt-2',
          'pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)]',
        )}
      >
        {children}
      </div>
    </>
  )
}
