// Short chime for in-app notification popups.
//
// Generated with the Web Audio API on purpose: no mp3 asset to ship and no extra
// dependency. Browsers keep the AudioContext suspended until the user interacts
// with the page, so `unlockNotificationSound()` is wired to the first gesture and
// `playNotificationSound()` resumes the context before scheduling anything.

const SOUND_PREF_KEY = "dupla_toast_sound"
const MIN_INTERVAL_MS = 900

let ctx: AudioContext | null = null
let lastPlayedAt = 0

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) {
    try { ctx = new Ctor() } catch { return null }
  }
  return ctx
}

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(SOUND_PREF_KEY) !== "off"
}

export function setNotificationSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return
  localStorage.setItem(SOUND_PREF_KEY, enabled ? "on" : "off")
}

// Call from a real user gesture (pointerdown / keydown) so later chimes are allowed.
export function unlockNotificationSound() {
  const audio = getContext()
  if (audio && audio.state === "suspended") audio.resume().catch(() => { /* ignore */ })
}

// Reading through a function avoids TS narrowing the `state` union after the
// `if (audio.state === "suspended")` check (resume() is async and may not have
// taken effect yet).
function currentState(audio: AudioContext): AudioContextState {
  return audio.state
}

export type NotificationSoundKind = "default" | "message"

interface Tone {
  frequency: number
  offset: number
  duration?: number
}

// Distinct shapes so the user can tell a chat message from anything else.
const CHIMES: Record<NotificationSoundKind, { gain: number; tones: Tone[] }> = {
  default: {
    gain: 0.3,
    tones: [
      { frequency: 880, offset: 0 },
      { frequency: 1320, offset: 0.11 },
    ],
  },
  message: {
    gain: 0.32,
    tones: [
      { frequency: 660, offset: 0 },
      { frequency: 880, offset: 0.1 },
      { frequency: 1174.7, offset: 0.2, duration: 0.22 },
    ],
  },
}

function emitChime(audio: AudioContext, kind: NotificationSoundKind) {
  const { gain: masterGain, tones } = CHIMES[kind] ?? CHIMES.default
  const start = audio.currentTime + 0.01

  const master = audio.createGain()
  master.gain.setValueAtTime(masterGain, start)
  master.connect(audio.destination)

  for (const { frequency, offset, duration = 0.16 } of tones) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    const at = start + offset

    osc.type = "sine"
    osc.frequency.setValueAtTime(frequency, at)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(1, at + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)

    osc.connect(gain)
    gain.connect(master)
    osc.start(at)
    osc.stop(at + duration + 0.02)
  }

  // Release the graph once the last tone is gone
  window.setTimeout(() => master.disconnect(), 2000)
}

export function playNotificationSound(kind: NotificationSoundKind = "default") {
  if (!isNotificationSoundEnabled()) return
  const audio = getContext()
  if (!audio) return

  // Throttle: a burst of notifications should chime once, not machine-gun
  if (Date.now() - lastPlayedAt < MIN_INTERVAL_MS) return
  lastPlayedAt = Date.now()

  if (currentState(audio) === "running") {
    emitChime(audio, kind)
    return
  }

  // A suspended context silently drops everything scheduled on it, which is why
  // the very first notification used to arrive without sound. Resume first and
  // play as soon as it is actually running. If the browser is still waiting for
  // a user gesture, give up instead of firing a stale chime on the next click.
  let cancelled = false
  const timeout = window.setTimeout(() => { cancelled = true }, 1500)

  audio.resume()
    .then(() => {
      window.clearTimeout(timeout)
      if (!cancelled) emitChime(audio, kind)
    })
    .catch(() => window.clearTimeout(timeout))
}
