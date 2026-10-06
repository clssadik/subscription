import { useState } from 'react'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'

export type LegalPage = 'terms' | 'privacy'

// Kısa, sade metinler: uygulamanın ne yaptığını ve verilerle ne olduğunu anlatır.
const PAGES: Record<LegalPage, { title: string; sections: { heading: string; body: string }[] }> = {
  terms: {
    title: 'Kullanım şartları',
    sections: [
      {
        heading: 'Monthwise nedir?',
        body: 'Monthwise, aboneliklerini ve kart ödemelerini tek yerde takip etmen için kişisel bir uygulamadır. Hangi aboneliğin ne zaman yenileneceğini, hangi karttan çekildiğini ve kartlarının son ödeme günlerini gösterir.',
      },
      {
        heading: 'Ödeme yapmaz',
        body: 'Monthwise bankana ya da kartına bağlanmaz, para çekmez, ödeme yapmaz. Sadece senin girdiğin bilgileri hatırlar ve hesaplar. Ödemelerini her zamanki gibi kendin yaparsın.',
      },
      {
        heading: 'Bilgilerin doğruluğu',
        body: 'Tarihler ve tutarlar senin girdiğin bilgilere göre hesaplanır. Önemli ödemelerde bankanın ya da servisin kendi bildirimlerini de kontrol et. Yanlış girilen bir bilgiden doğan gecikmelerden Monthwise sorumlu değildir.',
      },
      {
        heading: 'Hesabın',
        body: 'Şifre yok: e-postana gelen kodla girersin. E-postana başkasının erişmediğinden emin ol.',
      },
    ],
  },
  privacy: {
    title: 'Gizlilik',
    sections: [
      {
        heading: 'Ne saklanır?',
        body: 'E-posta adresin, eklediğin abonelikler (ad, tutar, yenilenme tarihi), kartların için sadece banka adı ve son 4 hane, hesap kesim günü ve "ödendi" işaretlerin.',
      },
      {
        heading: 'Ne saklanmaz?',
        body: 'Kart numarasının tamamı, son kullanma tarihi, CVV ya da banka şifresi asla istenmez ve saklanmaz.',
      },
      {
        heading: 'Nerede saklanır?',
        body: 'Veriler hesabına bağlı olarak güvenli bir sunucuda tutulur; aynı e-postayla başka bir cihazdan girince orada da görünür. Telefonda da bir kopyası durur, böylece internet yokken de açılır.',
      },
      {
        heading: 'Kimseyle paylaşılmaz',
        body: 'Verilerin satılmaz, reklam için kullanılmaz, başka biriyle paylaşılmaz. Logosu olmayan bir servis eklediğinde, logosunu ekleyebilmek için o servisin adı not alınır.',
      },
      {
        heading: 'Silme',
        body: 'Çıkış yapınca bu telefondaki kopya silinir. Eklediğin bir aboneliği ya da kartı sildiğinde sunucudan da silinir.',
      },
    ],
  },
}

/** Alttan açılan şartlar / gizlilik sayfası; aşağı çekince kapanır */
export function LegalSheet({ page, onClose }: { page: LegalPage | null; onClose: () => void }) {
  // Kapanırken metin panelde kalsın: boşalıp büzülmeden aşağı kaysın
  const [last, setLast] = useState(page)
  if (page && page !== last) setLast(page)
  const content = last ? PAGES[last] : null
  return (
    <Drawer open={!!page} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[88svh] rounded-t-[30px] border-0 bg-page data-[vaul-drawer-direction=bottom]:max-h-[88svh]">
        <div className="mx-auto w-full max-w-md overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DrawerTitle className="num num-bold pt-3 pb-1 text-center text-xl">{content?.title}</DrawerTitle>
          <DrawerDescription className="sr-only">Monthwise hakkında kısa bilgi</DrawerDescription>
          {content?.sections.map((s) => (
            <section key={s.heading} className="mt-5">
              <h2 className="label text-subtle">{s.heading}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
