import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { isConfigured, supabase } from './supabase'

/** Giriş yapmış kullanıcı; yoksa null, oturum henüz okunmadıysa undefined. */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(isConfigured ? undefined : null)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  return user
}
