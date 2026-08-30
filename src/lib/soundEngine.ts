// src/lib/soundEngine.ts
'use client'

// Petit moteur de sons synthétisés (Web Audio API) — aucun fichier audio requis.
// Le volume est une préférence d'appareil (localStorage), pas une donnée de jeu.

const VOLUME_KEY = 'psg_sound_volume'
const DEFAULT_VOLUME = 0.6

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      audioCtx = new Ctor()
    } catch {
      return null
    }
  }
  // Certains navigateurs démarrent le contexte "suspended" avant un geste utilisateur.
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function getVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME
  const v = localStorage.getItem(VOLUME_KEY)
  return v !== null ? parseFloat(v) : DEFAULT_VOLUME
}

export function setVolume(v: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(1, v))))
}

function tone(freq: number, duration: number, type: OscillatorType, startOffset = 0, gainMult = 1) {
  const ctx = getCtx()
  const vol = getVolume()
  if (!ctx || vol <= 0) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const now = ctx.currentTime + startOffset
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(vol * 0.28 * gainMult, now + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.05)
}

export function playClick() {
  tone(600, 0.05, 'sine')
}

export function playCoinGain() {
  tone(880, 0.08, 'triangle', 0)
  tone(1320, 0.12, 'triangle', 0.06)
}

export function playSuccess() {
  tone(523, 0.1, 'sine', 0)
  tone(659, 0.1, 'sine', 0.08)
  tone(784, 0.18, 'sine', 0.16)
}

export function playError() {
  tone(220, 0.15, 'sawtooth', 0, 0.7)
  tone(180, 0.2, 'sawtooth', 0.1, 0.7)
}

export function playWhistle() {
  const ctx = getCtx()
  const vol = getVolume()
  if (!ctx || vol <= 0) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  const now = ctx.currentTime
  osc.frequency.setValueAtTime(1200, now)
  osc.frequency.linearRampToValueAtTime(1800, now + 0.15)
  gain.gain.setValueAtTime(vol * 0.22, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.35)
}

export function playGoal() {
  tone(392, 0.1, 'square', 0)
  tone(523, 0.1, 'square', 0.08)
  tone(659, 0.1, 'square', 0.16)
  tone(784, 0.25, 'square', 0.24)
}

/** Fanfare graduée selon la rareté — le clou du spectacle pour les Legend. */
export function playCardReveal(rarity: string) {
  switch (rarity) {
    case 'Legend':
      tone(392, 0.15, 'triangle', 0)
      tone(523, 0.15, 'triangle', 0.1)
      tone(659, 0.15, 'triangle', 0.2)
      tone(784, 0.15, 'triangle', 0.3)
      tone(1046, 0.45, 'triangle', 0.4, 1.2)
      break
    case 'Unique':
    case 'Give':
    case 'Encounter':
      tone(523, 0.15, 'triangle', 0)
      tone(784, 0.15, 'triangle', 0.12)
      tone(1046, 0.3, 'triangle', 0.24)
      break
    case 'Elite':
      tone(440, 0.12, 'triangle', 0)
      tone(659, 0.22, 'triangle', 0.1)
      break
    case 'Advanced':
      tone(392, 0.15, 'sine')
      break
    default:
      tone(330, 0.1, 'sine')
  }
}

export function playVictory() {
  tone(523, 0.12, 'square', 0)
  tone(659, 0.12, 'square', 0.1)
  tone(784, 0.12, 'square', 0.2)
  tone(1046, 0.35, 'square', 0.3, 1.1)
}

export function playDefeat() {
  tone(392, 0.18, 'sawtooth', 0, 0.6)
  tone(330, 0.18, 'sawtooth', 0.15, 0.6)
  tone(261, 0.3, 'sawtooth', 0.3, 0.6)
}
