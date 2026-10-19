import { reactive } from 'vue'
import { notify } from './useToast'

const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
const METERED_APP = import.meta.env.VITE_METERED_APP   // e.g. 'cantaball-game' -> https://cantaball-game.metered.live
const METERED_KEY = import.meta.env.VITE_METERED_KEY
const FORCE_RELAY = import.meta.env.VITE_FORCE_RELAY === 'true'   // set true to test: forces ALL audio through TURN

// Optional static TURN fallback (used only if Metered isn't configured or fails)
const staticIce = [...STUN]
if (import.meta.env.VITE_TURN_URL) {
  staticIce.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USER,
    credential: import.meta.env.VITE_TURN_PASS,
  })
}

// Shared across calls so credentials are fetched once per page load
let meteredServers = null
let meteredLoading = null

async function loadTurn() {
  if (meteredServers || !METERED_APP || !METERED_KEY) return
  if (!meteredLoading) {
    meteredLoading = (async () => {
      const r = await fetch(`https://${METERED_APP}.metered.live/api/v1/turn/credentials?apiKey=${METERED_KEY}`)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      meteredServers = await r.json()   // array of { urls, username, credential }
    })().finally(() => { meteredLoading = null })
  }
  await meteredLoading
}

function getIceConfig() {
  const cfg = { iceServers: meteredServers ? [...STUN, ...meteredServers] : staticIce }
  if (FORCE_RELAY) cfg.iceTransportPolicy = 'relay'
  return cfg
}

// WebRTC audio. Signalling goes through the room channel (send / onSignal). Red makes the offer, Yellow answers.
export function createVoice({ send, uid, getMe, getOppName }) {
  const V = reactive({ on: false, muted: false, status: '' })
  let stream = null, pc = null, queue = [], lastOffer = 0
  const audio = document.createElement('audio')
  audio.autoplay = true; audio.playsInline = true
  const sig = p => send('sig', { ...p, from: uid() })

  function makePc() {
    if (pc) try { pc.close() } catch {}
    queue = []
    const p = (pc = new RTCPeerConnection(getIceConfig()))
    stream.getTracks().forEach(t => p.addTrack(t, stream))
    p.onicecandidate = e => e.candidate && sig({ t: 'ice', c: e.candidate })
    p.ontrack = e => { audio.srcObject = e.streams[0]; audio.play().catch(() => {}) }
    p.onconnectionstatechange = () => {
      if (p !== pc) return
      const s = p.connectionState
      V.status = s === 'connected' ? `Talking with ${getOppName()}` : s === 'failed' ? 'Voice blocked by network (TURN relay failed)' : 'Connecting…'
    }
    return p
  }
  const flush = () => queue.splice(0).forEach(c => pc.addIceCandidate(c).catch(() => {}))

  async function onSignal(m) {
    if (!V.on || !m || m.from === uid()) return
    try {
      if (m.t === 'hello') {
        if (!m.reply) sig({ t: 'hello', reply: 1 })
        if (getMe() === 'R' && Date.now() - lastOffer > 4000 && !(pc && pc.connectionState === 'connected')) {
          lastOffer = Date.now()
          const p = makePc(); await p.setLocalDescription(await p.createOffer()); sig({ t: 'offer', sdp: p.localDescription })
        }
      } else if (m.t === 'offer' && getMe() === 'Y') {
        const p = makePc(); await p.setRemoteDescription(m.sdp); flush()
        await p.setLocalDescription(await p.createAnswer()); sig({ t: 'answer', sdp: p.localDescription })
      } else if (m.t === 'answer' && getMe() === 'R' && pc?.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(m.sdp); flush()
      } else if (m.t === 'ice') {
        if (pc?.remoteDescription) await pc.addIceCandidate(m.c).catch(() => {}); else queue.push(m.c)
      } else if (m.t === 'bye') V.status = `${getOppName()} left voice`
    } catch (e) { console.warn('voice', e) }
  }

  async function start() {
    if (V.on) return
    if (!navigator.mediaDevices?.getUserMedia) return notify('Voice needs HTTPS and a modern browser')

    // Get relay credentials BEFORE any peer connection is created
    try { await loadTurn() }
    catch (e) {
      console.warn('TURN credentials failed', e)
      notify('Voice relay unavailable. Check VITE_METERED_APP / VITE_METERED_KEY.')
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    } catch { return notify('Microphone blocked. Allow it in your browser settings.') }
    V.on = true; V.muted = false; lastOffer = 0
    makePc(); V.status = `Waiting for ${getOppName()} to turn voice on…`; sig({ t: 'hello' })
  }
  function stop() {
    if (!V.on) return
    sig({ t: 'bye' }); V.on = false
    try { pc?.close() } catch {}
    stream?.getTracks().forEach(t => t.stop())
    pc = stream = null; queue = []; audio.srcObject = null; V.status = ''
  }
  function toggleMute() {
    if (!stream) return
    V.muted = !V.muted
    stream.getAudioTracks().forEach(t => (t.enabled = !V.muted))
  }
  return { V, start, stop, toggleMute, onSignal }
}