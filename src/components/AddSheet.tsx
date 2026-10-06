import { format } from 'date-fns'
import { CreditCardIcon, RepeatIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { haptic } from '@/lib/haptics'
import { play } from '@/lib/sound'
import { DaySelect, Field, FieldGroup, inputClass, PrimaryButton, Segmented, selectClass } from '@/components/FormBits'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { BANKS, bankColor, bankName as fullBankName, cardColor } from '@/lib/banks'
import { parseAmount } from '@/lib/format'
import { SERVICES, getService, matchService, normalize } from '@/lib/services'
import { newId, useStore } from '@/lib/store'
import { useUndoable } from '@/lib/undo'
import { CURRENCIES, type BillingCycle, type CardKind, type CreditCard, type Currency, type Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Seçili düğme (tür ve segmentler): açık temada beyaz + hafif gölge, koyu temada bir ton açık gri */
const raised = 'bg-raised text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:shadow-none'

/** Açılacak form. id varsa düzenleme; serviceKey/name/bankName yeni kayıtta hazır seçili gelir. */
export type SheetTarget = { kind: 'subscription' | 'card'; id?: string; serviceKey?: string; name?: string; bankName?: string } | null

/** "+" ile ya da düzenle ile açılan alt panel */
export function AddSheet({ target, onClose }: { target: SheetTarget; onClose: () => void }) {
  const [kind, setKind] = useState<'subscription' | 'card'>(target?.kind ?? 'subscription')
  const [lastTarget, setLastTarget] = useState(target)
  // Kapanırken son açılan form panelde kalır: içerik silinip panel önce büzülmesin, olduğu gibi aşağı kaysın
  const [shown, setShown] = useState(target)
  // Her açılışta artar: form temiz başlasın (kapanınca silinmediği için eski yazılar kalmasın)
  const [opened, setOpened] = useState(0)
  // Panel her açıldığında türü hedefe göre sıfırla
  if (target !== lastTarget) {
    setLastTarget(target)
    if (target) {
      setKind(target.kind)
      setShown(target)
      setOpened((n) => n + 1)
    }
  }
  const editing = !!shown?.id
  function pick(next: 'subscription' | 'card') {
    if (next === kind) return
    haptic()
    setKind(next)
  }

  // Kapanırken klavyeyi önce indir: klavye panel kayarken kapanınca sayfa sarsılıyor
  function close() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    onClose()
  }

  return (
    // disablePreventScroll={false}: vaul iPhone'da kayan alan uçtayken esnemeyi bilerek kapatıyor (usePreventScroll); bu onu kapatır.
    // Aynı şey vaul'un "odaklanınca sayfa kaymasın" hilesini de kapattığı için yerine bizimki çalışır (data-keep-page, src/lib/keyboard.ts).
    <Drawer open={!!target} onOpenChange={(o) => !o && close()} disablePreventScroll={false}>
      <DrawerContent ref={glideWithKeyboard} data-keep-page className="max-h-[94svh] rounded-t-[30px] border-0 bg-page data-[vaul-drawer-direction=bottom]:max-h-[94svh]">
        {/* Kayan alan: min-h-0 ile panel kısalınca (klavye açılınca) o da kısalır ve içerik aşağı yukarı kaydırılabilir */}
        <div className="mx-auto min-h-0 w-full max-w-md overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DrawerTitle className="num pt-3 pb-1 text-center text-lg font-medium">
            {editing ? (kind === 'card' ? 'Kartı düzenle' : 'Aboneliği düzenle') : 'Yeni ekle'}
          </DrawerTitle>
          <DrawerDescription className="sr-only">Abonelik ya da kart bilgileri</DrawerDescription>

          {!editing && (
            // Seçili zemin tek parça: seçim değişince iPhone'daki seçiciler gibi öteki düğmenin altına kayar
            <div className="relative mt-3 flex gap-2 rounded-[18px] bg-line/50 p-1 dark:bg-surface">
              <span
                aria-hidden
                className={cn('absolute top-1 bottom-1 left-1 w-[calc(50%-0.5rem)] rounded-[14px] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]', raised)}
                style={{ transform: kind === 'card' ? 'translateX(calc(100% + 0.5rem))' : 'translateX(0)' }}
              />
              <KindButton active={kind === 'subscription'} onClick={() => pick('subscription')}>
                <RepeatIcon className="size-5" /> Abonelik
              </KindButton>
              <KindButton active={kind === 'card'} onClick={() => pick('card')}>
                <CreditCardIcon className="size-5" /> Kart
              </KindButton>
            </div>
          )}

          {/* Abonelik ↔ Kart: iki form yan yana durur, seçiciyle aynı anda ve aynı eğriyle birlikte kayar (eski form bir yandan
              çıkarken yenisi öbür yandan girer). Panel boyu ikisinden uzun olanınki: zıplamaz.
              Düzenlemede sadece o kaydın formu. Görünmeyen form dokunulamaz (inert). */}
          {shown && editing ? (
            shown.kind === 'card' ? (
              <CardFields key={`${shown.id}-${opened}`} id={shown.id} preset={shown} onDone={close} />
            ) : (
              <SubscriptionFields key={`${shown.id}-${opened}`} id={shown.id} preset={shown} onDone={close} />
            )
          ) : (
            shown && (
              <div className="-mx-4 overflow-x-clip px-4">
                <div
                  className="flex w-[calc(200%+2rem)] gap-8 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{ transform: kind === 'card' ? 'translateX(calc(-50% - 1rem))' : 'translateX(0)' }}
                >
                  <div className="flex w-[calc(50%-1rem)] min-w-0 flex-col" inert={kind !== 'subscription'}>
                    <SubscriptionFields key={`new-sub-${opened}`} preset={shown} onDone={close} />
                  </div>
                  <div className="flex w-[calc(50%-1rem)] min-w-0 flex-col" inert={kind !== 'card'}>
                    <CardFields key={`new-card-${opened}`} preset={shown} onDone={close} />
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/**
 * Klavye açılınca/kapanınca vaul paneli tek seferde yeni yerine koyuyor (boy ve alt boşluk). Boyu her karede
 * değiştirerek kaydırmak formu her karede yeniden yerleştirdiği için takılıyordu. Bunun yerine panel yeni yerine anında
 * oturur, eski yerinden yeni yerine "translate" ile kayar: sadece ekran kartı çalışır, akıcıdır.
 * translate, vaul'un kendi transform'una (sürükleme, açılış) karışmaz.
 */
function glideWithKeyboard(el: HTMLDivElement | null) {
  if (!el) return
  // Panelin üst kenarının yeri, dönüşümlerden (açılış, sürükleme) bağımsız: alt boşluk + boy
  const reach = () => (parseFloat(el.style.bottom) || 0) + el.offsetHeight
  let size = `${el.style.height}|${el.style.bottom}`
  let last = reach()
  const observer = new MutationObserver(() => {
    const next = `${el.style.height}|${el.style.bottom}`
    if (next === size) return
    size = next
    const now = reach()
    const from = now - last
    last = now
    for (const a of el.getAnimations()) if (a.id === 'keyboard-glide') a.cancel()
    if (Math.abs(from) < 2) return
    // Yeni yerine oturmuş paneli eski yerinden başlatıp kaydırır. Sakin: 0,7 sn, ani başlamadan uzun ve yumuşak durur
    // (0,38 sn'lik iPhone eğrisi aceleci bulundu).
    const glide = el.animate([{ translate: `0 ${from}px` }, { translate: '0 0' }], { duration: 700, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' })
    glide.id = 'keyboard-glide'
  })
  observer.observe(el, { attributes: true, attributeFilter: ['style'] })
  return () => observer.disconnect()
}

function KindButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'pressable relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] font-label text-sm transition-colors duration-300',
        active ? 'font-medium text-ink' : 'text-subtle',
      )}
    >
      {children}
    </button>
  )
}

function SubscriptionFields({ id, preset, onDone }: { id?: string; preset: NonNullable<SheetTarget>; onDone: () => void }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const sub = state.subscriptions.find((s) => s.id === id)
  const [serviceKey, setServiceKey] = useState<string | null>(sub?.serviceKey ?? preset.serviceKey ?? null)
  const [name, setName] = useState(sub?.name ?? getService(preset.serviceKey)?.name ?? preset.name ?? '')
  const [amount, setAmount] = useState(sub ? String(sub.amount).replace('.', ',') : '')
  const [currency, setCurrency] = useState<Currency>(sub?.currency ?? 'TRY')
  const [cycle, setCycle] = useState<BillingCycle>(sub?.cycle ?? 'monthly')
  const [renewalDate, setRenewalDate] = useState(() => sub?.renewalDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [cardId, setCardId] = useState(sub?.cardId ?? '')
  // "Yeni kart ekle" seçilince kartın bilgileri bu formda girilir; kaydedince kart da oluşur ve aboneliğe bağlanır
  const newCard = cardId === NEW_CARD
  const [card, setCard] = useState<NewCard>({ bankName: '', last4: '', kind: 'credit', statementDay: null })
  const [error, setError] = useState('')
  // Hata: mesajla birlikte hafif titreşim
  const fail = (message: string) => {
    haptic()
    setError(message)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!name.trim()) return fail('Abonelik adı girin.')
    if (!(value > 0)) return fail('Tutar sayı olmalı, ör. 229,99.')
    if (!renewalDate) return fail('Yenilenme tarihi seçin.')
    let linkedCard = cardId || null
    if (newCard) {
      const problem = cardProblem(card)
      if (problem) return fail(problem)
      const saved = buildCard(card)
      dispatch({ type: 'card/save', card: saved })
      linkedCard = saved.id
    }
    // Elle yazılan ad listedeki bir servise denk geliyorsa logosunu bağla
    const key = getService(serviceKey)?.name === name.trim() ? serviceKey : (matchService(name)?.key ?? null)
    const subscription: Subscription = {
      id: sub?.id ?? newId(),
      name: name.trim(),
      amount: value,
      currency,
      cycle,
      renewalDate,
      cardId: linkedCard,
      serviceKey: key,
    }
    dispatch({ type: 'subscription/save', subscription })
    haptic()
    play('save')
    toast.success(sub ? 'Abonelik güncellendi' : newCard ? 'Abonelik ve kart eklendi' : 'Abonelik eklendi')
    onDone()
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-1 flex-col gap-3">
      <FieldGroup>
        <Field label="Ad" htmlFor="s-name">
          <SuggestInput
            id="s-name"
            value={name}
            onChange={setName}
            placeholder="Netflix"
            items={SERVICES}
            onPick={(s) => {
              setServiceKey(s.key)
              setName(s.name)
            }}
          />
        </Field>
        <Field label="Tutar" htmlFor="s-amount">
          <input id="s-amount" className={cn(inputClass, 'num text-lg')} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="229,99" />
          <select aria-label="Para birimi" className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Periyot">
          <Segmented
            className="w-full"
            activeClass={raised}
            value={cycle}
            onChange={setCycle}
            options={[{ value: 'monthly', label: 'Aylık' }, { value: 'yearly', label: 'Yıllık' }]}
          />
        </Field>
        <Field label="Yenilenme" htmlFor="s-date">
          <input id="s-date" type="date" className={inputClass} value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
        </Field>
        <Field label="Kart" htmlFor="s-card">
          <select id="s-card" className={cn(selectClass, 'w-full font-normal text-ink dark:text-ink')} value={cardId} onChange={(e) => setCardId(e.target.value)}>
            <option value="">Kart seçilmedi</option>
            {state.cards.map((c) => <option key={c.id} value={c.id}>{c.bankName} •• {c.last4}</option>)}
            <option value={NEW_CARD}>+ Yeni kart ekle</option>
          </select>
        </Field>
      </FieldGroup>

      {newCard && (
        <>
          <p className="label -mb-1 px-1 text-subtle">Yeni kart</p>
          <CardInputs value={card} onChange={setCard} idPrefix="sc" />
        </>
      )}

      {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
      <PrimaryButton type="submit" className="mt-auto">Kaydet</PrimaryButton>
      {sub && (
        <button
          type="button"
          className="min-h-11 text-bh-red"
          onClick={() => {
            onDone()
            undoable(`${sub.name} silindi`, () => dispatch({ type: 'subscription/delete', id: sub.id }))
          }}
        >
          Aboneliği sil
        </button>
      )}
    </form>
  )
}

const NEW_CARD = '__new'

/** Kart formunun alanları (kart ekleme ve abonelik eklerken yeni kart) */
type NewCard = { bankName: string; last4: string; kind: CardKind; statementDay: number | null }

function cardProblem(c: NewCard) {
  if (!c.bankName.trim()) return 'Banka adı girin.'
  if (!/^\d{4}$/.test(c.last4)) return 'Son 4 hane tam 4 rakam olmalı.'
  if (c.kind === 'credit' && !c.statementDay) return 'Hesap kesim günü seçin.'
  return ''
}

/** Renk banka adından gelir; listede olmayan bankada düzenlerken eski rengi koru */
function colorFor(bankName: string, existing?: CreditCard) {
  return bankColor(bankName) ?? (existing && existing.bankName === bankName.trim() ? existing.color : cardColor(bankName))
}

function buildCard(c: NewCard, existing?: CreditCard): CreditCard {
  return {
    id: existing?.id ?? newId(),
    bankName: fullBankName(c.bankName),
    last4: c.last4,
    kind: c.kind,
    // Banka kartında kesim yok; son ödeme kesimden hesaplanır
    statementDay: c.kind === 'credit' ? c.statementDay : null,
    // Limit ve kart ağı artık sorulmuyor; eski kartlarda varsa korunur
    limit: existing?.limit ?? 0,
    color: colorFor(c.bankName, existing),
    network: existing?.network ?? null,
  }
}

function CardInputs({ value, onChange, idPrefix, existing }: { value: NewCard; onChange: (c: NewCard) => void; idPrefix: string; existing?: CreditCard }) {
  const set = (patch: Partial<NewCard>) => onChange({ ...value, ...patch })
  const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max)
  return (
    <>
      <Segmented
        className="bg-line/50 dark:bg-surface"
        activeClass={raised}
        value={value.kind}
        onChange={(kind) => set({ kind })}
        options={[{ value: 'credit', label: 'Kredi kartı' }, { value: 'debit', label: 'Banka kartı' }]}
      />
      <FieldGroup>
        <Field label="Banka adı" htmlFor={`${idPrefix}-bank`}>
          <SuggestInput
            id={`${idPrefix}-bank`}
            value={value.bankName}
            onChange={(bankName) => set({ bankName })}
            placeholder="Garanti BBVA"
            items={BANKS}
            onPick={(b) => set({ bankName: b.name })}
          />
          {value.bankName.trim() && <span aria-hidden className="size-4 shrink-0 rounded-full" style={{ background: colorFor(value.bankName, existing) }} />}
        </Field>
        <Field label="Son 4 hane" htmlFor={`${idPrefix}-last4`}>
          <input id={`${idPrefix}-last4`} className={cn(inputClass, 'num tracking-widest')} inputMode="numeric" autoComplete="off" value={value.last4} onChange={(e) => set({ last4: digits(e.target.value, 4) })} placeholder="1234" />
        </Field>
        {/* Banka kartında kesim yok: satır yumuşakça kapanır / açılır */}
        <div
          aria-hidden={value.kind !== 'credit'}
          data-collapsed={value.kind !== 'credit' || undefined}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
            value.kind === 'credit' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <Field label="Hesap kesim" htmlFor={`${idPrefix}-st`}>
              <DaySelect id={`${idPrefix}-st`} value={value.statementDay} onChange={(statementDay) => set({ statementDay })} />
            </Field>
          </div>
        </div>
      </FieldGroup>
    </>
  )
}

function CardFields({ id, preset, onDone }: { id?: string; preset: NonNullable<SheetTarget>; onDone: () => void }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const card = state.cards.find((c) => c.id === id)
  const [value, setValue] = useState<NewCard>({
    bankName: card?.bankName ?? preset.bankName ?? '',
    last4: card?.last4 ?? '',
    kind: card?.kind ?? 'credit',
    statementDay: card?.statementDay ?? null,
  })
  const [error, setError] = useState('')
  // Hata: mesajla birlikte hafif titreşim
  const fail = (message: string) => {
    haptic()
    setError(message)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const problem = cardProblem(value)
    if (problem) return fail(problem)
    dispatch({ type: 'card/save', card: buildCard(value, card) })
    haptic()
    play('save')
    toast.success(card ? 'Kart güncellendi' : 'Kart eklendi')
    onDone()
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-1 flex-col gap-3">
      <CardInputs value={value} onChange={setValue} idPrefix="c" existing={card} />

      {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
      <PrimaryButton type="submit" className="mt-auto">Kaydet</PrimaryButton>
      {card && (
        <button
          type="button"
          className="min-h-11 text-bh-red"
          onClick={() => {
            onDone()
            undoable(`${card.bankName} •• ${card.last4} silindi`, () => dispatch({ type: 'card/delete', id: card.id }))
          }}
        >
          Kartı sil
        </button>
      )}
    </form>
  )
}

/**
 * Öneri listeli yazı alanı: yazarken adı yazılanla başlayanlar alanın altında açılan bir listede çıkar (iPhone menüsü gibi).
 * Liste alttaki alanların üstüne biner, formu büyütmez. Dokununca ad dolar; alandan çıkınca liste kapanır.
 */
function SuggestInput<T extends { key: string; name: string }>({
  id,
  value,
  onChange,
  placeholder,
  items,
  onPick,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  items: T[]
  onPick: (item: T) => void
}) {
  const [focused, setFocused] = useState(false)
  const q = normalize(value)
  const hints = !q || items.some((i) => normalize(i.name) === q) ? [] : items.filter((i) => normalize(i.name).startsWith(q)).slice(0, 6)
  return (
    <>
      <input
        id={id}
        className={inputClass}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setFocused(true)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {focused && hints.length > 0 && (
        <ul
          role="listbox"
          // Alttan açılan sayfa bu dokunuşu sürükleme sanmasın
          data-vaul-no-drag
          className="absolute top-[calc(100%+10px)] -left-2 z-30 w-[min(15rem,calc(100%+1rem))] overflow-hidden rounded-[14px] bg-surface py-1 shadow-[0_10px_30px_rgb(0_0_0/0.18),0_0_0_0.5px_rgb(0_0_0/0.08)] dark:bg-[#262626] dark:shadow-[0_10px_30px_rgb(0_0_0/0.6),0_0_0_0.5px_rgb(255_255_255/0.12)]"
        >
          {hints.map((i) => (
            <li key={i.key} role="option" aria-selected={false}>
              <button
                type="button"
                // Alanın odağı kaybolmasın (yoksa liste dokunuş bitmeden kapanır). iPhone odağı dokunuştan sonra gelen
                // mousedown'da değiştirir; pointerdown'u engellemek orada yetmiyor. Bu yüzden seçim parmak kalkınca yapılır.
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onPointerUp={() => {
                  onPick(i)
                  setFocused(false)
                }}
                // Klavyeyle seçim (Enter / boşluk)
                onClick={(e) => {
                  if (e.detail > 0) return
                  onPick(i)
                  setFocused(false)
                }}
                className="w-full px-3.5 py-2.5 text-left text-base active:bg-line"
              >
                {i.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
