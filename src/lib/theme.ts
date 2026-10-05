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

// Ana ekran uygulamasında iPhone saat çubuğunun rengini sadece sayfa yüklenirken okuyor; çalışırken değiştirmek işe yaramıyor.
// Bu yüzden orada açık/koyu değişince sayfa bir kez yeniden yüklenir (index.html'deki betik yeni rengi baştan uygular).
const standalone = matchMedia('(display-mode: standalone)').matches
let applied: boolean | null = null

function apply() {
  const dark = isDark()
  if (standalone && applied !== null && applied !== dark) {
    location.reload()
    return
  }
  applied = dark
  document.documentElement.classList.toggle('dark', dark)
  // Saat çubuğunun rengi. iPhone ana ekran uygulamasında var olan etiketin içeriğini değiştirmek çubuğu boyamıyor;
  // etiket silinip yenisi eklenince boyuyor.
  const color = dark ? '#000000' : '#F1ECE2'
  const old = document.querySelector('meta[name="theme-color"]')
  if (old?.getAttribute('content') !== color) {
    old?.remove()
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = color
    document.head.appendChild(meta)
  }
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
