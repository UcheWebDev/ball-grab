import { ref } from 'vue'
export const soundOn = ref(true)
export const toggleSound = () => (soundOn.value = !soundOn.value)
let ctx = null

function tone(type, f0, f1, at, dur, vol) {
  const t = ctx.currentTime + at, osc = ctx.createOscillator(), gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination); osc.type = type
  osc.frequency.setValueAtTime(f0, t)
  if (f1) osc.frequency.exponentialRampToValueAtTime(f1, t + dur)
  gain.gain.setValueAtTime(vol, t); gain.gain.linearRampToValueAtTime(0, t + dur)
  osc.start(t); osc.stop(t + dur)
}

export function playSound(type) {
  if (!soundOn.value) return
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    if (type === 'tap') tone('sine', 320, 120, 0, 0.08, 0.15)
    else if (type === 'grab') tone('triangle', 250, 450, 0, 0.12, 0.2)
    else if (type === 'drop') tone('sine', 500, 140, 0, 0.18, 0.25)
    else if (type === 'fail') tone('sawtooth', 220, 110, 0, 0.25, 0.15)
    else if (type === 'shuffle') for (let i = 0; i < 6; i++) tone('sawtooth', 80 + Math.random() * 60, 0, i * 0.06, 0.08, 0.12)
    else if (type === 'match') [523.25, 659.25, 783.99].forEach((f, i) => tone('sine', f, 0, i * 0.08, 0.2, 0.18))
    else if (type === 'shout') tone('sawtooth', 420, 150, 0, 0.45, 0.13)
    else if (type === 'laugh') for (let i = 0; i < 4; i++) tone('triangle', 560 - i * 45, 330 - i * 30, 0.5 + i * 0.15, 0.1, 0.17)
    else if (type === 'win') [400, 520, 650, 800, 1040].forEach((f, i) => tone('triangle', f, 0, i * 0.1, 0.25, 0.2))
  } catch {}
}
export const haptic = (p = [15]) => { try { navigator.vibrate && navigator.vibrate(p) } catch {} }