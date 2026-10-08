// Sayfayı kendiliğinden yenilemek (yeni sürüm, tema değişimi) açık bir taslağı silmesin. Yazı alanı odaktaysa ya da bir
// panel (ekleme formu, şartlar) açıksa yenileme beklenir; odak çıkınca, panel kapanınca ya da uygulama öne gelince yapılır.

const inField = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('input, textarea, [contenteditable="true"]')

/** Taslak var mı: yazı alanı odakta ya da bir panel açık (vaul paneli Radix diyaloğudur: role="dialog", açıkken data-state="open") */
const hasDraft = () => inField(document.activeElement) || !!document.querySelector('[role="dialog"][data-state="open"]')

let waiting = false
// Panel kapanınca DOM değişir: yenileme beklerken izlenir, bekleme bitince bırakılır
const watcher = new MutationObserver(reloadIfIdle)

function reloadIfIdle() {
  if (!waiting || hasDraft()) return
  waiting = false
  watcher.disconnect()
  window.location.reload()
}

/** Sayfayı yeniler; taslak varsa boşalana kadar bekler */
export function reloadWhenIdle() {
  if (!hasDraft()) {
    window.location.reload()
    return
  }
  waiting = true
  watcher.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state'] })
}

// Odak bir alandan çıkınca bir an sonra bakılır (odak taşınırken yenilenmesin)
document.addEventListener('focusout', () => setTimeout(reloadIfIdle))
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') reloadIfIdle()
})
