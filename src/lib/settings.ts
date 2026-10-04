import { useSyncExternalStore } from 'react'

// Kullanıcının ayarları: profil adı ve bildirim tercihleri. Şimdilik bu cihazda, kullanıcıya göre ayrı saklanır.
// 2. adımda (Supabase) hesaba taşınacak: 4. adımda bildirimleri sunucu gönderecek, ayarları oradan okuyacak.

/** Kaç gün önce hatırlatılsın; 0 = ödeme günü */
export type ReminderDay = 0 | 1 | 3 | 7
export const REMINDER_DAYS: ReminderDay[] = [0, 1, 3, 7]

export interface NotifySettings {
  /** Bütün hatırlatmalar */
  enabled: boolean
  /** Abonelik yenilenmesinden kaç gün önce (birden fazla olabilir) */
  subscriptionDays: ReminderDay[]
  /** Kart son ödemesinden kaç gün önce */
  cardDays: ReminderDay[]
  /** Hesap kesilince ("ekstre kesildi") haber ver */
  statement: boolean
  /** Bildirim saati, "HH:mm" */
  time: string
  /** Son gün geçtiği hâlde "ödendi" işaretlenmemişse ertesi gün tekrar hatırlat */
  overdue: boolean
  /** Toplu özet: her pazartesi ya da her ayın 1'i */
  summary: 'off' | 'weekly' | 'monthly'
  /** Abonelik bazında: kapalı ya da kendi süresi (yoksa genel ayar geçerli) */
  perSubscription: Record<string, 'off' | ReminderDay>
}

export interface Settings {
  /** Profil adı; boşsa e-posta kullanılır */
  name: string
  notify: NotifySettings
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  notify: {
    enabled: true,
    subscriptionDays: [1],
    cardDays: [3, 1],
    statement: true,
    time: '09:00',
    overdue: true,
    summary: 'weekly',
    perSubscription: {},
  },
}

const key = (userId: string) => `abonelik-takip:settings:${userId}`
const listeners = new Set<() => void>()
const cache = new Map<string, Settings>()

function read(userId: string): Settings {
  const hit = cache.get(userId)
  if (hit) return hit
  let value = DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(key(userId))
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Settings>
      value = { ...DEFAULT_SETTINGS, ...saved, notify: { ...DEFAULT_SETTINGS.notify, ...saved.notify } }
    }
  } catch {
    // okunamıyorsa varsayılanlar
  }
  cache.set(userId, value)
  return value
}

function write(userId: string, value: Settings) {
  cache.set(userId, value)
  try {
    localStorage.setItem(key(userId), JSON.stringify(value))
  } catch {
    // depolama kapalıysa sadece bu oturumda geçerli
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Ayarları okur; update ile bir kısmını değiştirir (bildirim ayarları için updateNotify) */
export function useSettings(userId: string) {
  const settings = useSyncExternalStore(subscribe, () => read(userId))
  const update = (patch: Partial<Settings>) => write(userId, { ...read(userId), ...patch })
  const updateNotify = (patch: Partial<NotifySettings>) => {
    const current = read(userId)
    write(userId, { ...current, notify: { ...current.notify, ...patch } })
  }
  return { settings, update, updateNotify }
}

/** "1 gün önce", "Ödeme günü", "3 ve 1 gün önce" */
export function daysLabel(days: ReminderDay[]) {
  if (days.length === 0) return 'Kapalı'
  const sorted = [...days].sort((a, b) => b - a)
  const before = sorted.filter((d) => d > 0)
  const parts: string[] = []
  if (before.length) parts.push(`${before.join(' ve ')} gün önce`)
  if (sorted.includes(0)) parts.push('ödeme günü')
  const text = parts.join(', ')
  return text[0].toLocaleUpperCase('tr') + text.slice(1)
}

/** Ad varsa ad-soyad baş harfleri ("Sadık Ak" → "SA"), yoksa e-postanın ilk harfi */
export function initials(name: string, email: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return (email.trim()[0] ?? '?').toLocaleUpperCase('tr')
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toLocaleUpperCase('tr')
}
