import { useState } from 'react'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { CheckList, Group, Row, Switch, SubPageHeader } from '@/components/SettingsList'
import { haptic } from '@/lib/haptics'
import { sendTestPush, usePush } from '@/lib/push'
import { REMINDER_DAYS, daysLabel, useSettings, type NotifySettings, type ReminderDay } from '@/lib/settings'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const DAY_LABELS: Record<ReminderDay, string> = { 0: 'Ödeme günü', 1: '1 gün önce', 3: '3 gün önce', 7: '1 hafta önce' }
const DAY_OPTIONS = REMINDER_DAYS.map((d) => ({ value: d, label: DAY_LABELS[d] }))
const SUMMARY_OPTIONS: { value: NotifySettings['summary']; label: string }[] = [
  { value: 'off', label: 'Kapalı' },
  { value: 'weekly', label: 'Haftalık' },
  { value: 'monthly', label: 'Aylık' },
]

/** Bildirim ayarları ve bu telefonun bildirim izni. Gönderen: supabase/functions/send-reminders (her 15 dakikada). */
export function NotificationSettings({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { state } = useStore()
  const { settings, updateNotify } = useSettings(userId)
  const n = settings.notify
  const off = !n.enabled

  const setOverride = (id: string, value: string) => {
    haptic()
    const next = { ...n.perSubscription }
    if (value === 'default') delete next[id]
    else next[id] = value === 'off' ? 'off' : (Number(value) as ReminderDay)
    updateNotify({ perSubscription: next })
  }

  return (
    <>
      <SubPageHeader title="Bildirimler" onBack={onBack} />

      <PushStatus />

      <Group>
        <Row label="Hatırlatmalar" trailing={<Switch label="Hatırlatmalar" checked={n.enabled} onChange={(enabled) => updateNotify({ enabled })} />} />
      </Group>

      {/* Hatırlatmalar kapalıyken ayarlar soluk ve dokunulamaz */}
      <div className={cn('transition-opacity', off && 'pointer-events-none opacity-40')} aria-disabled={off}>
        <Group title="Abonelik yenilenmesi">
          <CheckList multiple options={DAY_OPTIONS} value={n.subscriptionDays} onChange={(subscriptionDays) => updateNotify({ subscriptionDays })} disabled={off} />
        </Group>

        <Group title="Kart son ödemesi">
          <CheckList multiple options={DAY_OPTIONS} value={n.cardDays} onChange={(cardDays) => updateNotify({ cardDays })} disabled={off} />
        </Group>

        <Group title="Saat" footer="Bütün hatırlatmalar bu saatte gelir.">
          <Row
            label="Bildirim saati"
            value={n.time}
            select={
              <input
                type="time"
                aria-label="Bildirim saati"
                value={n.time}
                onChange={(e) => e.target.value && updateNotify({ time: e.target.value })}
                className="absolute inset-0 opacity-0"
              />
            }
          />
        </Group>

        <Group title="Diğer" footer="Ödenmeyen ödeme ertesi sabah tekrar hatırlatılır.">
          <Row label="Hesap kesilince haber ver" trailing={<Switch label="Hesap kesilince haber ver" checked={n.statement} onChange={(statement) => updateNotify({ statement })} />} />
          <Row label="Gecikince tekrar hatırlat" trailing={<Switch label="Gecikince tekrar hatırlat" checked={n.overdue} onChange={(overdue) => updateNotify({ overdue })} />} />
        </Group>

        <Group title="Özet" footer={n.summary === 'weekly' ? 'Her pazartesi: o hafta kaç ödeme var, toplam ne kadar.' : n.summary === 'monthly' ? 'Her ayın 1’i: o ay kaç ödeme var, toplam ne kadar.' : undefined}>
          <CheckList
            options={SUMMARY_OPTIONS}
            value={[n.summary]}
            onChange={([summary]) => updateNotify({ summary })}
            disabled={off}
          />
        </Group>

        {state.subscriptions.length > 0 && (
          <Group title="Abonelik bazında">
            {[...state.subscriptions]
              .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
              .map((s) => {
                const own = n.perSubscription[s.id]
                const value = own === undefined ? 'default' : String(own)
                return (
                  <Row
                    key={s.id}
                    icon={<Logo serviceKey={s.serviceKey} name={s.name} size={30} />}
                    label={s.name}
                    value={own === undefined ? 'Genel ayar' : own === 'off' ? 'Kapalı' : DAY_LABELS[own]}
                    select={
                      <select aria-label={`${s.name} hatırlatması`} value={value} onChange={(e) => setOverride(s.id, e.target.value)} className="absolute inset-0 opacity-0">
                        <option value="default">Genel ayar ({daysLabel(n.subscriptionDays).toLocaleLowerCase('tr')})</option>
                        {REMINDER_DAYS.map((d) => (
                          <option key={d} value={d}>{DAY_LABELS[d]}</option>
                        ))}
                        <option value="off">Kapalı</option>
                      </select>
                    }
                  />
                )
              })}
          </Group>
        )}
      </div>
    </>
  )
}

/** Bu telefonun bildirim durumu: izin iste, açık olduğunu göster ya da neden olmadığını anlat */
function PushStatus() {
  const { state, enable } = usePush()
  const [busy, setBusy] = useState(false)
  if (!state) return <div className="skeleton mt-5 h-[52px] rounded-[18px]" />

  async function allow() {
    setBusy(true)
    try {
      await enable()
    } catch {
      toast.error('Bildirim izni kaydedilemedi. Tekrar deneyin.')
    }
    setBusy(false)
  }

  async function test() {
    setBusy(true)
    const problem = await sendTestPush()
    setBusy(false)
    if (problem) toast.error(problem)
    else toast('Deneme bildirimi gönderildi')
  }

  // Dokunulabilir yazı satırı (iPhone'daki mavi işlem satırları gibi)
  const action = (label: string, onClick: () => void) => (
    <Row label={<span className={cn('text-bh-blue dark:text-[#6E9BFF]', busy && 'opacity-50')}>{label}</span>} trailing={<span />} onClick={busy ? undefined : onClick} />
  )

  if (state === 'on')
    return (
      <Group title="Bu telefon">
        <Row label="Bildirim izni" value="Açık" />
        {action('Deneme bildirimi gönder', test)}
      </Group>
    )
  if (state === 'default')
    return (
      <Group title="Bu telefon">
        <Row label="Bildirim izni" value="Verilmedi" />
        {action('Bildirimlere izin ver', allow)}
      </Group>
    )
  const footer =
    state === 'install'
      ? 'Bildirimler için uygulama ana ekrana eklenmeli.'
      : state === 'denied'
        ? 'Ayarlar → Bildirimler → Monthwise'
        : 'Bu tarayıcı bildirim desteklemiyor.'
  return (
    <Group title="Bu telefon" footer={footer}>
      <Row label="Bildirim izni" value={state === 'unsupported' ? 'Desteklenmiyor' : 'Kapalı'} />
    </Group>
  )
}
