import { useSyncExternalStore } from 'react'

// Tema tercihi bu cihazda saklanır. "auto" = telefonun ayarını izle.
// Sayfa açılırken ilk uygulama index.html'deki küçük betikte yapılır (yanıp sönme olmasın diye).
export type ThemePref = 'auto' | 'light' | 'dark'

const KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

let pref = read()

function isDark() {
  return pref === 'dark' || (pref === 'auto' && media.matches)
}

function apply() {
  const dark = isDark()
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0E0E10' : '#EEEEF0')
  listeners.forEach((l) => l())
}

media.addEventListener('change', () => pref === 'auto' && apply())
apply()

export function setThemePref(next: ThemePref) {
  pref = next
  try {
    if (next === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {
    // Depolama kapalıysa tercih sadece bu oturumda geçerli
  }
  apply()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => pref)
  const resolved = useSyncExternalStore(subscribe, (): 'dark' | 'light' => (isDark() ? 'dark' : 'light'))
  return { pref: current, resolved, setPref: setThemePref }
}
