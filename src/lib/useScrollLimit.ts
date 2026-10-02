import { useLayoutEffect, useState, type RefObject } from 'react'

/**
 * Kayan alanın en fazla ne kadar kayabildiği (px). Üstteki yapışık (sticky) blok bu yükseklikteki bir kutunun içine konur:
 * blok ancak kutunun içinde yapışık kalabildiği için, liste sona gelip iPhone esnetmeye başlayınca blok da içerikle birlikte
 * yukarı gider. Böylece telefonun kendi esnemesi her iki uçta da bütün sayfayı birlikte taşır.
 */
export function useScrollLimit(scroller: RefObject<HTMLElement | null>, content: RefObject<HTMLElement | null>) {
  const [limit, setLimit] = useState(0)
  useLayoutEffect(() => {
    const el = scroller.current
    const inner = content.current
    if (!el || !inner) return
    const measure = () => setLimit(Math.max(0, el.scrollHeight - el.clientHeight))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    ro.observe(inner)
    return () => ro.disconnect()
  })
  return limit
}
