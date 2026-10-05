// iPhone ana ekran uygulamasının açılış görüntüleri (apple-touch-startup-image): sayfa yüklenene kadar iPhone bunu gösterir.
// Düz zemin rengi, açık ve koyu tema için ayrı; üstüne index.html'deki açılış ekranı (logo) gelir.
// Yoksa iPhone sabit açık renk gösteriyor, koyu temada açılış "beyazdan siyaha" geçiyordu.
// Çalıştır: node scripts/startup-images.mjs  (public/splash/ ve index.html'deki etiketleri üretir)
import fs from 'node:fs'
import sharp from 'sharp'

// [genişlik, yükseklik (nokta), piksel oranı]
const DEVICES = [
  [440, 956, 3], // 16/17 Pro Max
  [402, 874, 3], // 16/17 Pro
  [420, 912, 3], // Air
  [430, 932, 3], // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [390, 844, 3], // 12, 13, 14
  [375, 812, 3], // X, XS, 11 Pro, 12/13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [375, 667, 2], // SE, 8
]
const THEMES = { light: '#F1ECE2', dark: '#000000' }

fs.mkdirSync('public/splash', { recursive: true })
const links = []
for (const [w, h, r] of DEVICES)
  for (const [theme, color] of Object.entries(THEMES)) {
    const file = `splash/${theme}-${w * r}x${h * r}.png`
    await sharp({ create: { width: w * r, height: h * r, channels: 3, background: color } }).png({ compressionLevel: 9 }).toFile(`public/${file}`)
    links.push(
      `    <link rel="apple-touch-startup-image" href="/${file}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait) and (prefers-color-scheme: ${theme})" />`,
    )
  }

const START = '    <!-- startup-images:start -->'
const END = '    <!-- startup-images:end -->'
const html = fs.readFileSync('index.html', 'utf8')
const block = [START, ...links, END].join('\n')
const next = html.includes(START)
  ? html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block)
  : html.replace('    <meta name="apple-mobile-web-app-title"', `${block}\n    <meta name="apple-mobile-web-app-title"`)
fs.writeFileSync('index.html', next)
console.log(`${links.length} görüntü`)
