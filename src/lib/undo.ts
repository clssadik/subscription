import { toast } from 'sonner'
import { haptic } from './haptics'
import { play } from './sound'
import { useStore } from './store'

/**
 * Silme gibi işlemleri "Geri al" butonlu bir bildirimle yapar.
 * ids verilirse geri almak sadece o kayıtları geri koyar; 5 saniye içindeki başka değişiklikler kalır.
 * ids yoksa bütün durum işlemden önceki hâline döner.
 */
export function useUndoable() {
  const { state, dispatch } = useStore()
  return (message: string, run: () => void, ids?: string[]) => {
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
          if (ids) dispatch({ type: 'undo/restore', before, ids })
          else dispatch({ type: 'state/restore', state: before })
        },
      },
    })
  }
}
