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
 * (giriş ekranında logo ve başlık ekranın dışına çıkıyordu). Alan sayfa yerindeyken de görünüyorsa sayfa geri yerine konur.
 * Alan gerçekten klavyenin altında kalıyorsa iPhone'un kaydırmasına dokunulmaz.
 */
export function keepPageInPlace() {
  const vv = window.visualViewport
  if (!vv) return
  const fix = () => {
    if (window.scrollY === 0 && vv.offsetTop === 0) return
    const el = document.activeElement
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) || el === proxy) return
    // Sayfalar sabit konumlu (.app-screen): alanın yeri kaydırmadan bağımsız, görünen alanın boyuyla karşılaştırılır
    if (el.getBoundingClientRect().bottom + 16 <= vv.height) window.scrollTo(0, 0)
  }
  vv.addEventListener('resize', fix)
  vv.addEventListener('scroll', fix)
}
