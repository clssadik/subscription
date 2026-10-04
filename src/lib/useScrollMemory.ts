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
      el.scrollTop = y
      el.dispatchEvent(new Event('scroll'))
    }
  })
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const save = () => saved.set(key, el.scrollTop)
    const top = () => el.scrollTo({ top: 0, behavior: 'smooth' })
    el.addEventListener('scroll', save, { passive: true })
    window.addEventListener(`scroll-top:${key}`, top)
    return () => {
      el.removeEventListener('scroll', save)
      window.removeEventListener(`scroll-top:${key}`, top)
    }
  }, [key, scroller])
}
