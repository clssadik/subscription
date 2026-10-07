import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Kayan alanın en fazla ne kadar kayabildiği (px). Üstteki yapışık (sticky) blok bu yükseklikteki bir kutunun içine konur:
 * blok ancak kutunun içinde yapışık kalabildiği için, liste sona gelip iPhone esnetmeye başlayınca blok da içerikle birlikte
 * yukarı gider. Böylece telefonun kendi esnemesi her iki uçta da bütün sayfayı birlikte taşır.
 */
export function useScrollLimit(scroller: RefObject<HTMLElement | null>, content: RefObject<HTMLElement | null>) {
  const [limit, setLimit] = useState(0)
  // Izlenen öğeler ve gözlemci: öğeler değişmedikçe yenisi kurulmaz (her çizimde gözlemci kurup düzeni zorlamak yok)
  const watched = useRef<{ el: HTMLElement; inner: HTMLElement; ro: ResizeObserver } | null>(null)
  // Öğeler sonradan gelebilir ya da değişebilir (ör. Anasayfa boş ekrandan listeye geçince): bu yüzden her çizimde bakılır
  useLayoutEffect(() => {
    const el = scroller.current
    const inner = content.current
    if (watched.current?.el === el && watched.current?.inner === inner) return
    watched.current?.ro.disconnect()
    watched.current = null
    if (!el || !inner) return
    const measure = () => setLimit(Math.max(0, el.scrollHeight - el.clientHeight))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    ro.observe(inner)
    watched.current = { el, inner, ro }
  })
  // Ekran kapanınca gözlemci de kapanır
  useLayoutEffect(
    () => () => {
      watched.current?.ro.disconnect()
      watched.current = null
    },
    [],
  )
  return limit
}
