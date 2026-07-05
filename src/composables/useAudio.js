// Web Audio 音效引擎 + 触觉反馈。音量三档持久化到 localStorage(AUDIO_PREF_KEY)。
import { reactive } from 'vue'
import { AUDIO_PREF_KEY } from '../data/constants.js'

const VOLUME_STEPS = [1, 0.45, 0]
const VOLUME_ICONS = ['🔊', '🔉', '🔇']

export const audioUI = reactive({
  stepIdx: 0,
  get volume() { return VOLUME_STEPS[this.stepIdx] },
  get icon() { return VOLUME_ICONS[this.stepIdx] },
  get pct() { return Math.round(VOLUME_STEPS[this.stepIdx] * 100) },
})

function loadAudioPrefs() {
  try {
    const raw = localStorage.getItem(AUDIO_PREF_KEY)
    if (!raw) return
    const p = JSON.parse(raw)
    if (typeof p.stepIdx === 'number' && VOLUME_STEPS[p.stepIdx] !== undefined) {
      audioUI.stepIdx = p.stepIdx
    }
  } catch (e) { /* ignore */ }
}
function saveAudioPrefs() {
  try { localStorage.setItem(AUDIO_PREF_KEY, JSON.stringify({ stepIdx: audioUI.stepIdx })) } catch (e) { /* ignore */ }
}
loadAudioPrefs()

let audioCtx = null
let masterGain = null

export function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const comp = audioCtx.createDynamicsCompressor()
      const t0 = audioCtx.currentTime
      comp.threshold.setValueAtTime(-18, t0)
      comp.knee.setValueAtTime(24, t0)
      comp.ratio.setValueAtTime(8, t0)
      comp.attack.setValueAtTime(0.003, t0)
      comp.release.setValueAtTime(0.15, t0)
      masterGain = audioCtx.createGain()
      masterGain.gain.setValueAtTime(audioUI.volume, t0)
      masterGain.connect(comp).connect(audioCtx.destination)
    } catch (e) { audioCtx = null; masterGain = null }
  }
  if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume().catch(() => {}) }
}

export function cycleVolume() {
  ensureAudio()
  audioUI.stepIdx = (audioUI.stepIdx + 1) % VOLUME_STEPS.length
  if (masterGain && audioCtx) masterGain.gain.setValueAtTime(audioUI.volume, audioCtx.currentTime)
  saveAudioPrefs()
}

function beep(freq, dur, type, vol) {
  if (audioUI.volume <= 0 || !audioCtx || !masterGain) return
  const t0 = audioCtx.currentTime
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type || 'square'
  osc.frequency.setValueAtTime(freq, t0)
  const peak = (vol || 0.06)
  const attack = Math.min(0.012, dur * 0.3)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(peak, t0 + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(masterGain)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export function sfxClick() { beep(520 + Math.random() * 40, 0.055, 'square', 0.05) }
export function sfxCrit() {
  beep(660, 0.05, 'square', 0.07)
  setTimeout(() => beep(880, 0.05, 'square', 0.07), 40)
  setTimeout(() => beep(1180, 0.09, 'triangle', 0.08), 80)
  setTimeout(() => beep(1760, 0.08, 'sine', 0.05), 130)
}
export function sfxPlace() { beep(420, 0.05, 'square', 0.05); setTimeout(() => beep(560, 0.05, 'square', 0.045), 35) }
export function sfxRemove() { beep(340, 0.06, 'triangle', 0.045) }
export function sfxBuy() { beep(300, 0.05, 'square', 0.06); setTimeout(() => beep(500, 0.08, 'square', 0.06), 50) }
export function sfxSkillUpgrade(tier = 1) {
  const lift = Math.max(0, Math.min(5, tier)) * 42
  beep(260 + lift, 0.055, 'square', 0.065)
  setTimeout(() => beep(390 + lift, 0.07, 'square', 0.07), 45)
  setTimeout(() => beep(620 + lift, 0.09, 'triangle', 0.075), 105)
  setTimeout(() => beep(880 + lift, 0.12, 'sine', 0.05), 180)
}
export function sfxCookStart() { beep(220, 0.08, 'triangle', 0.05); setTimeout(() => beep(360, 0.12, 'triangle', 0.055), 70) }
export function sfxCookDone() { beep(520, 0.06, 'square', 0.06); setTimeout(() => beep(780, 0.12, 'triangle', 0.07), 80) }
export function sfxTier(tierIdx) {
  const base = 260
  beep(base, 0.06, 'square', 0.06)
  setTimeout(() => beep(base + 110, 0.06, 'square', 0.06), 70)
  setTimeout(() => beep(base + 220 + tierIdx * 70, 0.14, 'square', 0.08), 150)
  if (tierIdx >= 3) setTimeout(() => beep(base + 400 + tierIdx * 80, 0.2, 'triangle', 0.08), 300)
}
export function sfxAchievement() { beep(660, 0.09, 'triangle', 0.07); setTimeout(() => beep(880, 0.14, 'triangle', 0.08), 90) }
export function sfxGolden() { beep(880, 0.05, 'square', 0.07); setTimeout(() => beep(1046, 0.1, 'square', 0.08), 60) }
export function sfxError() { beep(180, 0.1, 'sawtooth', 0.05) }

export function haptic(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern) } catch (e) { /* ignore */ } }
}

const reducedMotionMQ = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
export function scrollBehavior() { return reducedMotionMQ && reducedMotionMQ.matches ? 'auto' : 'smooth' }

