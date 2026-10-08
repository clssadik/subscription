// Arama ve eşleştirme için yazım farklarını siler: "İş Bankası" ve "is bankasi" aynı sonucu verir.

/** Kart numarası gibi: altı ya da daha çok hane. Ad alanlarına tam kart numarası yazılıp kaydedilmesin (veritabanı da reddeder). */
export const hasCardNumber = (text: string) => text.replace(/\D/g, '').length >= 6

// Türkçe küçük harflerin Latin karşılıkları
const TR_LATIN: Record<string, string> = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c' }

/** "NETFLİX" → "netflix", "Café" → "cafe", "🎬 Film" → "film": sadece [a-z0-9] ve aralarda tek boşluk */
export function fold(s: string): string {
  return s
    .replace(/[İI]/g, 'i') // ASCII I, Türkçe küçültmede ı olmasın diye önce i yapılır
    .toLocaleLowerCase('tr')
    .replace(/[ışğüöç]/g, (c) => TR_LATIN[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // birleşik aksan işaretleri: é → e
    .replace(/[^a-z0-9]+/g, ' ') // harf ve rakam dışındaki her şey (boşluk, +, emoji) tek boşluk olur
    .trim()
}
