import { BellOffIcon, BellRingIcon, CheckIcon, SendIcon, SmartphoneIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Segmented } from '@/components/FormBits'
import { Logo } from '@/components/Logo'
import { Chips, Group, Row, Switch, SubPageHeader } from '@/components/SettingsList'
import { haptic } from '@/lib/haptics'
import { sendTestPush, usePush } from '@/lib/push'
import { REMINDER_DAYS, daysLabel, useSettings, type NotifySettings, type ReminderDay } from '@/lib/settings'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const DAY_LABELS: Record<ReminderDay, string> = { 0: 'Ödeme günü', 1: '1 gün önce', 3: '3 gün önce', 7: '1 hafta önce' }
const DAY_OPTIONS = REMINDER_DAYS.map((d) => ({ value: d, label: DAY_LABELS[d] }))

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

      <PushCard />

      <Group>
        <Row label="Hatırlatmalar" trailing={<Switch label="Hatırlatmalar" checked={n.enabled} onChange={(enabled) => updateNotify({ enabled })} />} />
      </Group>

      {/* Hatırlatmalar kapalıyken ayarlar soluk ve dokunulamaz */}
      <div className={cn('transition-opacity', off && 'pointer-events-none opacity-40')} aria-disabled={off}>
        <Group title="Abonelik yenilenmesi" footer={`Her abonelik için: ${daysLabel(n.subscriptionDays).toLocaleLowerCase('tr')}. Birden fazla seçebilirsin.`}>
          <Chips options={DAY_OPTIONS} value={n.subscriptionDays} onChange={(subscriptionDays) => updateNotify({ subscriptionDays })} disabled={off} />
        </Group>

        <Group title="Kart son ödemesi">
          <Chips options={DAY_OPTIONS} value={n.cardDays} onChange={(cardDays) => updateNotify({ cardDays })} disabled={off} />
          <Row label="Hesap kesilince haber ver" trailing={<Switch label="Hesap kesilince haber ver" checked={n.statement} onChange={(statement) => updateNotify({ statement })} />} />
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

        <Group title="Ödenmeyenler" footer="Son gün geçtiği hâlde ödendi işaretlenmemiş ödemeyi ertesi sabah tekrar hatırlatır.">
          <Row label="Gecikince tekrar hatırlat" trailing={<Switch label="Gecikince tekrar hatırlat" checked={n.overdue} onChange={(overdue) => updateNotify({ overdue })} />} />
        </Group>

        <Group title="Özet" footer={n.summary === 'weekly' ? 'Her pazartesi: o hafta kaç ödeme var, toplam ne kadar.' : n.summary === 'monthly' ? 'Her ayın 1’i: o ay kaç ödeme var, toplam ne kadar.' : 'Toplu özet gönderilmez.'}>
          <div className="p-1.5">
            <Segmented
              value={n.summary}
              onChange={(summary: NotifySettings['summary']) => {
                haptic()
                updateNotify({ summary })
              }}
              options={[
                { value: 'off', label: 'Kapalı' },
                { value: 'weekly', label: 'Haftalık' },
                { value: 'monthly', label: 'Aylık' },
              ]}
            />
          </div>
        </Group>

        {state.subscriptions.length > 0 && (
          <Group title="Abonelik bazında" footer="Bir aboneliğe dokunup kapatabilir ya da kendi süresini seçebilirsin.">
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
function PushCard() {
  const { state, enable } = usePush()
  const [busy, setBusy] = useState(false)
  if (!state) return <div className="skeleton mt-3 h-[76px] rounded-[18px]" />

  async function allow() {
    setBusy(true)
    try {
      await enable()
    } catch {
      toast.error('Bildirim izni kaydedilemedi. Tekrar dene.')
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

  const box = 'mt-3 flex items-center gap-3 rounded-[18px] bg-surface p-3.5'
  const icon = 'flex size-9 shrink-0 items-center justify-center rounded-full'
  const button = 'pressable shrink-0 rounded-full bg-ink px-3.5 py-2 text-[13px] font-medium text-page disabled:opacity-50'

  if (state === 'on')
    return (
      <div className={box}>
        <span className={cn(icon, 'bg-bh-green/15 text-bh-green')}><CheckIcon className="size-5" strokeWidth={2.4} /></span>
        <p className="min-w-0 flex-1 text-sm"><b className="font-medium">Bu telefon bildirim alıyor.</b><br /><span className="text-subtle">Ayarlara göre seçtiğin saatte gelir.</span></p>
        <button type="button" onClick={test} disabled={busy} className={cn(button, 'flex items-center gap-1.5 bg-page text-ink')}>
          <SendIcon className="size-3.5" /> Dene
        </button>
      </div>
    )
  if (state === 'default')
    return (
      <div className={box}>
        <span className={cn(icon, 'bg-page')}><BellRingIcon className="size-5" /></span>
        <p className="min-w-0 flex-1 text-sm"><b className="font-medium">Bildirimleri aç</b><br /><span className="text-subtle">Ödeme yaklaşınca bu telefona haber verelim.</span></p>
        <button type="button" onClick={allow} disabled={busy} className={button}>İzin ver</button>
      </div>
    )
  if (state === 'install')
    return (
      <div className={box}>
        <span className={cn(icon, 'bg-page')}><SmartphoneIcon className="size-5" /></span>
        <p className="min-w-0 flex-1 text-sm"><b className="font-medium">Önce ana ekrana ekle</b><br /><span className="text-subtle">iPhone bildirimleri sadece ana ekrandaki Monthwise'a gönderir.</span></p>
      </div>
    )
  return (
    <div className={box}>
      <span className={cn(icon, 'bg-page')}><BellOffIcon className="size-5" /></span>
      <p className="min-w-0 flex-1 text-sm">
        {state === 'denied' ? (
          <><b className="font-medium">Bildirimler kapalı</b><br /><span className="text-subtle">Ayarlar → Bildirimler → Monthwise'dan açabilirsin.</span></>
        ) : (
          <><b className="font-medium">Bu tarayıcı bildirim desteklemiyor</b><br /><span className="text-subtle">Ayarların yine de kaydediliyor.</span></>
        )}
      </p>
    </div>
  )
}
