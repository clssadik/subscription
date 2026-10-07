/** Rengin açık mı koyu mu olduğunu ölçer (0 = siyah, 1 = beyaz) */
export function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** İki rengin birbirine uzaklığı (0 = aynı renk, ~441 = siyah-beyaz) */
export function colorDistance(a: string, b: string) {
  const rgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const [x, y] = [rgb(a), rgb(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

const FALLBACK = ['#1F4FB4', '#D9381E', '#B8860B', '#0B7A43', '#6A1B9A', '#00838F', '#AD1457']

/** Listede olmayan bir isim için her seferinde aynı çıkan renk */
export function colorFromName(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return FALLBACK[h % FALLBACK.length]
}
