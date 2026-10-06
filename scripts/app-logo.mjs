// Uygulama logosu kaynak görselden iki dosya üretir:
// - public/logo.png: ana ekran ikonlarının kaynağı (siyah zemin, kare). Sonra: npm run generate-pwa-assets
// - public/logo-mark.webp: uygulama içi ve açılış ekranı için arka planı şeffaf logo
// Çalıştır: node scripts/app-logo.mjs <kaynak.png>  (kaynak: siyah zeminde logo)
import sharp from 'sharp'

const src = process.argv[2]
if (!src) throw new Error('Kaynak görsel yolu gerekli')

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const bright = (p) => Math.max(data[p * 3], data[p * 3 + 1], data[p * 3 + 2])

// Logonun sınırları
let x0 = W, y0 = H, x1 = 0, y1 = 0
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (bright(y * W + x) > 24) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)]
const cx = (x0 + x1) / 2
const cy = (y0 + y1) / 2

// Dış zemin: kenarlardan başlayıp koyu piksellerde yayılan doldurma (içerideki koyu yerler opak kalır)
const T = 48
const outside = new Uint8Array(W * H)
const stack = []
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x)
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1)
while (stack.length) {
  const p = stack.pop()
  if (outside[p] || bright(p) >= T) continue
  outside[p] = 1
  const x = p % W
  if (x > 0) stack.push(p - 1)
  if (x < W - 1) stack.push(p + 1)
  if (p >= W) stack.push(p - W)
  if (p < W * (H - 1)) stack.push(p + W)
}

// Şeffaf kopya: içerisi opak, kenar 1-2 piksel içeri alınıp yumuşatılır (koyu kenar açık zeminde gri hale yapıyordu)
const inside = Buffer.alloc(W * H)
for (let p = 0; p < W * H; p++) inside[p] = outside[p] ? 0 : 255
const alpha = await sharp(inside, { raw: { width: W, height: H, channels: 1 } })
  .blur(2)
  .linear(3, -380)
  .extractChannel(0)
  .raw()
  .toBuffer()
const rgba = Buffer.alloc(W * H * 4)
for (let p = 0; p < W * H; p++) {
  for (let k = 0; k < 3; k++) rgba[p * 4 + k] = data[p * 3 + k]
  rgba[p * 4 + 3] = alpha[p]
}
const side = Math.ceil(Math.max(x1 - x0, y1 - y0) * 1.04)
const cut = {
  left: Math.round(cx - side / 2),
  top: Math.round(cy - side / 2),
  width: side,
  height: side,
}
const pad = Math.max(0, -cut.left, -cut.top, cut.left + side - W, cut.top + side - H)
// sharp tek zincirde önce kırpıp sonra genişletir: genişletilmiş hâli ayrı üretilir
const padded = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()
await sharp(padded)
  .extract({ ...cut, left: cut.left + pad, top: cut.top + pad })
  .resize(512, 512)
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile('public/logo-mark.webp')

// İkon: logo karenin ~%80'i, siyah zemin
const iconSide = Math.round(Math.max(x1 - x0, y1 - y0) / 0.8)
const ix = Math.round(cx - iconSide / 2)
const iy = Math.round(cy - iconSide / 2)
const ipad = Math.max(0, -ix, -iy, ix + iconSide - W, iy + iconSide - H)
// Şeffaf kesim siyaha oturtulur: kaynağın tam siyah olmayan zemini eklenen siyah kenarla kare gibi seçiliyordu
const framed = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .flatten({ background: '#000000' })
  .extend({ top: ipad, bottom: ipad, left: ipad, right: ipad, background: '#000000' })
  .png()
  .toBuffer()
await sharp(framed)
  .extract({ left: ix + ipad, top: iy + ipad, width: iconSide, height: iconSide })
  .resize(1024, 1024)
  .png()
  .toFile('public/logo.png')

console.log('public/logo.png ve public/logo-mark.webp yazıldı')
