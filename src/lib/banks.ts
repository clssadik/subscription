import { colorFromName } from './color'
import { fold } from './text'

// Bilinen Türk bankaları ve marka renkleri. Kartın rengi, yazılan banka adından kendiliğinden gelir.
// aliases: resmî ya da kısa yazımlar ("Halk Bankası"); eşleştirmede ad gibi kullanılır.
export const BANKS: { key: string; name: string; color: string; aliases?: string[] }[] = [
  { key: 'garanti', name: 'Garanti BBVA', color: '#0B7A43', aliases: ['Türkiye Garanti Bankası'] },
  { key: 'akbank', name: 'Akbank', color: '#C8102E' },
  { key: 'yapikredi', name: 'Yapı Kredi', color: '#004B93' },
  { key: 'isbank', name: 'İş Bankası', color: '#0B4EA2', aliases: ['İşbank', 'Türkiye İş Bankası'] },
  { key: 'ziraat', name: 'Ziraat Bankası', color: '#E30A17', aliases: ['T.C. Ziraat Bankası'] },
  { key: 'halkbank', name: 'Halkbank', color: '#005DA8', aliases: ['Halk Bankası', 'Türkiye Halk Bankası'] },
  { key: 'vakifbank', name: 'VakıfBank', color: '#2B2A29', aliases: ['Vakıf Bankası', 'Vakıf', 'Türkiye Vakıflar Bankası'] },
  { key: 'qnb', name: 'QNB', color: '#890C58', aliases: ['Finansbank'] },
  { key: 'denizbank', name: 'DenizBank', color: '#0A5DA6', aliases: ['Deniz Bankası'] },
  { key: 'enpara', name: 'Enpara', color: '#6F2DA8' },
  { key: 'ing', name: 'ING', color: '#FF6200' },
  { key: 'teb', name: 'TEB', color: '#009A44', aliases: ['Türk Ekonomi Bankası'] },
  { key: 'kuveytturk', name: 'Kuveyt Türk', color: '#00704A' },
  { key: 'papara', name: 'Papara', color: '#141414' },
  // Diğer bankalar (logo eklenene kadar baş harfle görünür)
  { key: 'cepteteb', name: 'CEPTETEB', color: '#009A44' },
  { key: 'sekerbank', name: 'Şekerbank', color: '#009846' },
  { key: 'fibabanka', name: 'Fibabanka', color: '#00539F' },
  { key: 'odeabank', name: 'Odeabank', color: '#6D2077' },
  { key: 'alternatifbank', name: 'Alternatif Bank', color: '#E2231A' },
  { key: 'anadolubank', name: 'Anadolubank', color: '#0A3D8F' },
  { key: 'burgan', name: 'Burgan Bank', color: '#1B365D' },
  { key: 'hsbc', name: 'HSBC', color: '#DB0011' },
  { key: 'icbc', name: 'ICBC Turkey', color: '#C8102E' },
  // Katılım bankaları
  { key: 'albaraka', name: 'Albaraka Türk', color: '#F58220' },
  { key: 'turkiyefinans', name: 'Türkiye Finans', color: '#003E7E' },
  { key: 'ziraatkatilim', name: 'Ziraat Katılım', color: '#B5121B' },
  { key: 'vakifkatilim', name: 'Vakıf Katılım', color: '#3A3937' },
  { key: 'emlakkatilim', name: 'Emlak Katılım', color: '#00579F', aliases: ['Türkiye Emlak Katılım Bankası'] },
  { key: 'hayatfinans', name: 'Hayat Finans', color: '#00A79D' },
  // Dijital cüzdanlar ve kartlar
  { key: 'ininal', name: 'ininal', color: '#00B5E2' },
  { key: 'tosla', name: 'Tosla', color: '#4B32C3' },
  { key: 'paycell', name: 'Paycell', color: '#FFC72C' },
  { key: 'param', name: 'Param', color: '#003DA5' },
  { key: 'colendi', name: 'Colendi', color: '#2D3CFF' },
  { key: 'wise', name: 'Wise', color: '#163300' },
  { key: 'revolut', name: 'Revolut', color: '#191C1F' },
  { key: 'payoneer', name: 'Payoneer', color: '#FF4800' },
]

/** Adı kelimelerine ayırır, sadeleştirerek: "Yapı Kredi" → ["yapi", "kredi"] */
const words = (s: string) => fold(s).split(' ').filter(Boolean)

/** Bir kelime dizisi öbürünün başı mı: ["yapi"] ve ["yapi", "kredi"] */
const isWordPrefix = (a: string[], b: string[]) => a.length <= b.length && a.every((x, i) => x === b[i])

// Her bankanın adı ve takma adları bir kez kelimelere ayrılır (ad ilk sırada)
const INDEX = BANKS.map((bank) => ({ bank, forms: [bank.name, ...(bank.aliases ?? [])].map(words) }))

/** Boşluk ve büyük-küçük harf farksız tam ad ya da takma ad: "Vakif Bank" → VakıfBank */
function exactBank(joined: string) {
  return INDEX.find(({ forms }) => forms.some((f) => f.join('') === joined))?.bank
}

/**
 * Yazılan adı bilinen bankaya bağlar (renk ve logo için). Sırayla dener:
 * 1) Tam ad ya da takma ad
 * 2) Adın kelimeleri yazılanın başındaysa, en uzun olan: "Ziraat Katılım Bankası" → Ziraat Katılım
 * 3) İlk kelime: "Garanti Bonus" → Garanti BBVA
 * Kelimenin parçası eşleşmez: "Paramount" Param'a, "Ingilizce" ING'e bağlanmaz.
 */
function matchBank(name: string) {
  const w = words(name)
  const joined = w.join('')
  if (joined.length < 2) return undefined
  const exact = exactBank(joined)
  if (exact) return exact
  const prefixed = INDEX.flatMap(({ bank, forms }) => forms.filter((f) => isWordPrefix(f, w)).map((f) => ({ bank, len: f.length })))
  if (prefixed.length) return prefixed.sort((a, b) => b.len - a.len)[0].bank
  return INDEX.find(({ forms }) => forms[0][0] === w[0])?.bank
}

export function bankColor(name: string) {
  return matchBank(name)?.color
}

// Beyaz tek renk logolar: kaynakları src/assets/banks/<anahtar>.svg (tam logo) ve symbols/<anahtar>.svg (sadece sembol).
// Uygulama bunların yüksek çözünürlüklü PNG kopyalarını kullanır (src/assets/banks/png, scripts/bank-logos.mjs üretir):
// SVG'lerdeki beyaza çeviren maskeyi iPhone Safari düşük çözünürlükte çizip logoları bulanıklaştırıyordu.
const pngs = import.meta.glob('../assets/banks/png/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

/** Banka logosu: büyük yerlerde tam logo, küçük kutularda sembol. Sembol yoksa baş harf gösterilir. */
export function bankLogo(name: string) {
  const bank = matchBank(name)
  const key = bank?.key
  return {
    logo: key ? pngs[`../assets/banks/png/${key}.png`] : undefined,
    symbol: key ? pngs[`../assets/banks/png/symbols/${key}.png`] : undefined,
    // Baş harf doğru addan alınır: "is bankasi" → "İ"
    letter: (Array.from(bank?.name ?? name.trim())[0] ?? '?').toLocaleUpperCase('tr'),
    // Bu logolarda yazı çok ince ya da küçük: karoda sembol + banka adı daha okunaklı
    wide: key === 'isbank' || key === 'teb' || key === 'enpara',
  }
}

/**
 * Yazılan adın doğru hâli: "yapi kredi" → "Yapı Kredi", "garanti" → "Garanti BBVA".
 * Bankanın adı ya da başı değilse yazıldığı gibi kalır: "Garanti Bonus" kart adı olarak korunur.
 */
export function bankName(name: string) {
  const w = words(name)
  const joined = w.join('')
  if (joined.length < 2) return name.trim()
  const bank = exactBank(joined) ?? INDEX.find(({ forms }) => isWordPrefix(w, forms[0]))?.bank
  return bank?.name ?? name.trim()
}

/** Kartın rengi: bilinen bankaysa onun rengi, değilse isimden türeyen sabit bir renk */
export function cardColor(name: string) {
  return bankColor(name) ?? colorFromName(fold(name))
}
