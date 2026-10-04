/** Uygulama ana ekrandan (tam ekran) mı açılmış */
export function isInstalled() {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
