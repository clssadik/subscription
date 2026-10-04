import { flushSync } from 'react-dom'

/** Sayfa geçiş türleri. Animasyonlar src/index.css'te (::view-transition, html[data-motion=…]). */
export type Motion = 'push' | 'pop' | 'fade' | 'tab-right' | 'tab-left'

/**
 * Ekranı değiştiren güncellemeyi iPhone tarzı bir geçişle yapar (View Transitions, iOS 18+).
 * Tarayıcı desteklemiyorsa ya da hareket azaltılmışsa güncellemeyi hemen yapar ve false döner.
 */
export function transition(motion: Motion, update: () => void) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return false
  }
  document.documentElement.dataset.motion = motion
  const t = document.startViewTransition(() => flushSync(update))
  // Sayfa arka plandayken ya da arka arkaya basınca geçiş atlanır; güncelleme yine yapılır, hata sayılmasın
  const ignore = () => {}
  t.ready.catch(ignore)
  t.finished.catch(ignore)
  return true
}
