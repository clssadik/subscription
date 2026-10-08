import type { User } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Group, Row, SubPageHeader } from '@/components/SettingsList'
import { inputClass } from '@/components/FormBits'
import { formatDate } from '@/lib/format'
import { initials, useSettings } from '@/lib/settings'
import { hasCardNumber } from '@/lib/text'

/**
 * Profil: ad yazılırken taslakta durur, dışarı dokununca ya da Enter'a basınca kaydedilir.
 * E-posta giriş adresidir, buradan değişmez.
 */
export function ProfileEditor({ user, onBack }: { user: User; onBack: () => void }) {
  const { settings, update } = useSettings(user.id)
  // Taslak null ise kayıtlı ad gösterilir. Her harfte kaydedilse, ad boşalınca tam ekran "Ad soyad" ekranı açılıyordu.
  const [draft, setDraft] = useState<string | null>(null)
  const name = draft ?? settings.name
  const email = user.email ?? ''

  function commit() {
    const value = name.trim().replace(/\s+/g, ' ').slice(0, 40)
    // Ad ekranıyla aynı kural: en az 2 harf, kart numarası yok. Uymayan ad kaydedilmez, kayıtlı ad geri gelir.
    if (hasCardNumber(value)) toast.error('Ada kart numarası yazılmaz.')
    else if (value.length >= 2 && value !== settings.name) update({ name: value })
    setDraft(null)
  }

  // Alan odaktayken sayfa kapanırsa (blur olmadan) yazılan ad yine kaydedilir
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })
  useEffect(() => () => commitRef.current(), [])

  return (
    <>
      <SubPageHeader title="Profil" onBack={onBack} />
      <div className="mt-4 flex flex-col items-center">
        <span className="flex size-24 items-center justify-center rounded-full bg-[#636366] font-label text-4xl font-medium text-white">
          {initials(name, email)}
        </span>
      </div>

      <Group title="Ad">
        <label className="flex min-h-[52px] items-center px-3.5">
          <input
            aria-label="Ad soyad"
            className={inputClass}
            value={name}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            maxLength={40}
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
