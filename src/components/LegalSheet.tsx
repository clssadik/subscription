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
        body: 'Monthwise, abonelikleri ve kart ödemelerini tek yerde takip etmek için kişisel bir uygulamadır. Hangi aboneliğin ne zaman yenileneceğini, hangi karttan çekildiğini ve kartların son ödeme günlerini gösterir.',
      },
      {
        heading: 'Ödeme yapmaz',
        body: 'Monthwise bankaya ya da karta bağlanmaz, para çekmez, ödeme yapmaz. Yalnızca girilen bilgileri saklar ve hesaplar. Ödemeler her zamanki gibi banka üzerinden yapılır.',
      },
      {
        heading: 'Bilgilerin doğruluğu',
        body: 'Tarihler ve tutarlar girilen bilgilere göre hesaplanır. Önemli ödemelerde bankanın ya da servisin kendi bildirimleri de kontrol edilmelidir. Yanlış girilen bir bilgiden doğan gecikmelerden Monthwise sorumlu değildir.',
      },
      {
        heading: 'Hesap',
        body: 'Şifre kullanılmaz; giriş e-postaya gelen kodla yapılır. Hesabın güvenliği e-posta hesabının güvenliğine bağlıdır.',
      },
    ],
  },
  privacy: {
    title: 'Gizlilik',
    sections: [
      {
        heading: 'Ne saklanır?',
        body: 'E-posta adresi, eklenen abonelikler (ad, tutar, yenilenme tarihi), kartlar için yalnızca banka adı ve son 4 hane, hesap kesim günü ve "ödendi" işaretleri.',
      },
      {
        heading: 'Ne saklanmaz?',
        body: 'Kart numarasının tamamı, son kullanma tarihi, CVV ya da banka şifresi asla istenmez ve saklanmaz.',
      },
      {
        heading: 'Nerede saklanır?',
        body: 'Veriler hesaba bağlı olarak güvenli bir sunucuda tutulur; aynı e-postayla başka bir cihazdan girildiğinde orada da görünür. Telefonda da bir kopyası durur, böylece uygulama internet yokken de açılır.',
      },
      {
        heading: 'Kimseyle paylaşılmaz',
        body: 'Veriler satılmaz, reklam için kullanılmaz, kimseyle paylaşılmaz. Logosu olmayan bir servis eklendiğinde, logonun eklenebilmesi için yalnızca servisin adı not alınır.',
      },
      {
        heading: 'Silme',
        body: 'Çıkış yapıldığında telefondaki kopya silinir. Silinen bir abonelik ya da kart sunucudan da silinir.',
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
