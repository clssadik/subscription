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
 *    sayfa zaten en üstte olduğu için hiç kaydırmaz. Alan hemen yerine döner.
 * 2. Yine de kayarsa ve alan sayfa yerindeyken görünüyorsa sayfa geri yerine konur.
 * Alan klavyenin altında kalacaksa (ekranın alt yarısı) iPhone'un kaydırmasına dokunulmaz, yoksa yazılan görünmez.
 */
export function keepPageInPlace() {
  const vv = window.visualViewport
  if (!vv) return
  const isField = (el: unknown): el is HTMLInputElement | HTMLTextAreaElement =>
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el !== proxy
  // Klavyenin kapladığı boy; ilk açılışta bilinmez, telefon ekranının yarısı sayılır
  let keyboard = 0
  const visibleHeight = () => window.innerHeight - (keyboard || window.innerHeight * 0.5)

  document.addEventListener(
    'focusin',
    (e) => {
      const el = e.target
      if (!isField(el) || el.getBoundingClientRect().bottom + 16 > visibleHeight()) return
      const before = el.style.transform
      el.style.transform = 'translateY(-200vh)'
      window.setTimeout(() => (el.style.transform = before), 120)
    },
    true,
  )

  const fix = () => {
    if (isField(document.activeElement) && vv.height < window.innerHeight) keyboard = window.innerHeight - vv.height
    if (window.scrollY === 0 && vv.offsetTop === 0) return
    const el = document.activeElement
    if (!isField(el)) return
    // Sayfalar sabit konumlu (.app-screen): alanın yeri kaydırmadan bağımsız, görünen alanın boyuyla karşılaştırılır
    if (el.getBoundingClientRect().bottom + 16 <= vv.height) window.scrollTo(0, 0)
  }
  vv.addEventListener('resize', fix)
  vv.addEventListener('scroll', fix)
}
