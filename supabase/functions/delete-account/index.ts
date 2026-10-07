// Hesabı siler: giriş yapmış kullanıcının auth kaydını kaldırır. Kartlar, abonelikler, ödemeler, ayarlar, bildirim adresleri
// ve gönderilmiş bildirim kayıtları auth.users'a "on delete cascade" ile bağlı (0001–0004), bunlar da kendiliğinden gider.
// Uygulama: supabase.functions.invoke('delete-account', { method: 'POST' }). Başarılıysa { ok: true } döner.
//
// Deploy: supabase functions deploy delete-account --no-verify-jwt
// "Verify JWT" kapalı olmalı: tarayıcının ön kontrolü (OPTIONS) token taşımaz; token'ı bu fonksiyon kendisi denetliyor.
//
// Gizli değerler (Supabase kendiliğinden verir, send-reminders ile aynı): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// SUPABASE_PUBLISHABLE_KEY ya da SUPABASE_ANON_KEY.

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const options = { auth: { persistSession: false, autoRefreshToken: false } }

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS })

const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

Deno.serve(async (req) => {
  // Tarayıcı önce OPTIONS ile izin ister
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Not signed in' }, 401)

  try {
    // Çağıranın kim olduğunu kendi token'ı ile öğren (yönetici anahtarı burada kullanılmaz)
    const url = env('SUPABASE_URL')
    const publicKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY')
    const { data, error } = await createClient(url, publicKey, options).auth.getUser(token)
    if (error || !data.user) return json({ error: 'Session is no longer valid' }, 401)

    // Hesabı yönetici anahtarıyla sil. Yumuşak silme kullanılmaz: satırların cascade ile silinmesi için gerçek silme gerekir.
    const admin = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), options)
    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
    if (deleteError) {
      console.error('deleteUser failed:', deleteError.message)
      return json({ error: deleteError.message }, 500)
    }

    return json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('delete-account failed:', message)
    return json({ error: message }, 500)
  }
})
