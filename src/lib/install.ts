/** Uygulama ana ekrandan (tam ekran) mı açılmış */
export function isInstalled() {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone / iPad (yeni iPad'ler kendini Mac olarak tanıtır, dokunmatik olmasından anlaşılır) */
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
export const isAndroid = () => /Android/.test(navigator.userAgent)

const SKIP_KEY = 'subly:install-skipped'

/**
 * Açılışta ana ekrana ekleme rehberi gösterilsin mi: telefonda tarayıcıdan açıldıysa ve bu oturumda "Safari'de devam et" denmediyse.
 * Bilgisayarda gösterilmez.
 */
export function shouldShowInstallGate() {
  if (isInstalled() || !(isIOS() || isAndroid())) return false
  try {
    return sessionStorage.getItem(SKIP_KEY) !== '1'
  } catch {
    return true
  }
}

export function skipInstallGate() {
  try {
    sessionStorage.setItem(SKIP_KEY, '1')
  } catch {
    // depolama kapalıysa sadece bu açılışta geçilir
  }
}
