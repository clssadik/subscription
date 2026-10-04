import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { haptic } from '@/lib/haptics'
import { normalize } from '@/lib/services'

// Abonelikler ve Geçmiş'teki arama. Büyütece basınca üstteki özet kutusu yumuşakça kapanır, yerine arama alanı açılır
// ve klavye hemen gelir; "Vazgeç" tam tersini yapar (önce klavye iner). Görünüm: src/components/Search.tsx

export function useSearch() {
  // null = arama kapalı
  const [query, setQuery] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const open = query !== null

  function show() {
    haptic()
    // Alan hemen odaklanabilsin diye önce ekrana çizilir; odak dokunuşun içinde verilince iPhone klavyeyi hemen açar
    flushSync(() => setQuery(''))
    input.current?.focus({ preventScroll: true })
  }
  function hide() {
    haptic()
    input.current?.blur()
    setQuery(null)
  }

  return { query, setQuery, open, q: normalize(query ?? ''), input, toggle: () => (open ? hide() : show()), hide }
}

export type Search = ReturnType<typeof useSearch>
