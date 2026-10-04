/**
 * Hafif titreşim (dokunma hissi).
 * iPhone'da Safari titreşim komutunu (navigator.vibrate) desteklemiyor; iOS 18'den beri bir "switch" kutucuğunun
 * etiketine tıklamak telefonun kendi hafif titreşimini veriyor. Her seferinde yeni bir gizli kutucuk eklenip tıklanır
 * ve hemen kaldırılır. Android'de navigator.vibrate kullanılır.
 * Sadece bir dokunuşun içinden (onClick vb.) çağrılınca çalışır. iPhone'da Ayarlar > Sesler ve Dokunuş >
 * Sistem Dokunuşları kapalıysa titreşim olmaz.
 */
const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

export function haptic() {
  try {
    if (!isIOS && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10)
      return
    }
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.display = 'none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    label.appendChild(input)
    document.head.appendChild(label)
    label.click()
    label.remove()
  } catch {
    // titreşim desteklenmiyorsa sessizce geç
  }
}
