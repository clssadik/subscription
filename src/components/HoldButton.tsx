import type { ComponentProps } from 'react'
import { useLongPress } from '@/lib/useLongPress'

/** Dokununca ya da biraz basılı tutunca (hafif titreşimle) onOpen çalışan düğme: abonelik/kart sayfasını açar */
export function HoldButton({ onOpen, ...props }: Omit<ComponentProps<'button'>, 'onClick'> & { onOpen: () => void }) {
  const hold = useLongPress(onOpen)
  return <button type="button" {...props} {...hold} onClick={onOpen} />
}
