# Subly (eski adı: Abonelik Takip)

Kişisel abonelik ve kredi kartı takip PWA'sı (iPhone'a "Ana Ekrana Ekle" ile kurulur).
Vite + React + TypeScript + Tailwind v4 + shadcn/ui. Kullanıcı yeni başlıyor: adımları sade Türkçeyle açıkla.

## Git ve README

- Commit mesajları ve README İngilizce.
- Commit mesajı tek satır, kısa ve sade; ne değiştiğini söyler, hikâye anlatmaz.
- Doğrudan `main`'e commit + push (tek kişilik proje, PR yok).

## Her oturumun başında: eksik logolar

Logosu olmayan bir servis eklendiğinde uygulama bunu Supabase'deki `missing_logos` tablosuna yazar
(`src/lib/store.tsx` → `src/lib/db.ts`).

- Oturumun başında kullanıcıdan Supabase SQL Editor'da şunu çalıştırıp sonucu paylaşmasını iste:
  `select name, count(*) from missing_logos group by name order by 2 desc;`
- Her eksik logo için: önce `simple-icons` paketinde var mı bak (`node -e "console.log(!!require('simple-icons').siXxx)"`).
  Varsa `src/lib/services.ts` içindeki servise `icon` olarak ekle. Yoksa resmî SVG'yi
  `src/assets/logos/<servis-anahtarı>.svg` olarak ekle (dosya adı = `SERVICES` içindeki `key`).
- Logo kutusu açık temada siyah, koyu temada beyaz. Beyaz çizilmiş bir SVG eklersen beyazları `#141414` yapılmış
  kopyasını `src/assets/logos/on-light/<servis-anahtarı>.svg` olarak da ekle (koyu temada o kullanılır).
- Logo eklenince not kendiliğinden kapanır (`migrate()` logosu olanları listeden düşer).
- Banka logoları ayrı: `src/assets/banks/<anahtar>.svg` (beyaz tek renk tam logo) ve `symbols/<anahtar>.svg`
  (sadece sembol, küçük kutular için). Anahtar `BANKS` içindeki `key` (`src/lib/banks.ts`). Sembolü olmayan bankada baş harf görünür.
  SVG ekledikten/değiştirdikten sonra `node scripts/bank-logos.mjs` çalıştır: uygulama `src/assets/banks/png/` içindeki
  yüksek çözünürlüklü PNG kopyalarını kullanır (SVG maskesi iPhone'da bulanık çiziliyor).

## Tasarım kuralları (Gündüz / Gece Bauhaus bento)

- Renkler `src/index.css` içinde: Bauhaus sarı/mavi/kırmızı + temaya göre değişen yüzeyler.
  Tema varsayılan olarak telefonun ayarını izler (açık = krem zemin, koyu = OLED siyah); Hesap ekranından elle seçilebilir (`src/lib/theme.ts`).
- Kalın yazı (700, `.num-bold`) sadece sayfa başlıkları, büyük toplamlar ve acil uyarılar için.
  İsimler ve tutarlar 500, geri kalan 400.
- Rakamlar Space Grotesk (`.num`), etiketler Outfit büyük harf (`.label`), metin DM Sans.
- Kart numarasının tamamı asla saklanmaz: sadece banka adı ve son 4 hane.
- Kart ekstresi "ödendi" işaretlenirken tutar istenmez (sadece ödendi bilgisi).
