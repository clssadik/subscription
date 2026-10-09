// iPhone arka plandaki ana ekran uygulamasını kısa sürede kapatabiliyor; geri dönünce sayfa baştan yüklenir.
// Açık ekran (sekme, detay, hesap alt sayfası) ve kaydırma yerleri telefona yazılır; yakın zamanda bırakıldıysa açılışta oradan devam edilir.

const KEY = 'monthwise:resume'
/** Bu kadar süre içinde geri dönülürse kalınan yerden devam edilir; daha uzun aradan sonra Anasayfa'dan açılır */
export const RESUME_WINDOW = 30 * 60 * 1000

export interface View {
  tab: string
  detailId: string | null
  cardId: string | null
  accountPage: string | null
}

interface Saved {
  user: string
  at: number
  view: View
  scroll: Record<string, number>
}

function read(): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null
    return s && Date.now() - s.at < RESUME_WINDOW ? s : null
  } catch {
    return null
  }
}

/** Bu hesabın yakın zamanda bırakılan ekranı (yoksa null) */
export function resumeView(userId: string): View | null {
  const s = read()
  return s?.user === userId ? s.view : null
}

/** Bırakılan kaydırma yerleri (hesabı fark etmez: hesap değişince clearResume çağrılır) */
export function resumeScroll(): Record<string, number> {
  return read()?.scroll ?? {}
}

/** Açık ekranı ve kaydırma yerlerini yazar (uygulama arka plana geçerken) */
export function saveResume(userId: string, view: View, scroll: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ user: userId, at: Date.now(), view, scroll } satisfies Saved))
  } catch {
    // Depolama kullanılamıyorsa uygulama her açılışta Anasayfa'dan başlar
  }
}

export function clearResume() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // yoksa zaten boş
  }
}
