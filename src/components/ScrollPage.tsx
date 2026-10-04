import type { ReactNode } from 'react'

/**
 * Sayfanın kendi kayan alanı (liste sekmelerindeki PinnedLayout'un sade hali): boş başlangıç ekranları, detay sayfaları ve Hesap için.
 * Sayfanın kendisi (document) hiç kaymaz; parmak hep bu alana gelir. Böylece iPhone yukarıdan çekince sayfayı yenilemeye çalışmaz
 * ve alan iki uçta da kendisi esner (overscroll-contain: hareketi sayfaya devretmez). İçerik en az alan boyu + 1px: kısa sayfa da esner.
 * Alan alttaki cam menünün arkasına kadar uzanır.
 * Üstte 32px'lik boş şerit (-mt-8 pt-8): iOS 26 kayan alanın üst kenarına bulanık bir geçiş çiziyor; o şeride denk gelsin,
 * başlık net kalsın. Sayfadaki yer değişmez. Aynısı PinnedLayout ve Anasayfa'da da var (sabit blok kayan alanın iç boşluğunun altına yapışır).
 */
export function ScrollPage({ children }: { children: ReactNode }) {
  return (
    <div className="relative -mb-24 flex min-h-0 flex-1 flex-col">
      <div
        data-scroller
        className="relative -mx-3 -mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-8 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="min-h-[calc(100%+1px)]">{children}</div>
      </div>
      <TopFade />
    </div>
  )
}

/**
 * Kayan alanın üstündeki boş şeridin (32px) üstüne zemin renginden şeffafa geçiş: yukarı kayan içerik saat çubuğuna
 * varmadan solar. Çubuk düz zemin renginde olduğu için ikisi tek parça görünür, kenarda keskin çizgi oluşmaz.
 * Kayan alanı saran kutunun içine, kayan alandan sonra konur.
 */
export function TopFade() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-3 -top-8 z-20 h-8"
      style={{ background: 'linear-gradient(to bottom, var(--page) 20%, transparent)' }}
    />
  )
}
