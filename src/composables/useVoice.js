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
  const cfg = { iceServers: meteredServers ? [...STUN, ...meteredServers] : staticIce, bundlePolicy: 'max-bundle', iceCandidatePoolSize: 2 }
  if (FORCE_RELAY) cfg.iceTransportPolicy = 'relay'
  return cfg
}

// Low-latency speech tuning for Opus: small frames, in-band error correction, modest bitrate, mono
function tuneOpus(sdp) {
  try {
    const m = sdp.match(/a=rtpmap:(\d+) opus\/48000[^\r\n]*/i)
    if (!m) return sdp
    const pt = m[1], want = { minptime: '10', useinbandfec: '1', usedtx: '0', maxaveragebitrate: '32000', stereo: '0', 'sprop-stereo': '0' }
    const re = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`)
    if (re.test(sdp)) {
      return sdp.replace(re, (_, cur) => {
        const kv = Object.fromEntries(cur.split(';').filter(Boolean).map(s => s.split('=')))
        return `a=fmtp:${pt} ` + Object.entries({ ...kv, ...want }).map(([k, x]) => `${k}=${x}`).join(';')
      })
    }
    return sdp.replace(m[0], `${m[0]}\r\na=fmtp:${pt} ${Object.entries(want).map(([k, x]) => `${k}=${x}`).join(';')}`)
  } catch { return sdp }
}
const tuned = d => ({ type: d.type, sdp: tuneOpus(d.sdp) })

// Speech level 0..3 from an audio stream (drives the talking animation)
const LEVELS = [0.02, 0.06, 0.12]
const levelOf = rms => (rms < LEVELS[0] ? 0 : rms < LEVELS[1] ? 1 : rms < LEVELS[2] ? 2 : 3)

// WebRTC audio. Signalling goes through the room channel (send / onSignal). Red makes the offer, Yellow answers.
export function createVoice({ send, uid, getMe, getOppName }) {
  const V = reactive({ on: false, muted: false, status: '', lvlMe: 0, lvlOpp: 0 })   // lvl*: 0 silent … 3 loud
  let stream = null, pc = null, queue = [], lastOffer = 0
  let ac = null, meA = null, oppA = null, meter = null
  const audio = document.createElement('audio')
  audio.autoplay = true; audio.playsInline = true
  const sig = p => send('sig', { ...p, from: uid() })

  function makePc() {
    if (pc) try { pc.close() } catch {}
    queue = []
    const p = (pc = new RTCPeerConnection(getIceConfig()))
    stream.getTracks().forEach(t => p.addTrack(t, stream))
    p.onicecandidate = e => e.candidate && sig({ t: 'ice', c: e.candidate })
    p.ontrack = e => {
      audio.srcObject = e.streams[0]; audio.play().catch(() => {})
      try { e.receiver.jitterBufferTarget = 50 } catch {}      // keep the playout buffer small (Chromium)
      try { e.receiver.playoutDelayHint = 0.05 } catch {}
      oppA = analyser(e.streams[0], oppA)
    }
    p.onconnectionstatechange = () => {
      if (p !== pc) return
      const s = p.connectionState
      if (s === 'connected') tuneSender(p)
      V.status = s === 'connected' ? `Talking with ${getOppName()}` : s === 'failed' ? 'Voice blocked by network (TURN relay failed)' : 'Connecting…'
    }
    return p
  }
  function tuneSender(p) {
    p.getSenders().forEach(s => {
      if (s.track?.kind !== 'audio') return
      try {
        const prm = s.getParameters(); if (!prm.encodings?.length) prm.encodings = [{}]
        Object.assign(prm.encodings[0], { maxBitrate: 32000, priority: 'high', networkPriority: 'high' })
        s.setParameters(prm).catch(() => {})
      } catch {}
    })
  }
  function analyser(ms, old) {
    if (!ac) return null
    try { old?.src.disconnect() } catch {}
    const src = ac.createMediaStreamSource(ms), an = ac.createAnalyser()
    an.fftSize = 256; src.connect(an)                         // analysis only: audio still plays via the <audio> element
    return { src, an, buf: new Uint8Array(an.fftSize), lvl: 0, t: 0 }
  }
  function read(a) {
    if (!a) return 0
    a.an.getByteTimeDomainData(a.buf)
    let s = 0; for (const x of a.buf) { const d = (x - 128) / 128; s += d * d }
    const now = performance.now(), l = levelOf(Math.sqrt(s / a.buf.length))
    if (l >= a.lvl) { a.lvl = l; a.t = now }                                 // rise instantly
    else if (now - a.t > 140) { a.lvl = Math.max(l, a.lvl - 1); a.t = now }  // fall one step at a time: no flicker
    return a.lvl
  }
  function startMeter() {
    clearInterval(meter)
    meter = setInterval(() => {
      V.lvlMe = V.muted ? 0 : read(meA)
      V.lvlOpp = read(oppA)
    }, 70)
  }
  function stopMeter() {
    clearInterval(meter); meter = null; V.lvlMe = V.lvlOpp = 0
    try { ac?.close() } catch {}
    ac = meA = oppA = null
  }
  const flush = () => queue.splice(0).forEach(c => pc.addIceCandidate(c).catch(() => {}))

  async function onSignal(m) {
    if (!V.on || !m || m.from === uid()) return
    try {
      if (m.t === 'hello') {
        if (!m.reply) sig({ t: 'hello', reply: 1 })
        if (getMe() === 'R' && Date.now() - lastOffer > 4000 && !(pc && pc.connectionState === 'connected')) {
          lastOffer = Date.now()
          const p = makePc(); await p.setLocalDescription(tuned(await p.createOffer())); sig({ t: 'offer', sdp: p.localDescription })
        }
      } else if (m.t === 'offer' && getMe() === 'Y') {
        const p = makePc(); await p.setRemoteDescription(m.sdp); flush()
        await p.setLocalDescription(tuned(await p.createAnswer())); sig({ t: 'answer', sdp: p.localDescription })
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
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: { ideal: 1 }, latency: { ideal: 0 } } })
    } catch { return notify('Microphone blocked. Allow it in your browser settings.') }
    V.on = true; V.muted = false; lastOffer = 0
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); ac.resume().catch(() => {})
      meA = analyser(stream, null); startMeter()
    } catch { /* no WebAudio: voice still works, just no talking animation */ }
    makePc(); V.status = `Waiting for ${getOppName()} to turn voice on…`; sig({ t: 'hello' })
  }
  function stop() {
    if (!V.on) return
    sig({ t: 'bye' }); V.on = false
    try { pc?.close() } catch {}
    stream?.getTracks().forEach(t => t.stop())
    stopMeter()
    pc = stream = null; queue = []; audio.srcObject = null; V.status = ''
  }
  function toggleMute() {
    if (!stream) return
    V.muted = !V.muted
    stream.getAudioTracks().forEach(t => (t.enabled = !V.muted))
  }
  return { V, start, stop, toggleMute, onSignal }
}