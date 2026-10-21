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

// ---- connection health (broadcast between both players) ----
// q: 'good' | 'ok' | 'poor' | 'offline' | 'unknown'.  link: this device's own connection to the room.
// oppStatus: 'waiting' | 'here' | 'unstable' | 'away' | 'gone' | 'left'
export const net = ref({ link: 'connecting', meQ: 'unknown', meRtt: null, oppQ: 'unknown', oppRtt: null, oppStatus: 'waiting', oppBeat: 0, awaySince: 0 })
export const resumable = ref(null)      // an unfinished online match this device can rejoin

let S = null                               // authoritative state: lives on the host (or locally vs CPU)
let wins = { R: 0, Y: 0 }, scored = false, oppUid = null   // session tally: lives on the host, cleared on leave
const fresh = () => { S = newGame(); scored = false }
let ch = null, qch = null, cpuTimer = null, oppSeen = false
let curRoom = null, curRole = null, sessActive = false

// ---- session persistence: lets a player come back after a refresh, crash or accidental leave ----
const SKEY = 'bgb-session', TTL = 20 * 60 * 1000
function saveSession() {
  if (mode.value !== 'online' || !curRoom || !user.value) return
  try {
    localStorage.setItem(SKEY, JSON.stringify({
      uid: uid(), room: curRoom, role: curRole, ts: Date.now(), active: sessActive,
      wins, scored, oppUid, opp: opp.value, S: curRole === 'host' ? S : null, G: G.value,
    }))
  } catch { /* storage full / blocked: rejoin just won't be available */ }
}
function readSession() {
  try {
    const r = JSON.parse(localStorage.getItem(SKEY) || 'null')
    if (!r || !user.value || r.uid !== user.value.id) return null
    if (Date.now() - r.ts > TTL || !(r.role === 'host' ? r.S : r.G)) return null
    return r
  } catch { return null }
}
export function clearSession() { try { localStorage.removeItem(SKEY) } catch {} resumable.value = null }
export const discardSession = clearSession
export function refreshResumable() {
  if (mode.value === 'online' && G.value) { resumable.value = null; return }
  const r = readSession()
  if (!r) { resumable.value = null; return }
  const st = r.S || r.G, mine = r.role === 'host' ? 'R' : 'Y'
  resumable.value = {
    oppName: r.opp?.name || 'your opponent', mine: st.score[mine], theirs: st.score[mine === 'R' ? 'Y' : 'R'],
    minsLeft: Math.max(1, Math.round((TTL - (Date.now() - r.ts)) / 60000)),
  }
}

const uid = () => user.value.id
const isAuthority = () => mode.value === 'cpu' || me.value === 'R'
const send = (event, payload) => ch && ch.send({ type: 'broadcast', event, payload })

export const voice = createVoice({ send, uid, getMe: () => me.value, getOppName: () => opp.value.name })

export const playerInfo = t => (t === me.value ? { name: displayName.value, avatar: avatar.value, shirt: shirt.value, pants: pants.value } : opp.value)

function sync() {
  if (S.winner && !scored) { wins[S.winner]++; scored = true }
  G.value = { ...publicState(S), wins: { ...wins } }
  if (mode.value === 'online') { send('state', G.value); saveSession() }
  else cpuMaybe()
}
function run(team, a, i) { if (applyAction(S, team, a, i)) sync() }

// ---- player actions ----
function canSend() {
  if (mode.value !== 'online') return true
  const n = net.value
  if (n.link !== 'online') { notify(n.link === 'offline' ? "You're offline. Moves resume when you reconnect." : 'Reconnecting… try again in a moment'); return false }
  if (me.value === 'Y' && ['away', 'gone', 'left'].includes(n.oppStatus)) { notify(`${opp.value.name} is away. Waiting for them to return`); return false }
  return true
}
export function act(a, i) { if (!canSend()) return; isAuthority() ? run(me.value, a, i) : send('act', { a, i }) }
export function tap(i) { if (myTurn.value && D.value.phase === 'pick' && D.value.slots[i]) act('pull', i) }
export function rematch() { if (!canSend()) return; if (isAuthority()) { fresh(); sync() } else send('act', { a: 'rematch' }) }

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
function openRoom(id, role, resume = false) {
  closeRoom(); mode.value = 'online'; me.value = role === 'host' ? 'R' : 'Y'
  curRoom = id; curRole = role
  if (!resume) {
    oppSeen = false; oppUid = null; sessActive = true; resetNet()
  } else {
    oppSeen = true; net.value.link = 'connecting'; linkSince = Date.now()
  }
  startNet()
  const c = (ch = sb.channel('bgb-room-' + id, { config: { broadcast: { self: false, ack: true }, presence: { key: uid() } } }))
  c.on('broadcast', { event: 'state' }, ({ payload }) => { if (role === 'guest') { G.value = payload; saveSession() } })
    .on('broadcast', { event: 'act' }, ({ payload }) => {
      if (role !== 'host' || !S) return
      if (payload.a === 'rematch') { fresh(); sync() } else run('Y', payload.a, payload.i)
    })
    .on('broadcast', { event: 'need' }, () => { if (role === 'host' && S) sync() })      // a (re)connecting guest asks for the latest state
    .on('broadcast', { event: 'net' }, ({ payload }) => {
      if (!payload || payload.uid === uid()) return
      const n = net.value
      n.oppQ = payload.q || 'unknown'; n.oppRtt = payload.rtt ?? null; n.oppBeat = Date.now()
      if (n.oppStatus !== 'here') markHere()
    })
    .on('broadcast', { event: 'bye' }, () => {
      net.value.oppStatus = 'left'; notify(`${opp.value.name} left the match. They can rejoin.`)
    })
    .on('broadcast', { event: 'sig' }, ({ payload }) => voice.onSignal(payload))
    .on('presence', { event: 'sync' }, () => {
      const o = Object.values(ch.presenceState()).flat().find(m => m.uid !== uid())
      const n = net.value
      if (o) {
        if (oppUid && oppUid !== o.uid) wins = { R: 0, Y: 0 }   // a different player joined: new tally
        oppUid = o.uid; oppSeen = true; opp.value = { name: o.name, avatar: o.avatar, shirt: o.shirt, pants: o.pants }
        markHere()
        if (role === 'host') { if (!S) fresh(); sync() }   // also re-sends state when someone reconnects
      } else if (oppSeen && G.value && n.link === 'online' && ['here', 'unstable', 'waiting'].includes(n.oppStatus)) {
        n.oppStatus = 'away'; n.awaySince = Date.now()
        notify(`${opp.value.name} lost connection. Waiting for them…`)
      }
    })
    .subscribe(async st => {
      if (c !== ch) return                       // callback from a channel we already replaced
      if (st === 'SUBSCRIBED') {
        setLink('online')
        await c.track({ uid: uid(), name: displayName.value, avatar: avatar.value, shirt: shirt.value, pants: pants.value, role })
        if (role === 'guest') send('need', {})
        beat()
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setLink(navigator.onLine ? 'connecting' : 'offline')
    })
  saveSession()
}
function closeRoom() { if (ch) { const c = ch; ch = null; sb.removeChannel(c) } }
function rebuild() { if (mode.value === 'online' && curRoom) { lastRebuild = Date.now(); openRoom(curRoom, curRole, true) } }

// ---- connection monitor: heartbeat + signal strength + auto-reconnect ----
let netTimer = null, tickN = 0, linkSince = Date.now(), lastRebuild = 0, everOnline = false, fails = 0, beating = false
const ORDER = ['good', 'ok', 'poor']
const qOf = rtt => (rtt < 200 ? 'good' : rtt < 500 ? 'ok' : 'poor')
const worse = (a, b) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b)
function hintQ() {                                   // browser's own estimate of the network type
  const c = navigator.connection
  if (!c) return 'good'
  if (['slow-2g', '2g'].includes(c.effectiveType) || (c.downlink && c.downlink < 0.3)) return 'poor'
  return c.effectiveType === '3g' ? 'ok' : 'good'
}
function resetNet() { net.value = { link: 'connecting', meQ: 'unknown', meRtt: null, oppQ: 'unknown', oppRtt: null, oppStatus: 'waiting', oppBeat: 0, awaySince: 0 }; everOnline = false; fails = 0; linkSince = Date.now() }
function setLink(l) {
  const n = net.value
  if (n.link === l) return
  const prev = n.link
  n.link = l; linkSince = Date.now()
  if (l === 'online') { if (everOnline && prev !== 'online') notify('Back online'); everOnline = true; fails = 0 }
  if (l === 'offline') { n.meQ = 'offline'; n.meRtt = null; notify("You're offline. We'll reconnect when you're back.") }
}
function markHere() {
  const n = net.value, was = n.oppStatus
  if (was === 'here') return
  n.oppStatus = 'here'; n.oppBeat = Date.now()
  if (['away', 'gone', 'left'].includes(was)) notify(`${opp.value.name} is back`)
}
async function beat() {
  if (!ch || beating || mode.value !== 'online') return
  const n = net.value
  if (!navigator.onLine) { setLink('offline'); return }
  if (ch.state !== 'joined') return
  beating = true
  const t0 = performance.now()
  let ok = false
  try { ok = (await ch.send({ type: 'broadcast', event: 'net', payload: { uid: uid(), q: n.meQ, rtt: n.meRtt } }, { timeout: 4000 })) === 'ok' } catch { ok = false }
  beating = false
  if (ok) {
    const rtt = Math.round(performance.now() - t0)
    n.meRtt = rtt; n.meQ = worse(qOf(rtt), hintQ()); fails = 0; setLink('online')
  } else if (++fails >= 2) { n.meQ = 'offline'; n.meRtt = null; setLink(navigator.onLine ? 'connecting' : 'offline') }
}
function netTick() {
  if (mode.value !== 'online' || !curRoom) return
  const n = net.value, now = Date.now(); tickN++
  if (!navigator.onLine) setLink('offline')
  else if ((!ch || ch.state !== 'joined') && n.link === 'online') setLink('connecting')
  if (n.link !== 'online' && navigator.onLine && now - linkSince > 12000 && now - lastRebuild > 12000) rebuild()   // stuck: rebuild the channel
  if (n.link === 'online') {
    if (n.oppStatus === 'here' && n.oppBeat && now - n.oppBeat > 12000) n.oppStatus = 'unstable'
  }
  if (n.oppStatus === 'away' && now - n.awaySince > 60000) n.oppStatus = 'gone'
  if (tickN % 2 === 0) beat()
  if (tickN % 15 === 0) saveSession()                // keep the rejoin window fresh while connected
}
function startNet() { if (!netTimer) netTimer = setInterval(netTick, 2000) }
function stopNet() { clearInterval(netTimer); netTimer = null }
function ensureConnected() { if (mode.value === 'online' && curRoom && navigator.onLine && (!ch || ch.state !== 'joined')) rebuild() }
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { if (mode.value === 'online') { setLink('connecting'); ensureConnected() } })
  window.addEventListener('offline', () => { if (mode.value === 'online') setLink('offline') })
  window.addEventListener('pagehide', saveSession)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { ensureConnected(); beat() } else saveSession() })
}

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
  setTimeout(() => { if (!G.value && ch) { closeRoom(); clearSession(); lobbyMsg.value = 'Room not found or host is not online.' } }, 6000)
}

export function leave() {
  voice.stop(); closeRoom(); cancelSearch(); clearTimeout(cpuTimer); stopNet()
  S = null; wins = { R: 0, Y: 0 }; scored = false; oppUid = null; curRoom = null; curRole = null
  G.value = null; roomCode.value = ''; lobbyMsg.value = ''
}

// Leaving on purpose. An unfinished online match stays rejoinable; a finished one is cleared.
export async function leaveMatch() {
  if (mode.value === 'online' && curRoom) {
    if (!G.value || G.value.winner) clearSession()
    else { sessActive = false; saveSession() }
    try { await Promise.race([send('bye', { uid: uid() }), new Promise(r => setTimeout(r, 400))]) } catch {}
  }
  leave(); refreshResumable()
}
export function cancelRoom() { clearSession(); leave() }

// Come back to a saved match (after refresh, signal loss, or leaving by accident)
export function resumeMatch() {
  const r = readSession()
  if (!r) { clearSession(); notify('That match is no longer available'); return false }
  leave()
  mode.value = 'online'; me.value = r.role === 'host' ? 'R' : 'Y'; opp.value = r.opp || { name: 'Opponent', avatar: 'cpu' }
  wins = r.wins || { R: 0, Y: 0 }; scored = !!r.scored; oppUid = r.oppUid || null
  curRoom = r.room; curRole = r.role; sessActive = true
  if (r.role === 'host') { S = r.S; sync() } else G.value = r.G
  resumable.value = null
  openRoom(r.room, r.role, true)
  notify('Rejoining your match…')
  return true
}
export function tryAutoResume() {
  const r = readSession()
  if (r && r.active && !G.value) resumeMatch()   // the page was refreshed / crashed mid-match
  else refreshResumable()
}