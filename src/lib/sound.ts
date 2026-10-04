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

/** Tek nota: başta hızlı yükselir, sonra yumuşakça söner. glide verilirse frekans o değere kayar. */
function note(c: AudioContext, at: number, freq: number, length: number, { type = 'sine' as OscillatorType, volume = 0.12, glide = 0 } = {}) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, at + length)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(c.destination)
  osc.start(at)
  osc.stop(at + length + 0.02)
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
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime + 0.01
    if (sound === 'paid') {
      // "Ding": iki parlak nota, yukarı doğru
      note(ctx, t, 1047, 0.18)
      note(ctx, t + 0.08, 1568, 0.32)
    } else if (sound === 'undo') {
      // Geri alma: "ding"in tersi, iki yumuşak nota aşağı doğru
      note(ctx, t, 1568, 0.14, { volume: 0.1 })
      note(ctx, t + 0.07, 1047, 0.24, { volume: 0.1 })
    } else if (sound === 'save') {
      // Yumuşak onay: hafifçe yükselen tek nota
      note(ctx, t, 784, 0.2, { type: 'triangle', volume: 0.1, glide: 988 })
    } else {
      // Silme: alçalan, alçak bir nota
      note(ctx, t, 392, 0.26, { volume: 0.14, glide: 196 })
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
