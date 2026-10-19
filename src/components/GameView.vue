<script setup>
import { computed, watch } from 'vue'
import { D, mode, me, myTurn, busy, playerInfo, tap, act, rematch, leave, voice, startCpu } from '../composables/useGame'
import { statusMsg } from '../composables/useStage'
import { lookFor } from '../lib/avatars'
import { playSound, haptic, soundOn, toggleSound } from '../lib/sound'
import Scene from './Scene.vue'
import Portrait from './Portrait.vue'

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
watch(() => D.value?.winner && !busy.value, v => v && playSound('win'))
</script>

<template>
  <div class="hud">
    <div class="banner">{{ statusMsg }}</div>
    <button class="icon" @click="toggleSound">{{ soundOn ? '🔊' : '🔇' }}</button>
    <button v-if="mode === 'cpu'" class="icon wide" @click="startCpu">Reset</button>
  </div>

  <div class="score">
    <div v-for="t in ['R', 'Y']" :key="t" class="pl" :class="[t, { turn: D.turn === t }]">
      <Portrait :id="playerInfo(t).avatar" :team="t" :size="44" />
      <div><b>{{ playerInfo(t).name }}</b>{{ t === me ? ' (you)' : '' }}
        <small>{{ D.score[t] }} / 6 · 📳 shake {{ D.shakes[t] }}</small></div>
    </div>
  </div>

  <div class="stage brick-wall">
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

  <div v-if="mode === 'online'" class="card voice">
    <button class="btn" :class="{ alt: !V.on }" @click="V.on ? voice.stop() : voice.start()">🎤 {{ V.on ? 'Voice on' : 'Voice' }}</button>
    <button v-if="V.on" class="btn alt" @click="voice.toggleMute()">{{ V.muted ? '🔇 Unmute' : 'Mute' }}</button>
    <span class="sub">{{ V.status }}</span>
  </div>
  <button class="link" @click="leave">Leave game</button>

  <div v-if="D.winner && !busy" class="modal">
    <div class="card">
      <div class="big">{{ D.winner === me ? '🎉' : '🤖' }}</div>
      <h2>{{ D.winner === me ? 'YOU WIN!' : playerInfo(D.winner).name + ' WINS' }}</h2>
      <p class="sub" style="margin-bottom: 8px">{{ playerInfo(D.winner).name }} collected 6 balls first!</p>
      <button class="btn" @click="rematch">PLAY AGAIN</button>
      <button class="btn alt" @click="leave">Back to lobby</button>
    </div>
  </div>
</template>