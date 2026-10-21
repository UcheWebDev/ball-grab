import { ref, watch } from 'vue'
import { G, D, busy } from './store'
import { AV, BOX, TUBES, slotGeom, BALL_R } from '../lib/geometry'
import { playSound, haptic } from '../lib/sound'

// Everything the Scene draws on top of the displayed state D
export const active = ref(null)     // {team,x,y,closed}: the reaching hand
export const held = ref(null)       // colour of the ball in the hand
export const heldSlot = ref(-1)     // slot the held ball came from (drawn empty)
export const falling = ref(null)    // {x,y,c}: ball dropping into a tube
export const boxOff = ref({ x: 0, y: 0 })
export const statusMsg = ref('')
export const talking = ref({ R: 0, Y: 0 })   // voice level 0..3 per team: drives the talking animation
export const emotes = ref({ R: null, Y: null })   // 'dance' | 'cry' | 'head' | 'laugh' | null per team

let gen = 0, q = [], running = false, lastSeq = -1, prevEv = null
const sleep = ms => new Promise(r => setTimeout(r, ms))
const ease = p => (p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p)
const setD = g => { D.value = g; statusMsg.value = g.msg }
const setEmote = (t, e) => { emotes.value = { ...emotes.value, [t]: e } }
const flashEmote = (t, e, ms, g) => { setEmote(t, e); setTimeout(() => { if (g === gen && emotes.value[t] === e) setEmote(t, null) }, ms) }
const resetVisuals = () => { emotes.value = { R: null, Y: null }; active.value = null; held.value = null; heldSlot.value = -1; falling.value = null; boxOff.value = { x: 0, y: 0 } }

function tween(ms, fn, g) {
  return new Promise(res => {
    const t0 = performance.now()
    const step = now => {
      if (g !== gen) return res()
      const p = Math.min((now - t0) / ms, 1); fn(p)
      p < 1 ? requestAnimationFrame(step) : res()
    }
    requestAnimationFrame(step)
  })
}
function moveHand(team, to, ms, g, closed) {
  const { x: sx, y: sy } = active.value
  return tween(ms, p => { const e = ease(p); active.value = { team, closed, x: sx + (to.x - sx) * e, y: sy + (to.y - sy) * e } }, g)
}

// One move = one choreographed animation, played identically on every client.
async function playMove(next, g) {
  const ev = next.last
  if (ev && ev.t === 'pull') {
    const { team, i, c, ok } = ev, rest = AV[team].rest, sl = slotGeom(i), tube = TUBES[team]
    active.value = { team, closed: false, x: rest.x, y: rest.y }
    await moveHand(team, { x: sl.cx, y: sl.cy }, 500, g, false); if (g !== gen) return       // reach in
    playSound('grab'); haptic([30]); heldSlot.value = i; held.value = c
    active.value = { ...active.value, closed: true }
    await sleep(300); if (g !== gen) return                                                   // grab
    await moveHand(team, { x: active.value.x, y: BOX.y - 35 }, 450, g, true); if (g !== gen) return   // lift out
    statusMsg.value = next.msg
    if (ok) {
      // the player who just shook the box to hide the ball sees the opponent grab their colour anyway
      if (prevEv && prevEv.t === 'shake' && prevEv.team !== team) {
        flashEmote(prevEv.team, 'head', 2600, g)      // the shaker shouts: "how did you find it?!"
        flashEmote(team, 'laugh', 2600, g)             // ...and the one who found it anyway laughs
        setTimeout(() => { if (g === gen) { playSound('shout'); playSound('laugh') } }, 350)
      }
      playSound('match'); haptic([40, 50, 40])
      await moveHand(team, { x: tube.x + tube.w / 2, y: active.value.y }, 500, g, true); if (g !== gen) return
      held.value = null
      const target = tube.y + tube.h - BALL_R - 6 - D.value.score[team] * (BALL_R * 2 + 3)
      falling.value = { x: tube.x + tube.w / 2, y: tube.y + 10, c }
      let vy = 0, last = performance.now()
      await new Promise(res => {                                                              // drop with gravity
        const step = now => {
          if (g !== gen) return res()
          const dt = Math.min((now - last) / 1000, 0.05); last = now; vy += 1800 * dt
          const y = falling.value.y + vy * dt
          if (y >= target) return res()
          falling.value = { ...falling.value, y }; requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      })
      if (g !== gen) return
      falling.value = null; heldSlot.value = -1; setD(next); playSound('drop'); haptic([20])
      await sleep(200); if (g !== gen) return
      await moveHand(team, rest, 350, g, false)
    } else {
      playSound('fail'); haptic([80])
      if (prevEv && prevEv.t === 'shake' && prevEv.team !== team) {       // the shake worked: the shaker laughs at the wrong guess
        flashEmote(prevEv.team, 'laugh', 2600, g)
        setTimeout(() => { if (g === gen) playSound('laugh') }, 150)
      }
      await sleep(400); if (g !== gen) return
      await moveHand(team, { x: sl.cx, y: sl.cy }, 500, g, true); if (g !== gen) return     // put it back, face up
      held.value = null; heldSlot.value = -1; setD(next); playSound('drop')
      await moveHand(team, rest, 350, g, false)
    }
    if (g === gen) active.value = null
  } else if (ev && ev.t === 'shake') {
    playSound('shuffle'); haptic([30, 30, 30, 30])
    await tween(650, p => { const k = 9 * (1 - p); boxOff.value = { x: (Math.random() - 0.5) * k * 2, y: (Math.random() - 0.5) * k * 2 } }, g)
    boxOff.value = { x: 0, y: 0 }
  }
}

async function play(next, g) {
  await playMove(next, g)
  if (g === gen) prevEv = next.last
}

async function pump() {
  if (running) return
  running = true; busy.value = true
  const g = gen
  while (q.length && g === gen) {
    const n = q.shift()
    await play(n, g)
    if (g === gen) setD(n)
  }
  if (g === gen) { running = false; busy.value = false }
}

watch(G, g => {
  const hardReset = () => { prevEv = null; gen++; q = []; running = false; busy.value = false; resetVisuals() }
  if (!g) { hardReset(); D.value = null; lastSeq = -1; return }
  if (!D.value || (g.seq === 0 && lastSeq > 0)) { hardReset(); setD(g); lastSeq = g.seq; return }   // first state or rematch
  if (g.seq === lastSeq) return                                                                     // host re-sent the same state
  lastSeq = g.seq; q.push(g); pump()
})


// Winner dances, loser cries (once the last animation has finished)
watch([() => D.value?.winner, busy], ([w, b], old) => {
  if (w && !b) emotes.value = { R: w === 'R' ? 'dance' : 'cry', Y: w === 'Y' ? 'dance' : 'cry' }
  else if (!w && old?.[0]) emotes.value = { R: null, Y: null }   // new game: clear (flash emotes time themselves out)
})