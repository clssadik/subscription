import type { User } from '@supabase/supabase-js'
import { Group, Row, SubPageHeader } from '@/components/SettingsList'
import { inputClass } from '@/components/FormBits'
import { formatDate } from '@/lib/format'
import { initials, useSettings } from '@/lib/settings'

/** Profil: ad yazıldıkça kaydedilir. E-posta giriş adresidir, buradan değişmez. */
export function ProfileEditor({ user, onBack }: { user: User; onBack: () => void }) {
  const { settings, update } = useSettings(user.id)
  const email = user.email ?? ''
  return (
    <>
      <SubPageHeader title="Profil" onBack={onBack} />
      <div className="mt-4 flex flex-col items-center">
        <span className="flex size-24 items-center justify-center rounded-full bg-[#A4A4AA] font-label text-4xl font-medium text-white dark:bg-[#636366]">
          {initials(settings.name, email)}
        </span>
      </div>

      <Group title="Ad">
        <label className="flex min-h-[52px] items-center px-3.5">
          <input
            className={inputClass}
            value={settings.name}
            onChange={(e) => update({ name: e.target.value.slice(0, 40) })}
            placeholder="Ad soyad"
            autoComplete="name"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </label>
      </Group>

      <Group title="Hesap">
        <Row label="E-posta" value={<span className="block max-w-48 truncate">{email}</span>} />
        <Row label="Üyelik" value={formatDate(new Date(user.created_at), 'd MMMM yyyy')} />
      </Group>
    </>
  )
}
