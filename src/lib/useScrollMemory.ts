import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

// Her sekmenin kaydırma yeri (uygulama açık kaldıkça). Sekmeye ya da detaydan listeye geri dönünce kalınan yerden devam edilir.
const saved = new Map<string, number>()

/** Açık sekmeye tekrar basınca o sekmenin listesi en başa kayar (iPhone'daki gibi) */
export const scrollToTop = (key: string) => window.dispatchEvent(new Event(`scroll-top:${key}`))

/**
 * ready: liste son boyuna gelince true (ör. üst bloğun yüksekliği ölçülünce); yer ancak o zaman geri yüklenir.
 * Geri yükleme bir "scroll" olayı da gönderir: kaydırmaya bağlı görünüm (küçülen blok, solma) hemen doğru çizilsin.
 */
export function useScrollMemory(key: string, scroller: RefObject<HTMLElement | null>, ready = true) {
  const restored = useRef(false)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || restored.current || !ready) return
    restored.current = true
    const y = saved.get(key) ?? 0
    if (y > 0) {
      el.scrollTo({ top: y })
      el.dispatchEvent(new Event('scroll'))
    }
  })
  // Dinleyiciler belgeye bir kez bağlanır ve her olayda o an ekranda olan kayan alana bakar: alan sonradan oluşsa ya da değişse de
  // (ör. Anasayfa boş ekrandan listeye geçince) doğru alan izlenir. Kaydırma olayı kabarcıklanmadığı için yakalama aşamasında dinlenir.
  useEffect(() => {
    const save = (e: Event) => {
      const el = scroller.current
      if (el && e.target === el) saved.set(key, el.scrollTop)
    }
    const top = () => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
    window.addEventListener('scroll', save, { capture: true, passive: true })
    window.addEventListener(`scroll-top:${key}`, top)
    return () => {
      window.removeEventListener('scroll', save, { capture: true })
      window.removeEventListener(`scroll-top:${key}`, top)
    }
  }, [key, scroller])
}
