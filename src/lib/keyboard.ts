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
  // Sadece [data-keep-page] içindeki alanlar: giriş ekranları ve ekleme paneli. Ekleme panelinde vaul'un kendi benzer hilesi
  // kapalı (AddSheet → disablePreventScroll={false}); ikisi birlikte çalışınca çakışıp ekran bozuluyordu.
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

  // Şu an kaydırılmış (henüz geri alınmamış) alanlar
  const shifted = new WeakSet<HTMLElement>()
  document.addEventListener(
    'focusin',
    (e) => {
      const el = e.target
      // Alttan açılan panelde her zaman: panel (vaul) klavyeye göre kendini taşıyor, iPhone sayfayı hiç kaydırmamalı.
      // Kaydırırsa panel o kaymaya göre yerleşiyor, kayma sonra geri alınınca panel klavyenin arkasında kalıyordu (telefonda ölçüldü).
      const inDrawer = isField(el) && !!el.closest('[data-vaul-drawer]')
      if (!isField(el) || (!inDrawer && !fitsAboveKeyboard(el))) return
      if (!keyboardOpen() && performance.now() - lastTouch > 1000) return
      // Alan zaten kaydırılmışken (geri alma bitmeden ikinci odaklanma) yeniden yakalanmaz: kaydırılmış hâl "asıl" konum
      // sanılır ve geri konunca alan ekranın dışında kalırdı. İlk geri alma yeterli.
      if (shifted.has(el)) return
      shifted.add(el)
      const before = el.style.transform
      el.style.transform = 'translateY(-200vh)'
      let done = false
      // restore'dan önce tanımlı olmalı: panelde restore hemen (iki kare sonra) çağrılıyor
      const onResize = () => requestAnimationFrame(() => requestAnimationFrame(restore))
      const restore = () => {
        if (done) return
        done = true
        shifted.delete(el)
        vv.removeEventListener('resize', onResize)
        el.style.transform = before
      }
      // Panelde iki kare yeter (vaul'un da yaptığı gibi): alan uzun süre görünmez kalınca göz kırpıyordu. Panelin içi
      // klavye açılıp panel kısalınca kaydırılır.
      if (inDrawer) {
        requestAnimationFrame(() => requestAnimationFrame(restore))
        // Panel klavyeyle birlikte ~0,5 sn kayarak yerleşiyor (src/index.css); yerleştikten sonra ölçülür.
        // Klavye hiç açılmadan alan odaktan çıkarsa bu dinleyici de kalkar (birikmesin). Restore'da kaldırılmaz: klavye
        // restore'dan sonra açılıyor ve yeniden konumlandırma o zaman gerekiyor.
        if (!keyboardOpen()) {
          const reveal = () => window.setTimeout(() => revealInDrawer(el), 550)
          vv.addEventListener('resize', reveal, { once: true })
          el.addEventListener('focusout', () => vv.removeEventListener('resize', reveal), { once: true })
        }
        return
      }
      // Klavye zaten açıksa kısa bir an yeter; değilse klavye açılıp iPhone kaydırma kararını verene kadar beklenir
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
    // Panelde sayfa geri çekilmez: panel o anki kaymaya göre yerleşmiş olur
    if (!isField(el) || el.closest('[data-vaul-drawer]')) return
    // Sayfalar sabit konumlu (.app-screen): alanın yeri kaydırmadan bağımsız, görünen alanın boyuyla karşılaştırılır
    if (el.getBoundingClientRect().bottom + 8 <= vv.height) window.scrollTo(0, 0)
  }
  vv.addEventListener('resize', fix)
  vv.addEventListener('scroll', fix)

  /** Alan panelin görünen kısmının dışındaysa sadece panelin kayan alanını kaydırır (sayfayı değil) */
  function revealInDrawer(el: HTMLElement) {
    const scroller = el.closest<HTMLElement>('.overflow-y-auto')
    if (!scroller) return
    const box = scroller.getBoundingClientRect()
    const field = el.getBoundingClientRect()
    const bottom = Math.min(box.bottom, vv!.height) - 12
    if (field.bottom > bottom) scroller.scrollTop += field.bottom - bottom
    else if (field.top < box.top + 12) scroller.scrollTop -= box.top + 12 - field.top
  }
}

/**
 * Kaydırırken yazı imleci gizlenir. iPhone imleci içerikten ayrı çiziyor: kayan alan (ekleme paneli, Profil, giriş ekranları…)
 * kaydırılırken imleç yerinde kalıp alandan kopuyor, ayrı hareket ediyormuş gibi görünüyordu. Kaydırma durunca yerinde geri gelir.
 * Tek dinleyici her kayan alanı yakalar (yakalama aşaması); yazı alanı odakta değilse hiçbir şey yapmaz.
 */
export function hideCaretWhileScrolling() {
  const root = document.documentElement
  let timer = 0
  const typing = () => {
    const el = document.activeElement
    return el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file'].includes(el.type))
  }
  const onScroll = () => {
    if (!typing()) return
    root.style.caretColor = 'transparent'
    window.clearTimeout(timer)
    timer = window.setTimeout(() => (root.style.caretColor = ''), 150)
  }
  document.addEventListener('scroll', onScroll, { capture: true, passive: true })
  // Klavye açıkken sayfanın görünen kısmı da kayabiliyor (iPhone odaktaki alanı göstermek için kaydırıyor)
  window.visualViewport?.addEventListener('scroll', onScroll, { passive: true })
}
