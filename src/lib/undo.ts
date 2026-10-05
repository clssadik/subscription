import { toast } from 'sonner'
import { haptic } from './haptics'
import { play } from './sound'
import { useStore } from './store'

/** Silme gibi işlemleri "Geri al" butonlu bir bildirimle yapar. */
export function useUndoable() {
  const { state, dispatch } = useStore()
  return (message: string, run: () => void) => {
    const before = state
    haptic()
    play('delete')
    run()
    toast(message, {
      duration: 5000,
      action: {
        label: 'Geri al',
        onClick: () => {
          haptic()
          play('undo')
          dispatch({ type: 'state/restore', state: before })
        },
      },
    })
  }
}
