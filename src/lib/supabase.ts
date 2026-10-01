import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** .env.local dosyasında Supabase bilgileri var mı? */
export const isConfigured = !!url && !!key

// Bu anahtar herkese açık olabilir: veriyi koruyan, veritabanındaki satır kuralları (RLS).
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
})
