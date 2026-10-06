// iPhone klavyeyi sadece parmak dokunuşunun içinde odaklanan bir alan için açar. Ekran geçişten ya da
// sunucu cevabından sonra açıldığında asıl alan henüz yoktur, autoFocus da klavyeyi açamaz.
// Çözüm: dokunuş anında görünmez bir yedek alana odaklanıp klavyeyi açmak; yeni ekrandaki alan
// (autoFocus ile) odağı ondan devralınca klavye kapanmadan açık kalır.

let proxy: HTMLInputElement | null = null

/** Dokunuşun içinde çağır: klavyeyi açar ve bir sonraki alan odaklanana kadar açık tutar */
export function holdKeyboard(inputMode: 'email' | 'numeric' | 'text' = 'text') {
  if (!proxy) {
    proxy = document.createElement('input')
    proxy.setAttribute('aria-hidden', 'true')
    proxy.tabIndex = -1
    // 16px: daha küçük yazıda iPhone sayfayı yakınlaştırır
    proxy.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;pointer-events:none'
    document.body.appendChild(proxy)
  }
  proxy.inputMode = inputMode
  proxy.focus({ preventScroll: true })
}

/**
 * Klavye açılınca iPhone, odaklanan alan klavyenin üstünde zaten görünse bile bütün sayfayı yukarı kaydırıyor
 * (giriş ekranında logo ve başlık ekranın dışına çıkıyordu). Sayfanın hiç kımıldamaması için:
 * 1. Odaklanma anında alan bir an çok yukarı taşınır: iPhone kaydırma yerini hesaplarken alanı sayfanın en üstünde sanır,
 *    sayfa zaten en üstte olduğu için hiç kaydırmaz. Klavye açılınca alan yerine döner.
 * 2. Alan zaten odaklıyken (autoFocus, klavye kapalı) dokunulursa odaklanma olayı gelmez: dokunuşta odak bırakılır,
 *    dokunuş alanı yeniden odaklar ve 1. adım çalışır.
 * 3. Yine de kayarsa ve alan sayfa yerindeyken görünüyorsa sayfa geri yerine konur.
 * Alan klavyenin altında kalacaksa iPhone'un kaydırmasına dokunulmaz, yoksa yazılan görünmez.
 * (2026-10-06 telefondan ölçüldü: kayma klavye açıldıktan ~0,1 sn sonra oluyor.)
 */
const KEYBOARD_KEY = 'keyboard-height'

export function keepPageInPlace() {
  const vv = window.visualViewport
  if (!vv) return
  // Sadece [data-keep-page] içindeki alanlar (giriş ekranları). Ekleme paneli (alttan açılan çekmece) klavyeye göre kendini
  // taşıyor; bu düzeltme orada da çalışınca ikisi çakışıp ekran bozuluyordu.
  const isField = (el: unknown): el is HTMLInputElement | HTMLTextAreaElement =>
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el !== proxy && !!el.closest('[data-keep-page]')
  const keyboardOpen = () => vv.height < window.innerHeight - 50
  // Klavyenin kapladığı boy: bir kez ölçülünce saklanır; hiç ölçülmediyse ekranın %45'i sayılır
  let keyboard = 0
  try {
    keyboard = Number(localStorage.getItem(KEYBOARD_KEY)) || 0
  } catch {
    // depolama kapalıysa tahminle başlanır
  }
  const fitsAboveKeyboard = (el: Element) =>
    el.getBoundingClientRect().bottom + 8 <= window.innerHeight - (keyboard || Math.round(window.innerHeight * 0.45))

  // Son dokunuşun zamanı: dokunuşsuz odaklanma (sayfa açılırken autoFocus) klavye açmaz, kaydırma da olmaz
  let lastTouch = -Infinity
  document.addEventListener(
    'touchstart',
    (e) => {
      lastTouch = performance.now()
      const el = e.target
      if (isField(el) && el === document.activeElement && !keyboardOpen()) el.blur()
    },
    true,
  )

  document.addEventListener(
    'focusin',
    (e) => {
      const el = e.target
      if (!isField(el) || !fitsAboveKeyboard(el)) return
      if (!keyboardOpen() && performance.now() - lastTouch > 1000) return
      const before = el.style.transform
      el.style.transform = 'translateY(-200vh)'
      let done = false
      const restore = () => {
        if (done) return
        done = true
        vv.removeEventListener('resize', onResize)
        el.style.transform = before
      }
      // Klavye zaten açıksa kısa bir an yeter; değilse klavye açılıp iPhone kaydırma kararını verene kadar beklenir
      const onResize = () => requestAnimationFrame(() => requestAnimationFrame(restore))
      if (keyboardOpen()) window.setTimeout(restore, 120)
      else {
        vv.addEventListener('resize', onResize)
        window.setTimeout(restore, 600)
      }
    },
    true,
  )

  const fix = () => {
    if (isField(document.activeElement) && keyboardOpen()) {
      const next = window.innerHeight - vv.height
      if (next !== keyboard) {
        keyboard = next
        try {
          localStorage.setItem(KEYBOARD_KEY, String(next))
        } catch {
          // depolama kapalıysa sadece bu açılışta hatırlanır
        }
      }
    }
    if (window.scrollY === 0 && vv.offsetTop === 0) return
    const el = document.activeElement
    if (!isField(el)) return
    // Sayfalar sabit konumlu (.app-screen): alanın yeri kaydırmadan bağımsız, görünen alanın boyuyla karşılaştırılır
    if (el.getBoundingClientRect().bottom + 8 <= vv.height) window.scrollTo(0, 0)
  }
  vv.addEventListener('resize', fix)
  vv.addEventListener('scroll', fix)
}
