import type { User } from '@supabase/supabase-js'

// Supabase kurulana kadar denemek için yerel test hesabı. Veriler sadece bu cihazda kalır.
// Supabase bağlandığında (isConfigured) hiç kullanılmaz.

export const DEMO_EMAIL = 'test@test.com'
export const DEMO_CODE = '123456'
export const DEMO_ID = 'demo'

const SESSION_KEY = 'abonelik-takip:demo-session'
const EVENT = 'demo-auth'

export const demoUser = {
  id: DEMO_ID,
  email: DEMO_EMAIL,
  created_at: '2026-10-02T00:00:00Z',
} as User

export function isDemoSignedIn() {
  try {
    return localStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function set(on: boolean) {
  try {
    if (on) localStorage.setItem(SESSION_KEY, '1')
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // depolama kapalıysa oturum sadece bu sayfa açıkken sürer
  }
  window.dispatchEvent(new Event(EVENT))
}

export const demoSignIn = () => set(true)
export const demoSignOut = () => set(false)

export function onDemoAuth(cb: () => void) {
  window.addEventListener(EVENT, cb)
  return () => window.removeEventListener(EVENT, cb)
}
