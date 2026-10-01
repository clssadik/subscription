import { useState } from 'react'
import { PrimaryButton } from '@/components/FormBits'
import { supabase } from '@/lib/supabase'

/** E-posta ile giriş: önce adres, sonra e-postaya gelen 6 haneli kod. Hesap yoksa kendiliğinden açılır. */
export function LoginScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    const address = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError('Geçerli bir e-posta adresi gir.')
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
    if (!/^\d{6,8}$/.test(code)) return setError('E-postadaki kodu gir.')
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setBusy(false)
    if (error) setError(friendly(error.message))
    // Başarılıysa AuthGate oturumu görüp uygulamayı açar
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-2 gap-2" aria-hidden>
        <div className="h-36 rounded-[110px_110px_22px_22px] bg-bh-yellow" />
        <div className="grid gap-2">
          <div className="rounded-[22px] bg-hero" />
          <div className="rounded-[22px_22px_22px_52px] bg-bh-red" />
        </div>
      </div>

      <h1 className="num num-bold mt-8 text-[32px] leading-tight">Abonelik Takip</h1>
      <p className="mt-1 text-subtle">
        {step === 'email'
          ? 'Aboneliklerin ve kart ödemelerin tek yerde. Başlamak için e-postanı gir.'
          : `${email} adresine bir kod gönderdik. Gelen kutunu ve gereksiz klasörünü kontrol et.`}
      </p>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="mt-6 grid gap-3">
          <label htmlFor="email" className="label px-1 text-subtle">E-posta</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ad@ornek.com"
            className="min-h-13 rounded-[18px] bg-surface px-4 text-base outline-none focus:ring-2 focus:ring-bh-yellow"
          />
          {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
          <PrimaryButton type="submit" disabled={busy}>{busy ? 'Gönderiliyor…' : 'Kod gönder'}</PrimaryButton>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 grid gap-3">
          <label htmlFor="code" className="label px-1 text-subtle">Kod</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="num min-h-13 rounded-[18px] bg-surface px-4 text-center text-2xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-bh-yellow"
          />
          {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
          <PrimaryButton type="submit" disabled={busy}>{busy ? 'Kontrol ediliyor…' : 'Giriş yap'}</PrimaryButton>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setCode('')
              setError('')
            }}
            className="min-h-11 text-sm text-subtle"
          >
            Farklı e-posta kullan
          </button>
        </form>
      )}
    </main>
  )
}

function friendly(message: string) {
  const m = message.toLowerCase()
  if (m.includes('rate') || m.includes('seconds')) return 'Çok sık denedin. Biraz bekleyip tekrar dene.'
  if (m.includes('expired') || m.includes('invalid')) return 'Kod hatalı ya da süresi dolmuş. Yeni kod iste.'
  if (m.includes('fetch') || m.includes('network')) return 'Bağlantı kurulamadı. İnternetini kontrol et.'
  return 'Bir şeyler ters gitti. Tekrar dene.'
}
