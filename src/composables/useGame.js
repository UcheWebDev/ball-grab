import { ref } from 'vue'
import { supabase as sb } from '../lib/supabase'
import { newGame, publicState, applyAction, cpuChoose, animMs } from '../lib/engine'
import { G, D, mode, me, opp, busy, myTurn } from './store'
import { user, avatar, shirt, pants, displayName } from './useAuth'
import { notify } from './useToast'
import { createVoice } from './useVoice'

// ---- shared reactive state (singleton) ----
export { G, D, mode, me, opp, busy, myTurn }
export const searching = ref(false)
export const roomCode = ref('')
export const lobbyMsg = ref('')

let S = null                               // authoritative state: lives on the host (or locally vs CPU)
let wins = { R: 0, Y: 0 }, scored = false, oppUid = null   // session tally: lives on the host, cleared on leave
const fresh = () => { S = newGame(); scored = false }
let ch = null, qch = null, cpuTimer = null, oppSeen = false

const uid = () => user.value.id
const isAuthority = () => mode.value === 'cpu' || me.value === 'R'
const send = (event, payload) => ch && ch.send({ type: 'broadcast', event, payload })

export const voice = createVoice({ send, uid, getMe: () => me.value, getOppName: () => opp.value.name })

export const playerInfo = t => (t === me.value ? { name: displayName.value, avatar: avatar.value, shirt: shirt.value, pants: pants.value } : opp.value)

function sync() {
  if (S.winner && !scored) { wins[S.winner]++; scored = true }
  G.value = { ...publicState(S), wins: { ...wins } }
  if (mode.value === 'online') send('state', G.value)
  else cpuMaybe()
}
function run(team, a, i) { if (applyAction(S, team, a, i)) sync() }

// ---- player actions ----
export function act(a, i) { isAuthority() ? run(me.value, a, i) : send('act', { a, i }) }
export function tap(i) { if (myTurn.value && D.value.phase === 'pick' && D.value.slots[i]) act('pull', i) }
export function rematch() { if (isAuthority()) { fresh(); sync() } else send('act', { a: 'rematch' }) }

// ---- vs CPU ----
function cpuMaybe() {
  clearTimeout(cpuTimer)
  if (!S || S.winner || S.turn !== 'Y') return
  cpuTimer = setTimeout(() => {
    if (!S || mode.value !== 'cpu' || S.winner || S.turn !== 'Y') return
    const m = cpuChoose(S); run('Y', m.a, m.i)
  }, 900 + animMs(S.last))
}
export function startCpu() {
  leave(); mode.value = 'cpu'; me.value = 'R'; opp.value = { name: 'CPU', avatar: 'cpu' }
  fresh(); sync()
}

// ---- realtime rooms: Supabase broadcast + presence (no tables needed) ----
function openRoom(id, role) {
  closeRoom(); mode.value = 'online'; me.value = role === 'host' ? 'R' : 'Y'; oppSeen = false; oppUid = null
  ch = sb.channel('bgb-room-' + id, { config: { broadcast: { self: false }, presence: { key: uid() } } })
  ch.on('broadcast', { event: 'state' }, ({ payload }) => { if (role === 'guest') G.value = payload })
    .on('broadcast', { event: 'act' }, ({ payload }) => {
      if (role !== 'host' || !S) return
      if (payload.a === 'rematch') { fresh(); sync() } else run('Y', payload.a, payload.i)
    })
    .on('broadcast', { event: 'sig' }, ({ payload }) => voice.onSignal(payload))
    .on('presence', { event: 'sync' }, () => {
      const o = Object.values(ch.presenceState()).flat().find(m => m.uid !== uid())
      if (o) {
        if (oppUid && oppUid !== o.uid) wins = { R: 0, Y: 0 }   // a different player joined: new tally
        oppUid = o.uid; oppSeen = true; opp.value = { name: o.name, avatar: o.avatar, shirt: o.shirt, pants: o.pants }
        if (role === 'host') { if (!S) fresh(); sync() }   // also re-sends state when someone reconnects
      } else if (oppSeen && G.value) { notify('Opponent left the match'); oppSeen = false }
    })
    .subscribe(async st => { if (st === 'SUBSCRIBED') await ch.track({ uid: uid(), name: displayName.value, avatar: avatar.value, shirt: shirt.value, pants: pants.value, role }) })
}
function closeRoom() { if (ch) { sb.removeChannel(ch); ch = null } }

export function quickMatch() {
  searching.value = true; lobbyMsg.value = 'Searching for an opponent…'
  let matched = false
  qch = sb.channel('bgb-queue', { config: { presence: { key: uid() } } })
  qch.on('presence', { event: 'sync' }, () => {
    if (matched) return
    const w = Object.values(qch.presenceState()).flat().filter(m => m.st === 'wait')
      .sort((a, b) => a.t - b.t || a.uid.localeCompare(b.uid))
    const idx = w.findIndex(m => m.uid === uid())
    if (w.length >= 2 && idx >= 0 && idx < 2) {     // oldest two waiting players pair up; the older one hosts
      matched = true
      const id = 'q' + w[0].uid.slice(0, 8) + w[1].uid.slice(0, 8)
      cancelSearch(); lobbyMsg.value = 'Opponent found…'; openRoom(id, idx === 0 ? 'host' : 'guest')
    }
  }).subscribe(async st => { if (st === 'SUBSCRIBED') await qch.track({ uid: uid(), t: Date.now(), st: 'wait' }) })
  setTimeout(() => {
    if (searching.value && !matched) { cancelSearch(); lobbyMsg.value = 'No opponent right now. Try again or practice vs CPU.' }
  }, 90000)
}
export function cancelSearch() {
  searching.value = false
  if (qch) { sb.removeChannel(qch); qch = null }
  if (!ch) lobbyMsg.value = ''
}

export function createRoom() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) code += c[(Math.random() * c.length) | 0]
  roomCode.value = code; lobbyMsg.value = 'Share this code. Waiting for a friend…'
  openRoom(code, 'host')
}
export function joinRoom(raw) {
  const code = raw.trim().toUpperCase()
  if (code.length !== 5) { lobbyMsg.value = 'Enter the 5-character code.'; return }
  lobbyMsg.value = 'Joining…'; openRoom(code, 'guest')
  setTimeout(() => { if (!G.value && ch) { closeRoom(); lobbyMsg.value = 'Room not found or host is not online.' } }, 6000)
}

export function leave() {
  voice.stop(); closeRoom(); cancelSearch(); clearTimeout(cpuTimer)
  S = null; wins = { R: 0, Y: 0 }; scored = false; oppUid = null
  G.value = null; roomCode.value = ''; lobbyMsg.value = ''
}