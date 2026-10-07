import { useSyncExternalStore } from 'react'

// Kısa arayüz sesleri. Ses dosyası yok, notalar Web Audio ile o an üretilir.
// Tercih bu cihazda saklanır, varsayılan açık. iPhone sessizdeyse ses çıkmaz ("ambient": arkada çalan müziği de kesmez).
export type Sound = 'paid' | 'save' | 'delete' | 'undo'

const KEY = 'sound'
const listeners = new Set<() => void>()

function read() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

let enabled = read()
let ctx: AudioContext | null = null

export function setSoundEnabled(next: boolean) {
  enabled = next
  try {
    if (next) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, 'off')
  } catch {
    // Depolama kapalıysa tercih sadece bu oturumda geçerli
  }
  listeners.forEach((l) => l())
}

/** Tek nota: başta hızlı yükselir, sonra yumuşakça söner. */
function note(c: AudioContext, at: number, freq: number, length: number, volume: number, attack: number) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.frequency.setValueAtTime(freq, at)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(c.destination)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

/** Cam çan: ana nota ve iki ince üst ses birlikte; çabuk söndükleri için parlak ama yumuşak duyulur */
function bell(c: AudioContext, at: number, freq: number, length: number, volume: number) {
  note(c, at, freq, length, volume, 0.004)
  note(c, at, freq * 2.76, length * 0.45, volume * 0.35, 0.002)
  note(c, at, freq * 5.4, length * 0.2, volume * 0.12, 0.001)
}

/** Sadece bir dokunuşun içinden (onClick) çağrılmalı: iPhone sesi ancak öyle başlatır. */
export function play(sound: Sound) {
  if (!enabled) return
  try {
    if (!ctx) {
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'ambient'
      ctx = new AudioContext()
    }
    // iPhone arama ya da Siri sonrası bağlamı 'interrupted' bırakabiliyor: çalmıyorsa yeniden başlatılır
    if (ctx.state !== 'running') void ctx.resume()
    const t = ctx.currentTime + 0.01
    if (sound === 'undo') {
      // Geri alma: onay sesinin tersi, aşağı doğru iki çan
      bell(ctx, t, 1976, 0.35, 0.06)
      bell(ctx, t + 0.09, 1318, 0.45, 0.06)
    } else {
      // Ödendi, kaydet ve sil aynı ses: yukarı doğru iki cam çan
      bell(ctx, t, 1318, 0.5, 0.09)
      bell(ctx, t + 0.1, 1976, 0.7, 0.08)
    }
  } catch {
    // Tarayıcı ses desteklemiyorsa sessizce geç
  }
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useSoundEnabled() {
  return [useSyncExternalStore(subscribe, () => enabled), setSoundEnabled] as const
}
