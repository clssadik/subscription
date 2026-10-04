import { CheckIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BankMark } from '@/components/BankMark'
import { Logo } from '@/components/Logo'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

// Karşılama ekranındaki örnek bildirimler: uygulamanın ne yaptığını gösterir.
// Birkaç saniyede bir en üste yenisi düşer, diğerleri aşağı kayar, en alttaki söner (iPhone bildirim listesi gibi).

type Note =
  | { kind: 'service'; key: string; name: string; text: string; amount?: number; paid?: boolean }
  | { kind: 'bank'; bank: string; color: string; last4: string; text: string; paid?: boolean }

const NOTES: Note[] = [
  { kind: 'service', key: 'netflix', name: 'Netflix', text: 'Yarın yenileniyor', amount: 229.99 },
  { kind: 'bank', bank: 'Garanti BBVA', color: '#0B7A43', last4: '4821', text: 'Son ödemeye 3 gün kaldı' },
  { kind: 'service', key: 'spotify', name: 'Spotify', text: 'Ödendi olarak işaretlendi', paid: true },
  { kind: 'service', key: 'youtube', name: 'YouTube Premium', text: 'Bugün çekilecek', amount: 79.99 },
  { kind: 'bank', bank: 'Akbank', color: '#C8102E', last4: '1907', text: 'Ekstre kesildi' },
  { kind: 'service', key: 'icloud', name: 'iCloud+', text: '5 gün sonra yenileniyor', amount: 39.99 },
  { kind: 'bank', bank: 'Yapı Kredi', color: '#004B93', last4: '3310', text: 'Ödendi olarak işaretlendi', paid: true },
  { kind: 'service', key: 'disney', name: 'Disney+', text: 'Yarın yenileniyor', amount: 349.9 },
]

const ROW = 64
const GAP = 8
const EVERY = 2200

export function NotificationStack({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  // Ekrana sığan bildirim sayısı: en çok 2, kısa telefonlarda 1 (taşmasın)
  const [fit, setFit] = useState(2)
  // Kaçıncı bildirimin en üstte olduğu; her adımda bir artar
  const [head, setHead] = useState(2)

  // Ekran çizilmeden ölçülür: ilk anda fazla kart görünüp başlığın üstünde sönmesin
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setFit(Math.max(1, Math.min(2, Math.floor((el.clientHeight + GAP) / (ROW + GAP)))))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setHead((h) => h + 1), EVERY)
    return () => window.clearInterval(id)
  }, [])

  // Görünenler + az önce düşen (sönerek çıkar). id sabit kalır ki kayma geçişi çalışsın.
  const items = Array.from({ length: fit + 1 }, (_, i) => ({ id: head - i, slot: i }))

  return (
    <div ref={box} className={cn('relative', className)} aria-hidden>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ height: fit * ROW + (fit - 1) * GAP }}>
        {items.map(({ id, slot }) => (
          <div
            key={id}
            className={cn(
              'absolute inset-x-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
              slot === 0 && id > 2 && 'notif-in',
              slot === fit && '-z-10 opacity-0',
            )}
            // Düşen kart aşağı kaymaz, en alttaki yerinde küçülüp söner (başlığın üstüne taşmasın)
            style={{ height: ROW, transform: `translateY(${Math.min(slot, fit - 1) * (ROW + GAP)}px) scale(${slot === fit ? 0.9 : 1})` }}
          >
            <NoteRow note={NOTES[((id % NOTES.length) + NOTES.length) % NOTES.length]} />
          </div>
        ))}
      </div>
    </div>
  )
}

function NoteRow({ note }: { note: Note }) {
  const title = note.kind === 'service' ? note.name : `${note.bank} •• ${note.last4}`
  return (
    <div className="flex h-full items-center gap-3 rounded-[20px] bg-surface px-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      {note.kind === 'service' ? <Logo serviceKey={note.key} name={note.name} size={38} /> : <BankMark bankName={note.bank} color={note.color} size={38} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{title}</p>
        <p className="truncate text-[13px] text-subtle">{note.text}</p>
      </div>
      {note.kind === 'service' && note.amount != null && <span className="num text-[15px]">{formatMoney(note.amount)}</span>}
      {note.paid && (
        <span className="flex size-6 items-center justify-center rounded-full bg-bh-green text-white">
          <CheckIcon className="size-4" strokeWidth={3} />
        </span>
      )}
    </div>
  )
}
