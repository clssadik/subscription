import { toast } from 'sonner'
import { useStore } from './store'

/** Silme gibi işlemleri "Geri al" butonlu bir bildirimle yapar. */
export function useUndoable() {
  const { state, dispatch } = useStore()
  return (message: string, run: () => void) => {
    const before = state
    run()
    toast(message, {
      duration: 5000,
      action: { label: 'Geri al', onClick: () => dispatch({ type: 'state/restore', state: before }) },
    })
  }
}
