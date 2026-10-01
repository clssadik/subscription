import { useState } from 'react'
import { BauhausTiles } from '@/components/BauhausTiles'
import { DEMO_CODE, DEMO_EMAIL, demoSignIn } from '@/lib/demo'
import { isConfigured, supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

/** E-posta ile giriş: önce adres, sonra e-postaya gelen kod. Hesap yoksa kendiliğinden açılır. */
export function LoginScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    const address = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError('Geçerli bir e-posta gir.')
    if (!isConfigured) {
      // Supabase yokken sadece test hesabı
      if (address !== DEMO_EMAIL) return setError(`Şimdilik sadece ${DEMO_EMAIL} ile girilebilir.`)
      setEmail(address)
      setError('')
      return setStep('code')
    }
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } })
    setBusy(false)
    if (error) return setError(friendly(error.message))
    setEmail(address)
    setStep('code')
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6,8}$/.test(code)) return setError('Kodu gir.')
    if (!isConfigured) {
      if (code !== DEMO_CODE) return setError('Kod hatalı ya da süresi dolmuş.')
      return demoSignIn()
    }
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setBusy(false)
    if (error) setError(friendly(error.message))
  }

  const field = 'min-h-12 w-full rounded-2xl bg-page px-4 text-base outline-none focus:ring-2 focus:ring-bh-yellow'
  const button = 'pressable min-h-12 w-full rounded-2xl bg-[#141414] font-label text-base font-semibold text-bh-yellow disabled:opacity-60 dark:bg-bh-yellow dark:text-[#141414]'

  return (
    <section className="flex min-h-[calc(100svh-10rem)] flex-col justify-center">
      <BauhausTiles>
        <div className="my-2 rounded-[24px] bg-surface px-3.5 pt-5 pb-3.5">
          <h1 className="num num-bold mb-4 text-center text-[28px]">{step === 'email' ? 'Giriş yap' : 'Kodu gir'}</h1>

          {step === 'email' ? (
            <form onSubmit={sendCode} className="grid gap-2">
              <label htmlFor="email" className="sr-only">E-posta</label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta"
                className={field}
              />
              {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
              <button type="submit" disabled={busy} className={button}>{busy ? 'Gönderiliyor…' : 'Kod gönder'}</button>
            </form>
          ) : (
            <form onSubmit={verify} className="grid gap-2">
              <p className="-mt-3 mb-1 truncate text-center text-sm text-subtle">{email}</p>
              <label htmlFor="code" className="sr-only">Kod</label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className={cn(field, 'num text-center text-2xl tracking-[0.4em]')}
              />
              {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
              <button type="submit" disabled={busy} className={button}>{busy ? 'Kontrol ediliyor…' : 'Giriş yap'}</button>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError('')
                }}
                className="min-h-11 text-sm text-subtle"
              >
                Geri
              </button>
            </form>
          )}
        </div>
      </BauhausTiles>
    </section>
  )
}

function friendly(message: string) {
  const m = message.toLowerCase()
  if (m.includes('rate') || m.includes('seconds')) return 'Çok sık denedin. Biraz bekle.'
  if (m.includes('expired') || m.includes('invalid')) return 'Kod hatalı ya da süresi dolmuş.'
  if (m.includes('fetch') || m.includes('network')) return 'Bağlantı kurulamadı.'
  return 'Bir şeyler ters gitti. Tekrar dene.'
}
