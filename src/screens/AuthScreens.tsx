import { ArrowRightIcon, ChevronLeftIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { siApple, siGoogle } from 'simple-icons'
import { toast } from 'sonner'
import { Brand } from '@/components/Brand'
import { LegalSheet, type LegalPage } from '@/components/LegalSheet'
import { LogoWall } from '@/components/LogoWall'
import { NotificationStack } from '@/components/NotificationStack'
import { RoundButton } from '@/components/ScreenHeader'
import { holdSignIn, releaseSignIn } from '@/lib/auth'
import { DEMO_CODE, DEMO_EMAIL, demoSignIn } from '@/lib/demo'
import { haptic } from '@/lib/haptics'
import { holdKeyboard } from '@/lib/keyboard'
import { isConfigured, supabase } from '@/lib/supabase'
import { transition } from '@/lib/transition'
import { cn } from '@/lib/utils'

// Giriş yapılmamışken görünen ekranlar (alt menü yok):
// karşılama (sadece bu cihazda ilk açılışta) → hesap oluştur / giriş yap → e-postaya gelen 6 haneli kod.
// Şifre yok: hesap oluştur ile giriş yap aynı akış, hesap yoksa ilk girişte kendiliğinden açılır.

type Step = 'welcome' | 'signup' | 'login' | 'code'

const ONBOARDED = 'subly:onboarded'
const CODE_LENGTH = 6

function seenWelcome() {
  try {
    return localStorage.getItem(ONBOARDED) === '1'
  } catch {
    return true
  }
}

// Kodu okumak için Mail'e geçilince iPhone ana ekran uygulamasını çoğu zaman yeniden başlatıyor.
// Kod ekranı ve e-posta saklanır ki geri dönünce baştan başlamasın. Kodun süresi kadar (1 saat) geçerli.
const PENDING = 'subly:pending-code'
const PENDING_FOR = 60 * 60 * 1000

type Pending = { email: string; mode: 'signup' | 'login'; at: number }

function readPending(): Pending | null {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING) ?? 'null') as Pending | null
    return p && typeof p.email === 'string' && Date.now() - p.at < PENDING_FOR ? p : null
  } catch {
    return null
  }
}

function savePending(p: Pending | null) {
  try {
    if (p) localStorage.setItem(PENDING, JSON.stringify(p))
    else localStorage.removeItem(PENDING)
  } catch {
    // depolama kapalıysa yeniden açılışta e-posta ekranından başlanır
  }
}

const field = 'min-h-12 w-full rounded-2xl bg-surface px-4 text-base outline-none placeholder:text-subtle/70 focus:ring-2 focus:ring-bh-yellow'
const primary = 'pressable flex min-h-12 w-full items-center justify-center rounded-2xl bg-bh-yellow font-label text-base font-semibold text-[#141414] disabled:opacity-60'

export function AuthFlow() {
  const [pending] = useState(readPending)
  const [step, setStep] = useState<Step>(() => (pending ? 'code' : seenWelcome() ? 'login' : 'welcome'))
  // Kod ekranından geri dönülecek form
  const [mode, setMode] = useState<'signup' | 'login'>(pending?.mode ?? 'signup')
  const [email, setEmail] = useState(pending?.email ?? '')
  const [legal, setLegal] = useState<LegalPage | null>(null)

  function leaveWelcome(next: 'signup' | 'login') {
    try {
      localStorage.setItem(ONBOARDED, '1')
    } catch {
      // depolama kapalıysa karşılama bir dahaki açılışta yine çıkar
    }
    holdKeyboard('email')
    transition('push', () => setStep(next))
  }

  return (
    // Sayfanın kendisi kaymaz; içerik kendi kayan alanında (ScrollPage gibi): kısa sayfa da iki uçta esner, yukarıdan çekince yenilenmez
    <main data-screen-active className="app-screen mx-auto flex max-w-md flex-col">
      <div
        data-scroller
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-[var(--top-gap)] pb-[max(1.25rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-h-[calc(100%+1px)] flex-col">
          {step === 'welcome' && <Welcome onStart={() => leaveWelcome('signup')} onLogin={() => leaveWelcome('login')} />}
          {(step === 'signup' || step === 'login') && (
            <EmailStep
              mode={step}
              email={email}
              onEmail={setEmail}
              onSwitch={() => transition('fade', () => setStep(step === 'signup' ? 'login' : 'signup'))}
              onSent={(address) => {
                setEmail(address)
                setMode(step)
                savePending({ email: address, mode: step, at: Date.now() })
                transition('push', () => setStep('code'))
              }}
              onLegal={setLegal}
            />
          )}
          {step === 'code' && <CodeStep mode={mode} email={email} onBack={() => {
                savePending(null)
                holdKeyboard('email')
                transition('pop', () => setStep(mode))
              }} />}
        </div>
      </div>
      <LegalSheet page={legal} onClose={() => setLegal(null)} />
    </main>
  )
}

function Welcome({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  return (
    <>
      <Brand className="mb-4" />
      <LogoWall />
      <NotificationStack className="my-4 min-h-[64px] flex-1" />
      <div>
        <h1 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.02em]">
          Ne zaman, ne kadar,
          <br />
          hangi karttan.
        </h1>
        <div className="mt-6 flex items-center justify-between">
          <button onClick={onLogin} className="min-h-11 text-sm text-subtle underline-offset-4 hover:underline">
            Hesabım var
          </button>
          <button onClick={onStart} aria-label="Başla" className="pressable flex size-16 items-center justify-center rounded-full bg-bh-yellow text-[#141414]">
            <ArrowRightIcon className="size-7" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </>
  )
}

/** Supabase hata mesajlarını Türkçeye çevirir */
function friendly(message: string) {
  const m = message.toLowerCase()
  if (m.includes('rate') || m.includes('seconds')) return 'Çok sık denedin. Biraz bekle.'
  if (m.includes('expired') || m.includes('invalid')) return 'Kod hatalı ya da süresi dolmuş.'
  if (m.includes('fetch') || m.includes('network')) return 'Bağlantı kurulamadı.'
  return 'Bir şeyler ters gitti. Tekrar dene.'
}

/** E-postaya kod gönderir. Hata varsa mesajını, yoksa null döner. Supabase yokken sadece test hesabı. */
async function sendCode(address: string) {
  if (!isConfigured) return address === DEMO_EMAIL ? null : `Şimdilik sadece ${DEMO_EMAIL} ile girilebilir.`
  const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } })
  return error ? friendly(error.message) : null
}

function EmailStep({
  mode,
  email,
  onEmail,
  onSwitch,
  onSent,
  onLegal,
}: {
  mode: 'signup' | 'login'
  email: string
  onEmail: (v: string) => void
  onSwitch: () => void
  onSent: (address: string) => void
  onLegal: (page: LegalPage) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const signup = mode === 'signup'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const address = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError('Geçerli bir e-posta gir.')
    // Kod ekranı sunucu cevabından sonra açılıyor; klavye şimdiden açılsın ki oradaki alan devralsın
    holdKeyboard('numeric')
    setBusy(true)
    setError('')
    const problem = await sendCode(address)
    setBusy(false)
    if (problem) {
      input.current?.focus()
      return setError(problem)
    }
    onSent(address)
  }

  return (
    <>
      <Brand size={40} className="mt-6 justify-center" />

      <div className="mt-10 text-center">
        <h1 className="num num-bold text-[30px] leading-tight">{signup ? 'Hesap oluştur' : 'Tekrar hoş geldin'}</h1>
        <p className="mt-2 text-sm text-subtle">
          {signup ? 'E-postanı yaz, sana bir kod gönderelim. Şifre yok.' : 'E-postana bir giriş kodu gönderelim.'}
        </p>
      </div>

      {/* Google ve Apple ile giriş henüz yok (Supabase kurulunca) */}
      <div className="mt-8 grid grid-cols-2 gap-2">
        {[
          { label: 'Google', icon: siGoogle },
          { label: 'Apple', icon: siApple },
        ].map(({ label, icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => toast(`${label} ile giriş yakında`)}
            className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface font-medium"
          >
            <svg viewBox="0 0 24 24" className="size-[18px] fill-current" aria-hidden>
              <path d={icon.path} />
            </svg>
            {label}
          </button>
        ))}
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-subtle" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        veya
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="grid gap-2">
        <label htmlFor="email" className="sr-only">E-posta</label>
        <input
          ref={input}
          id="email"
          type="email"
          autoFocus
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          placeholder="E-posta"
          className={field}
        />
        {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className={primary}>{busy ? 'Gönderiliyor…' : 'Devam'}</button>
      </form>

      <p className="mt-5 text-center text-sm text-subtle">
        {signup ? 'Hesabın var mı? ' : 'Hesabın yok mu? '}
        <button type="button" onClick={onSwitch} className="font-medium text-ink">
          {signup ? 'Giriş yap' : 'Hesap oluştur'}
        </button>
      </p>

      <p className="mt-auto pt-8 text-center text-xs text-subtle">
        <button type="button" onClick={() => onLegal('terms')} className="underline underline-offset-2">Kullanım şartları</button>
        <span className="mx-2">|</span>
        <button type="button" onClick={() => onLegal('privacy')} className="underline underline-offset-2">Gizlilik</button>
      </p>
    </>
  )
}

function CodeStep({ mode, email, onBack }: { mode: 'signup' | 'login'; email: string; onBack: () => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(true)
  // Kod doğru: butonda kısa bir "Giriş yapılıyor…", sonra Anasayfa yumuşakça açılır
  const [done, setDone] = useState(false)

  async function verify(value: string) {
    if (busy || done) return
    if (value.length !== CODE_LENGTH) return setError('Kodun 6 hanesini de gir.')
    setError('')
    // Yanlış kodda kutular boşalır: yeniden yazmak için tek tek silmek gerekmesin
    const fail = (message: string) => {
      releaseSignIn()
      haptic()
      setError(message)
      setCode('')
    }
    // Gelen oturum başarı anı gösterilene kadar bekletilir (src/lib/auth.tsx)
    holdSignIn()
    if (!isConfigured) {
      if (value !== DEMO_CODE) return fail('Kod hatalı ya da süresi dolmuş.')
      demoSignIn()
    } else {
      setBusy(true)
      const { error } = await supabase.auth.verifyOtp({ email, token: value, type: 'email' })
      setBusy(false)
      if (error) return fail(friendly(error.message))
    }
    savePending(null)
    haptic()
    setDone(true)
    document.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')?.blur()
    window.setTimeout(releaseSignIn, 300)
  }

  async function resend() {
    setError('')
    const problem = await sendCode(email)
    if (problem) setError(problem)
    else toast('Yeni kod gönderildi')
  }

  return (
    <>
      <div className="flex items-center">
        <RoundButton label="Geri" onClick={onBack}><ChevronLeftIcon className="size-5" /></RoundButton>
      </div>

      <div className="mt-8">
        <h1 className="num num-bold text-[30px] leading-tight">Kodu gir</h1>
        <p className="mt-2 text-sm text-subtle">
          <span className="font-medium text-ink">{email}</span> adresine 6 haneli bir kod gönderdik.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          verify(code)
        }}
        className="mt-8 grid gap-3"
      >
        {/* 6 kutu: tek bir görünmez alanın üstüne çizilir. Böylece iPhone e-postadaki kodu klavyenin üstünde önerebilir,
            yapıştırma ve silme de normal çalışır. */}
        <label className="relative block">
          <span className="sr-only">Kod</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={CODE_LENGTH}
            value={code}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)
              setCode(next)
              if (next) setError('')
              // Son hane girilince kendiliğinden kontrol et
              if (next.length === CODE_LENGTH) verify(next)
            }}
            className="absolute inset-0 z-10 w-full bg-transparent text-transparent caret-transparent opacity-[0.01] outline-none"
          />
          <span className="grid grid-cols-6 gap-2" aria-hidden>
            {Array.from({ length: CODE_LENGTH }, (_, i) => {
              const active = focused && i === Math.min(code.length, CODE_LENGTH - 1)
              return (
                <span
                  key={i}
                  className={cn(
                    'num flex h-14 items-center justify-center rounded-[14px] bg-surface text-2xl',
                    active && !done && 'ring-2 ring-bh-yellow',
                  )}
                >
                  {code[i] ?? ''}
                </span>
              )
            })}
          </span>
        </label>
        {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
        <button type="submit" disabled={busy || done} className={primary}>
          {done ? 'Giriş yapılıyor…' : busy ? 'Kontrol ediliyor…' : mode === 'signup' ? 'Hesabı oluştur' : 'Giriş yap'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-subtle">
        Kod gelmedi mi?{' '}
        <button type="button" onClick={resend} className="font-medium text-ink">Tekrar gönder</button>
      </p>
    </>
  )
}
