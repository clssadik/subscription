import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Ekran çizilirken bir hata olursa (ör. bozuk kayıtlı veri) uygulama beyaz ekrana dönmesin: sakin bir "yeniden başlat" ekranı gösterilir.
 * Yeniden açılışta aynı hata tekrarlarsa bu ekran yine çıkar; olay işleyicilerindeki hatalar bu sınıra düşmez.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Çizim hatası:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="app-screen mx-auto flex max-w-md flex-col items-center justify-center gap-3 bg-page px-6 pt-[var(--top-gap)] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-ink">
        <h1 className="num num-bold text-[28px] leading-tight">Bir sorun oluştu</h1>
        <p className="text-sm text-subtle">Yeniden başlatmayı deneyin.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="pressable mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl bg-bh-yellow font-label text-base font-semibold text-[#141414]"
        >
          Yeniden başlat
        </button>
      </main>
    )
  }
}
