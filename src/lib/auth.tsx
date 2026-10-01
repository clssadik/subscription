import type { User } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { LoginScreen } from '@/screens/LoginScreen'
import { isConfigured, supabase } from './supabase'

/** Giriş yapılmamışsa giriş ekranını, yapılmışsa uygulamayı gösterir. */
export function AuthGate({ children }: { children: (user: User) => ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-md p-6 pt-16 text-center">
        <p className="font-label text-lg font-medium">Supabase bağlı değil</p>
        <p className="mt-2 text-sm text-subtle">
          <code>.env.example</code> dosyasını <code>.env.local</code> olarak kopyalayıp Supabase bilgilerini gir.
        </p>
      </div>
    )
  }
  if (user === undefined) return <div className="min-h-svh" />
  if (!user) return <LoginScreen />
  return <>{children(user)}</>
}
