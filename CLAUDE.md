# Abonelik Takip

Kişisel abonelik ve kredi kartı takip PWA'sı (iPhone'a "Ana Ekrana Ekle" ile kurulur).
Vite + React + TypeScript + Tailwind v4 + shadcn/ui. Kullanıcı yeni başlıyor: adımları sade Türkçeyle açıkla.

## Her oturumun başında: eksik logolar

Logosu olmayan bir servis eklendiğinde uygulama bunu `missingLogos` listesine not alır
(`src/lib/store.tsx`). Supabase bağlanana kadar bu liste sadece kullanıcının telefonunda
(localStorage) durur ve Supabase bağlandığı gün oraya gönderilecek.

- Supabase bağlıysa: oturumun başında `missing_logos` tablosunu kontrol et.
- Her eksik logo için: önce `simple-icons` paketinde var mı bak (`node -e "console.log(!!require('simple-icons').siXxx)"`).
  Varsa `src/lib/services.ts` içindeki servise `icon` olarak ekle. Yoksa resmî SVG'yi
  `src/assets/logos/<servis-anahtarı>.svg` olarak ekle (dosya adı = `SERVICES` içindeki `key`).
- Logo eklenince not kendiliğinden kapanır (`migrate()` logosu olanları listeden düşer).

## Tasarım kuralları (Gündüz / Gece Bauhaus bento)

- Renkler `src/index.css` içinde: Bauhaus sarı/mavi/kırmızı + temaya göre değişen yüzeyler.
  Tema telefonun ayarını izler (açık = krem zemin, koyu = OLED siyah).
- Kalın yazı (700, `.num-bold`) sadece sayfa başlıkları, büyük toplamlar ve acil uyarılar için.
  İsimler ve tutarlar 500, geri kalan 400.
- Rakamlar Space Grotesk (`.num`), etiketler Outfit büyük harf (`.label`), metin DM Sans.
- Kart numarasının tamamı asla saklanmaz: sadece banka adı ve son 4 hane.
- Kart ekstresi "ödendi" işaretlenirken tutar istenmez (sadece ödendi bilgisi).
