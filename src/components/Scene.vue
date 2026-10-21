<script setup>
import { computed } from 'vue'
import { W, H, GROUND, BOX, TUBES, AV, BALL_R, slotGeom } from '../lib/geometry'
import { D } from '../composables/store'
import { active, held, heldSlot, falling, boxOff, emotes, talking } from '../composables/useStage'
import Avatar from './Avatar.vue'
import ActiveArm from './ActiveArm.vue'
import Ball from './Ball.vue'

defineProps({ looks: Object })       // { R: look, Y: look }
const emit = defineEmits(['tap'])

const cells = computed(() => D.value.slots.map((s, i) => ({ i, s, g: slotGeom(i) })))
const left = computed(() => D.value.slots.filter(Boolean).length)
const stack = team => Array.from({ length: D.value.score[team] }, (_, k) => TUBES[team].y + TUBES[team].h - BALL_R - 6 - k * (BALL_R * 2 + 3))
const shown = c => c.s && c.i !== heldSlot.value
const stroke = c => (shown(c) && c.s.rev ? (c.s.c === 'R' ? '#ef4444' : '#eab308') : shown(c) ? '#334155' : '#1e293b')
const tubePath = t => `M ${t.x} ${t.y} V ${t.y + t.h - 12} Q ${t.x} ${t.y + t.h} ${t.x + 12} ${t.y + t.h} H ${t.x + t.w - 12} Q ${t.x + t.w} ${t.y + t.h} ${t.x + t.w} ${t.y + t.h - 12} V ${t.y}`
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="scene">
    <defs>
      <radialGradient id="gR" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fca5a5" /><stop offset=".5" stop-color="#ef4444" /><stop offset="1" stop-color="#7f1d1d" /></radialGradient>
      <radialGradient id="gY" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fef08a" /><stop offset=".5" stop-color="#eab308" /><stop offset="1" stop-color="#713f12" /></radialGradient>
    </defs>
    <ellipse :cx="W / 2" :cy="GROUND + 8" :rx="W * 0.45" ry="12" fill="rgba(0,0,0,.35)" />

    <Avatar v-for="t in ['R', 'Y']" :key="t" :team="t" :look="looks[t]" :av="AV[t]" :resting="!active || active.team !== t" :emote="emotes[t]" :talk="talking[t]" />

    <!-- tubes -->
    <g v-for="t in ['R', 'Y']" :key="'t' + t">
      <path :d="tubePath(TUBES[t])" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.4)" stroke-width="2.5" />
      <ellipse :cx="TUBES[t].x + TUBES[t].w / 2" :cy="TUBES[t].y" :rx="TUBES[t].w / 2 + 3" ry="5" :fill="t === 'R' ? '#ef4444' : '#eab308'" />
      <Ball v-for="(by, k) in stack(t)" :key="k" :x="TUBES[t].x + TUBES[t].w / 2" :y="by" :r="BALL_R" :c="t" />
    </g>

    <!-- mystery box -->
    <g :transform="`translate(${boxOff.x} ${boxOff.y})`">
      <ellipse :cx="BOX.x + BOX.w / 2" :cy="GROUND + 4" :rx="BOX.w / 2 + 10" ry="8" fill="rgba(0,0,0,.45)" />
      <rect :x="BOX.x" :y="BOX.y" :width="BOX.w" :height="BOX.h" fill="#0f172a" stroke="#38bdf8" stroke-width="3" />
      <rect :x="BOX.x + 6" :y="BOX.y + 6" :width="BOX.w - 12" :height="BOX.h - 12" fill="#1e293b" />
      <text :x="BOX.x + BOX.w / 2" :y="BOX.y + 19" text-anchor="middle" dominant-baseline="middle" fill="#fef08a" font-family="Fredoka" font-weight="700" font-size="11">🎁 MYSTERY BOX ({{ left }} LEFT)</text>
      <g v-for="c in cells" :key="c.i" style="cursor: pointer" @click="emit('tap', c.i)">
        <rect :x="c.g.sx" :y="c.g.sy" :width="c.g.sw" :height="c.g.sh" rx="6" fill="#0f172a" :stroke="stroke(c)"
              :stroke-width="shown(c) && c.s.rev ? 2.5 : 1.5" :class="{ pulse: shown(c) && c.s.rev }" />
        <Ball v-if="shown(c) && c.s.rev" :x="c.g.cx" :y="c.g.cy" :r="Math.min(c.g.w, c.g.h) * 0.34" :c="c.s.c" />
        <text v-else-if="shown(c)" :x="c.g.cx" :y="c.g.cy" text-anchor="middle" dominant-baseline="middle" fill="#38bdf8" font-family="Fredoka" font-weight="700" font-size="13">?</text>
      </g>
    </g>

    <Ball v-if="falling" :x="falling.x" :y="falling.y" :r="BALL_R" :c="falling.c" />
    <ActiveArm v-if="active" :team="active.team" :look="looks[active.team]" :x="active.x" :y="active.y" :closed="active.closed" />
    <Ball v-if="active && held" :x="active.x" :y="active.y + 16" :r="BALL_R" :c="held" />
  </svg>
</template>