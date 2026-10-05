// Banka logolarını (beyaz tek renk SVG) yüksek çözünürlüklü PNG'ye çevirir: src/assets/banks/png/.
// Neden: SVG'ler beyaza bir maskeyle çevriliyor ve iPhone Safari maskeyi düşük çözünürlükte çizip logoyu bulanıklaştırıyor.
// Yeni ya da değişen banka SVG'sinden sonra çalıştır:  node scripts/bank-logos.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'src/assets/banks'
const OUT = path.join(SRC, 'png')
// Uzun kenar (piksel): tam logo kartta en çok ~200pt, sembol en çok ~60pt gösterilir; 3x ekranda rahatça keskin kalsın
const LONG = { logo: 1200, symbol: 480 }

async function convert(file, out, long) {
  const svg = fs.readFileSync(file)
  const vb = /viewBox="([^"]+)"/.exec(svg.toString())?.[1].split(/[\s,]+/).map(Number)
  if (!vb) throw new Error(`${file}: viewBox yok`)
  const density = Math.min(2400, (72 * long) / Math.max(vb[2], vb[3]))
  await sharp(svg, { density }).png({ compressionLevel: 9 }).toFile(out)
  const { width, height } = await sharp(out).metadata()
  console.log(`${out} ${width}x${height}`)
}

fs.mkdirSync(path.join(OUT, 'symbols'), { recursive: true })
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')))
  await convert(path.join(SRC, f), path.join(OUT, f.replace('.svg', '.png')), LONG.logo)
for (const f of fs.readdirSync(path.join(SRC, 'symbols')).filter((f) => f.endsWith('.svg')))
  await convert(path.join(SRC, 'symbols', f), path.join(OUT, 'symbols', f.replace('.svg', '.png')), LONG.symbol)
