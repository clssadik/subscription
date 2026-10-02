import { CheckIcon } from 'lucide-react'
import { formatDate } from '@/lib/format'

/** "Ödendi" düğmesinin yerine: bu ayın ödemesi yapıldı, sonraki ay değişince işaretlenebilir */
export function PaidNote({ month }: { month: Date }) {
  return (
    <p className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-surface font-medium">
      <span className="flex size-5 items-center justify-center rounded-full bg-bh-green text-white">
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </span>
      {formatDate(month, 'LLLL')} ödendi
    </p>
  )
}
