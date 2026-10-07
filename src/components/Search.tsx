import { SearchIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Search } from '@/lib/useSearch'
import { cn } from '@/lib/utils'

// Abonelikler ve Geçmiş'teki arama: başlıktaki düğme ve özet kutusuyla yer değiştiren arama alanı (durum: src/lib/useSearch.ts)

/** Başlıktaki arama düğmesi: arama açıkken basınca kapanır */
export function SearchButton({ search }: { search: Search }) {
  return (
    <button
      onClick={search.toggle}
      aria-label={search.open ? 'Aramayı kapat' : 'Ara'}
      aria-pressed={search.open}
      className={cn(
        'pressable flex size-11 items-center justify-center rounded-full transition-colors duration-300',
        search.open ? 'bg-ink text-page' : 'bg-surface',
      )}
    >
      <SearchIcon className="size-5" strokeWidth={2.2} />
    </button>
  )
}

/** Yüksekliği yumuşakça açılıp kapanan kutu (iki satır arası geçiş için) */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      aria-hidden={!open || undefined}
      className={cn(
        'grid transition-[grid-template-rows,opacity,scale] duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] scale-[0.97] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

/** Üstteki özet kutusu ile arama alanı arasında yumuşak geçiş */
export function SearchSwap({ search, placeholder, children }: { search: Search; placeholder: string; children: ReactNode }) {
  const { query, setQuery, open, input, hide } = search
  return (
    <>
      <Collapse open={open}>
        <div className="flex items-center gap-2 pb-1">
          {/* Sarı halka kutunun içine çizilir: kapanan kutu (overflow-hidden) kenarını kesmesin.
              İmleçli cihazda (klavye odağı) halka mavi: sarı, beyaz üstünde 3:1'in altında kalıyor. */}
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl bg-surface px-3.5 focus-within:ring-2 focus-within:ring-bh-yellow focus-within:ring-inset pointer-fine:focus-within:ring-[color:var(--focus)]">
            <SearchIcon className="size-4 shrink-0 text-subtle" />
            <input
              ref={input}
              type="search"
              enterKeyHint="search"
              value={query ?? ''}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') hide()
                // "Ara" tuşu klavyeyi indirir, sonuçlar kalır
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                aria-label="Temizle"
                onClick={() => {
                  setQuery('')
                  input.current?.focus()
                }}
                className="-mr-1 flex size-7 items-center justify-center rounded-full text-subtle animate-in fade-in zoom-in-75 duration-150"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </label>
          <button type="button" onClick={hide} className="min-h-11 px-1 text-sm text-subtle active:opacity-60">
            Vazgeç
          </button>
        </div>
      </Collapse>
      <Collapse open={!open}>{children}</Collapse>
    </>
  )
}
