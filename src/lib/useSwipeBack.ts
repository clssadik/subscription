import { useEffect, useRef, type RefObject } from 'react'
import { wakeScrollers } from './transition'

/** Bırakınca geri dönmek için en az bu kadar çekilmeli (ekran genişliğine oranla) ya da hızlıca fırlatılmalı (px/ms) */
const COMPLETE_AT = 0.35
const FLING = 0.5
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

/**
 * iPhone'daki gibi sağa çekerek geri dönme: detay sayfası parmağı izleyerek sağa kayar, alttan önceki sayfa (sola kaymış ve
 * kararmış hâlden) yerine gelir. Yeterince çekip bırakınca ya da hızlıca fırlatınca geri dönülür, yoksa sayfa yerine oturur.
 * Hareket sayfanın her yerinden başlayabilir (Safari'nin kenardaki kendi geri hareketine takılmasın). Sola/dikey hareketler
 * ve kendi yatay sürüklemesi olan öğeler ([data-no-swipe-back], ör. ödeme fişinin koçanı) etkilenmez.
 *
 * page: detay sayfası. under: altındaki önceki sayfa (yoksa sadece detay kayar). onBack: animasyonsuz geri dönüş;
 * bittiğinde önceki sayfa zaten yerinde olur.
 */
export function useSwipeBack(
  page: RefObject<HTMLElement | null>,
  { enabled, under, onBack, key }: { enabled: boolean; under: () => HTMLElement | null; onBack: () => void; key: string },
) {
  // Her çizimde güncel geri dönüş ve alt sayfa (hareket sürerken sekme değişmez, ama eski kapanışa takılmasın)
  const latest = useRef({ under, onBack })
  useEffect(() => {
    latest.current = { under, onBack }
  })
  useEffect(() => {
    const el = page.current
    if (!el || !enabled) return

    let start: { x: number; y: number; id: number } | null = null
    let active = false
    let below: HTMLElement | null = null
    let last = { x: 0, t: 0, v: 0 }
    const width = () => window.innerWidth

    // Detay sağa x kadar kaymışken iki sayfanın duruşu
    const place = (x: number) => {
      const p = Math.min(1, Math.max(0, x / width()))
      el.style.translate = `${x}px 0`
      el.style.boxShadow = '-8px 0 24px rgb(0 0 0 / 0.12)'
      if (below) {
        below.style.visibility = 'visible'
        below.style.translate = `${-30 * (1 - p)}% 0`
        below.style.filter = `brightness(${0.75 + 0.25 * p})`
      }
    }
    const clear = (node: HTMLElement | null) => {
      if (!node) return
      for (const a of node.getAnimations()) a.cancel()
      node.style.translate = ''
      node.style.boxShadow = ''
      node.style.visibility = ''
      node.style.filter = ''
    }

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if ((e.target as Element).closest('[data-no-swipe-back], input, textarea, select')) return
      start = { x: e.clientX, y: e.clientY, id: e.pointerId }
      active = false
    }
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (!active) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        // Sadece sağa ve belirgin yatay hareket; değilse bu dokunuş liste kaydırmasına kalır
        if (dx <= 0 || Math.abs(dx) < Math.abs(dy) * 1.2) {
          start = null
          return
        }
        active = true
        below = latest.current.under()
        try {
          el.setPointerCapture(e.pointerId)
        } catch {
          // parmak zaten kalkmışsa yakalanamaz; hareket yine izlenir
        }
        last = { x: e.clientX, t: e.timeStamp, v: 0 }
      }
      const dt = e.timeStamp - last.t
      if (dt > 0) last = { x: e.clientX, t: e.timeStamp, v: (e.clientX - last.x) / dt }
      place(Math.max(0, dx))
    }
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return
      const dx = Math.max(0, e.clientX - start.x)
      start = null
      if (!active) return
      active = false
      const done = dx / width() > COMPLETE_AT || last.v > FLING
      const to = done ? width() : 0
      // Kalan yolu bırakılan hıza yakın bir sürede tamamla
      const ms = Math.min(320, Math.max(160, (Math.abs(to - dx) / Math.max(Math.abs(last.v), 1)) * 1.2))
      const options = { duration: ms, easing: EASE, fill: 'forwards' as const }
      const anim = el.animate([{ translate: `${dx}px 0` }, { translate: `${to}px 0` }], options)
      if (below) {
        const p = dx / width()
        below.animate(
          [
            { translate: `${-30 * (1 - p)}% 0`, filter: `brightness(${0.75 + 0.25 * p})` },
            { translate: done ? '0 0' : '-30% 0', filter: done ? 'brightness(1)' : 'brightness(0.75)' },
          ],
          options,
        )
      }
      const b = below
      anim.onfinish = () => {
        if (done) {
          // Detay kalkar, alt sayfa sekme olarak görünür hâle gelir; ardından elle verilen duruş silinir
          latest.current.onBack()
          clear(b)
          wakeScrollers()
        } else {
          clear(el)
          clear(b)
        }
      }
    }
    const cancel = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return
      start = null
      if (active) {
        active = false
        clear(el)
        clear(below)
      }
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', cancel)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancel)
    }
    // key: her yeni detay sayfası yeni bir öğe
  }, [page, enabled, key])
}
