// Uygulama logosu: renkli zemindeki beyaz işaretten iki dosya üretir:
// - public/logo-mark.png: şeffaf zeminde beyaz işaret (uygulama içi; açık temada CSS ile siyaha çevrilir)
// - public/logo.png: ana ekran ikonlarının kaynağı (siyah zeminde beyaz işaret). Sonra: npm run generate-pwa-assets
// Çalıştır: node scripts/app-logo.mjs <kaynak> <x,y,genişlik,yükseklik>  (işaretin bulunduğu alan; dışındaki yazılar karışmasın)
import sharp from 'sharp'

const [src, area] = process.argv.slice(2)
if (!src || !area) throw new Error('Kullanım: node scripts/app-logo.mjs <kaynak> <x,y,genişlik,yükseklik>')
const [left, top, width, height] = area.split(',').map(Number)

// Beyazlık = mavi kanal (turuncu zeminde düşük, beyazda yüksek). 4 kat büyütülüp yumuşatılır ve eşiklenir:
// JPEG'in pürüzlü kenarı düzgün bir çizgiye döner.
// sharp tek zincirde işlemleri kendi sırasıyla uygular ve aynı işlemin ikincisi ilkini ezer: adımlar ayrı çalıştırılır.
const UP = 4
const step = (buf, w, h, f) => f(sharp(buf, { raw: { width: w, height: h, channels: 1 } })).extractChannel(0).raw().toBuffer()
const blue = await sharp(src)
  .extract({ left, top, width, height })
  .extractChannel('blue')
  .resize(width * UP, height * UP, { kernel: 'lanczos3' })
  .raw()
  .toBuffer()
const info = { width: width * UP, height: height * UP }
const sharpEdge = await step(blue, info.width, info.height, (s) => s.blur(UP * 0.8).linear(6, -6 * 160))
const data = await step(sharpEdge, info.width, info.height, (s) => s.blur(0.8))
const { width: W, height: H } = info

// İşaretin sınırları
let x0 = W, y0 = H, x1 = 0, y1 = 0
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (data[y * W + x] > 128) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)]
const side = Math.max(x1 - x0, y1 - y0) + 1
const cx = Math.round((x0 + x1) / 2)
const cy = Math.round((y0 + y1) / 2)

// Kare kesilir (gerekirse boşlukla genişletilerek), beyaz renk + işaretin maskesi saydamlık olur
const pad = Math.ceil(side / 2) + 1
const square = await sharp(data, { raw: { width: W, height: H, channels: 1 } })
  .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#000000' })
  .extractChannel(0)
  .raw()
  .toBuffer()
const alpha = await sharp(square, { raw: { width: W + 2 * pad, height: H + 2 * pad, channels: 1 } })
  .extract({ left: cx - Math.floor(side / 2) + pad, top: cy - Math.floor(side / 2) + pad, width: side, height: side })
  .extractChannel(0)
  .raw()
  .toBuffer()
const white = await sharp({ create: { width: side, height: side, channels: 3, background: '#FFFFFF' } })
  .joinChannel(alpha, { raw: { width: side, height: side, channels: 1 } })
  .png()
  .toBuffer()

await sharp(white).resize(1024, 1024).png({ compressionLevel: 9 }).toFile('public/logo-mark.png')

// İkon: siyah zemin, işaret karenin %64'ü
const S = 1024
const markSide = Math.round(S * 0.64)
await sharp({ create: { width: S, height: S, channels: 3, background: '#000000' } })
  .composite([{ input: await sharp(white).resize(markSide, markSide).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile('public/logo.png')

console.log('public/logo.png ve public/logo-mark.png yazıldı')
