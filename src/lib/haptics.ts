/**
 * Hafif titreşim (dokunma hissi). Android'de navigator.vibrate kullanılır.
 * iPhone Safari vibrate desteklemiyor; iOS 18'den beri gizli bir "switch" kutucuğuna tıklamak hafif bir titreşim veriyor.
 * Sadece bir dokunuşun içinden (onClick) çağrılınca çalışır.
 */
let label: HTMLLabelElement | null = null

export function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10)
    return
  }
  if (!label) {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.id = 'haptic-switch'
    label = document.createElement('label')
    label.htmlFor = input.id
    label.setAttribute('aria-hidden', 'true')
    label.style.display = 'none'
    label.appendChild(input)
    document.body.appendChild(label)
  }
  label.click()
}
