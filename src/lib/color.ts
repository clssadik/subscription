/** "#RGB", "#RRGGBB" ya da "RRGGBB" → [r, g, b]; geçersizse siyah */
export function rgbOf(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.replace(/./g, (c) => c + c)
  if (!/^[0-9a-f]{6}$/i.test(h)) return [0, 0, 0]
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Rengin açık mı koyu mu olduğunu ölçer (0 = siyah, 1 = beyaz) */
export function luminance(hex: string) {
  const [r, g, b] = rgbOf(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** WCAG göreli parlaklığı */
function relativeLuminance(hex: string) {
  const [r, g, b] = rgbOf(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG kontrast oranı (1 = aynı, 21 = siyah-beyaz) */
export function contrastRatio(a: string, b: string) {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** Renkli zeminde okunacak yazı rengi: koyu mürekkep ya da beyaz, hangisi daha okunaklıysa */
export function contrastInk(background: string): '#141414' | '#FFFFFF' {
  return contrastRatio(background, '#141414') >= contrastRatio(background, '#FFFFFF') ? '#141414' : '#FFFFFF'
}

/** İki rengin birbirine uzaklığı (0 = aynı renk, ~441 = siyah-beyaz) */
export function colorDistance(a: string, b: string) {
  const [x, y] = [rgbOf(a), rgbOf(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

const FALLBACK = ['#1F4FB4', '#D9381E', '#B8860B', '#0B7A43', '#6A1B9A', '#00838F', '#AD1457']

/** Listede olmayan bir isim için her seferinde aynı çıkan renk */
export function colorFromName(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return FALLBACK[h % FALLBACK.length]
}
