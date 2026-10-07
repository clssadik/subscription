import { CheckIcon } from 'lucide-react'
import { HoldToConfirm } from '@/components/HoldToConfirm'
import { formatDate } from '@/lib/format'

/** "Ödendi" düğmesinin yerine: bu ayın ödemesi yapıldı, sonraki ay değişince işaretlenebilir. onUndo verilirse sağda basılı tutulan "Geri al". */
export function PaidNote({ month, onUndo }: { month: Date; onUndo?: () => void }) {
  return (
    <div className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-[18px] bg-surface pr-1.5 pl-3.5 font-medium">
      <span className="flex size-5 items-center justify-center rounded-full bg-bh-green text-white">
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </span>
      <span className="flex-1">{formatDate(month, 'LLLL')} ödendi</span>
      {onUndo && (
        // Yanlışlıkla dokunmayla olmasın: basılı tutunca dolar ve geri alır.
        // Dokunma alanı 44px: kenarlık şeffaf ve zemin kenarlığın içinde kalıyor, görünen düğme 36px olarak aynı.
        <HoldToConfirm onConfirm={onUndo} className="min-h-11 min-w-[100px] rounded-[16px] border-4 border-transparent bg-clip-padding bg-page px-3 text-sm font-medium text-bh-red">
          Geri al
        </HoldToConfirm>
      )}
    </div>
  )
}
