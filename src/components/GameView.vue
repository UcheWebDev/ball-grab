<script setup>
import { computed, watch, ref, onBeforeUnmount } from 'vue'
import { notify } from '../composables/useToast'
import { D, mode, me, opp, net, myTurn, busy, playerInfo, tap, act, rematch, leaveMatch, voice } from '../composables/useGame'
import { statusMsg, talking } from '../composables/useStage'
import { lookFor } from '../lib/avatars'
import { playSound, haptic, soundOn, toggleSound } from '../lib/sound'
import Scene from './Scene.vue'
import Portrait from './Portrait.vue'
import SignalBars from './SignalBars.vue'

const V = voice.V
const outfit = t => { const i = playerInfo(t); return { ...lookFor(i.avatar), shirt: i.shirt, pants: i.pants } }
const looks = computed(() => ({ R: outfit('R'), Y: outfit('Y') }))
const exposed = computed(() => D.value.slots.filter(s => s && s.rev && s.c === me.value).length)
const hint = computed(() => {
  if (D.value.winner) return ''
  if (!myTurn.value) return busy.value ? '' : `Waiting for ${playerInfo(D.value.turn).name}…`
  if (D.value.phase === 'shake') return 'Use your one-time shake?'
  return exposed.value ? `👀 ${exposed.value} of your colour ${exposed.value > 1 ? 'are' : 'is'} exposed. Grab ${exposed.value > 1 ? 'one' : 'it'}!` : 'Tap a mystery slot to reach in!'
})
const promptText = computed(() => {
  const c = D.value.last?.c === 'R' ? 'red' : 'yellow'
  return `You exposed a ${c} ball and ${playerInfo(me.value === 'R' ? 'Y' : 'R').name} will see it. Use your one-time shake to hide it?`
})
const onTap = i => { playSound('tap'); haptic([20]); tap(i) }
watch(() => V.status, s => s && notify(s))
watch(() => D.value?.winner && !busy.value, v => v && playSound('win'))

// give the winner's dance / loser's cry time to play before the result dialog appears
const RESULT_DELAY = 2800
const showResult = ref(false)
let resultTimer = null
watch(() => !!D.value?.winner && !busy.value, ready => {
  clearTimeout(resultTimer)
  if (ready) resultTimer = setTimeout(() => (showResult.value = true), RESULT_DELAY)
  else showResult.value = false
}, { immediate: true })
onBeforeUnmount(() => { clearTimeout(resultTimer); talking.value = { R: 0, Y: 0 } })

// voice level -> which character is talking
watch(() => [V.on, V.lvlMe, V.lvlOpp, me.value], () => {
  const mine = me.value, theirs = mine === 'R' ? 'Y' : 'R'
  talking.value = V.on ? { [mine]: V.lvlMe, [theirs]: V.lvlOpp } : { R: 0, Y: 0 }
}, { immediate: true })

// ---- connection status ----
const sigOf = t => {
  const n = net.value
  if (t === me.value) return n.link === 'online' ? { q: n.meQ, rtt: n.meRtt } : { q: 'offline', rtt: null }
  return ['away', 'gone', 'left'].includes(n.oppStatus) ? { q: 'offline', rtt: null } : { q: n.oppQ, rtt: n.oppRtt }
}
const netMsg = computed(() => {
  if (mode.value !== 'online') return null
  const n = net.value, name = opp.value.name
  if (n.link === 'offline') return { cls: 'bad', text: "You're offline. We'll reconnect when your signal returns." }
  if (n.link === 'connecting') return { cls: 'warn', text: 'Reconnecting…' }
  if (n.oppStatus === 'left') return { cls: 'warn', text: `${name} left the match. Waiting for them to rejoin…` }
  if (n.oppStatus === 'away') return { cls: 'warn', text: `${name} lost connection. Waiting for them to come back…` }
  if (n.oppStatus === 'gone') return { cls: 'warn', text: `${name} hasn't returned yet. The match is saved and they can still rejoin.` }
  if (n.oppStatus === 'unstable') return { cls: 'warn', text: `${name}'s connection is unstable.` }
  if (n.oppStatus === 'waiting') return { cls: 'warn', text: `Waiting for ${name}…` }
  if (n.meQ === 'poor') return { cls: 'warn', text: 'Weak connection. Moves may be delayed.' }
  return null
})

// leaving an unfinished online match asks first (it stays rejoinable from the lobby)
const showLeave = ref(false)
const askLeave = () => (mode.value === 'online' && !D.value?.winner ? (showLeave.value = true) : leaveMatch())
const doLeave = () => { showLeave.value = false; leaveMatch() }
</script>

<template>
  <div class="hud">
    <div class="banner">{{ statusMsg }}</div>
    <button class="icon" @click="toggleSound">{{ soundOn ? '🔊' : '🔇' }}</button>
    <template v-if="mode === 'online'">
      <button class="icon" :class="{ on: V.on && !V.muted, off: V.on && V.muted }" :title="V.on ? 'Voice on' : 'Start voice'" @click="V.on ? voice.stop() : voice.start()">{{ V.on && V.muted ? '🔇' : '🎤' }}</button>
      <button v-if="V.on" class="icon wide" @click="voice.toggleMute()">{{ V.muted ? 'Unmute' : 'Mute' }}</button>
    
    </template>
    <button v-if="mode === 'cpu'" class="icon wide" @click="rematch">Reset</button>
  </div>

  <div class="score">
    <div v-for="t in ['R', 'Y']" :key="t" class="pl" :class="[t, { turn: D.turn === t }]">
      <span v-if="talking[t]" class="eq" title="Talking"><i /><i /><i /></span>
      <SignalBars v-if="mode === 'online'" class="sigpos" :q="sigOf(t).q" :rtt="sigOf(t).rtt" />
      <Portrait :id="playerInfo(t).avatar" :team="t" :size="46" />
      <div class="who">
        <b>{{ playerInfo(t).name }}{{ t === me ? ' (you)' : '' }}</b>
        <small>{{ D.score[t] }} / 6 · 📳 shake {{ D.shakes[t] }}</small>
      </div>
      <div class="wins" title="Wins this session"><span class="n">{{ D.wins?.[t] ?? 0 }}</span><span class="t">wins</span></div>
    </div>
  </div>

  <div class="stage brick-wall">
    <div v-if="netMsg" class="netbar" :class="netMsg.cls" role="status">{{ netMsg.text }}</div>
    <Scene :looks="looks" @tap="onTap" />
    <div v-if="myTurn && D.phase === 'shake'" class="prompt">
      <p>{{ promptText }}</p>
      <div class="row">
        <button class="btn" @click="act('shake')">📳 SHAKE &amp; HIDE</button>
        <button class="btn alt" @click="act('skip')">Keep my shake</button>
      </div>
    </div>
  </div>
  <div class="status">{{ hint }}</div>

  <button class="link" @click="askLeave">Leave game</button>

  <div v-if="showResult && D.winner" class="modal">
    <div class="card">
      <div class="big">{{ D.winner === me ? '🎉' : '🤖' }}</div>
      <h2>{{ D.winner === me ? 'YOU WIN!' : playerInfo(D.winner).name + ' WINS' }}</h2>
      <p class="sub" style="margin-bottom: 4px">{{ playerInfo(D.winner).name }} collected 6 balls first!</p>
      <p class="sub" style="margin-bottom: 8px">Session: {{ playerInfo('R').name }} {{ D.wins?.R ?? 0 }} – {{ D.wins?.Y ?? 0 }} {{ playerInfo('Y').name }}</p>
      <button class="btn" @click="rematch">PLAY AGAIN</button>
      <button class="btn alt" @click="leaveMatch">Back to lobby</button>
    </div>
  </div>

  <div v-if="showLeave" class="modal" @click.self="showLeave = false">
    <div class="card">
      <h2 style="font-size: 18px">Leave this match?</h2>
      <p class="sub">Your game is saved. You can rejoin from the lobby for the next 20 minutes.</p>
      <button class="btn" @click="showLeave = false">Stay in match</button>
      <button class="btn alt" @click="doLeave">Leave</button>
    </div>
  </div>
</template>