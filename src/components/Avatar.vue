<script setup>
import { computed } from 'vue'
import { GROUND } from '../lib/geometry'
import Hand from './Hand.vue'

const p = defineProps({
  team: String, look: Object, av: Object, resting: Boolean,
  emote: String,                       // 'dance' | 'cry' | 'head' | 'laugh' | undefined
  talk: { type: Number, default: 0 },  // voice level 0..3 (mouth opens with it)
  shadowY: { type: Number, default: GROUND + 2 },
})
const x = computed(() => p.av.x), y = computed(() => p.av.y)
const fem = computed(() => p.look.body === 'f')
const st = computed(() => p.look.style)
const teamColor = computed(() => (p.team === 'R' ? '#ef4444' : '#eab308'))
const shirt = computed(() => p.look.shirt || teamColor.value)
const pants = computed(() => p.look.pants || (p.team === 'R' ? '#1e293b' : '#334155'))
const dir = computed(() => (p.team === 'R' ? -1 : 1))
const psx = computed(() => x.value + dir.value * 20)      // passive (idle) arm
const phx = computed(() => x.value + dir.value * 22)
const sy = computed(() => p.av.sh.y)
const mid = computed(() => (p.av.sh.x + p.av.rest.x) / 2)
const beardColor = computed(() => p.look.beardColor || p.look.hair)

const cap = computed(() => `M ${x.value - 17} ${y.value + 8} A 17 17 0 0 1 ${x.value + 17} ${y.value + 8} Z`)
const afroFront = computed(() => `M ${x.value - 15} ${y.value + 6} A 15 15 0 0 1 ${x.value + 15} ${y.value + 6} Z`)
const bobBack = computed(() => `M ${x.value - 19} ${y.value + 8} Q ${x.value - 21} ${y.value + 36} ${x.value - 12} ${y.value + 36} H ${x.value + 12} Q ${x.value + 21} ${y.value + 36} ${x.value + 19} ${y.value + 8} Z`)
const longBack = computed(() => `M ${x.value - 19} ${y.value + 8} Q ${x.value - 23} ${y.value + 54} ${x.value - 13} ${y.value + 56} H ${x.value + 13} Q ${x.value + 23} ${y.value + 54} ${x.value + 19} ${y.value + 8} Z`)
const hijabBack = computed(() => `M ${x.value - 19} ${y.value + 14} Q ${x.value - 19} ${y.value - 8} ${x.value} ${y.value - 8} Q ${x.value + 19} ${y.value - 8} ${x.value + 19} ${y.value + 14} L ${x.value + 22} ${y.value + 46} L ${x.value - 22} ${y.value + 46} Z`)
const hijabFront = computed(() => `M ${x.value - 17} ${y.value + 14} A 17 18 0 0 1 ${x.value + 17} ${y.value + 14} L ${x.value + 13} ${y.value + 14} A 13 14 0 0 0 ${x.value - 13} ${y.value + 14} Z`)
const beardFull = computed(() => `M ${x.value - 15} ${y.value + 17} Q ${x.value - 17} ${y.value + 38} ${x.value} ${y.value + 39} Q ${x.value + 17} ${y.value + 38} ${x.value + 15} ${y.value + 17} Q ${x.value} ${y.value + 27} ${x.value - 15} ${y.value + 17} Z`)
const stache = computed(() => `M ${x.value - 7} ${y.value + 23} Q ${x.value} ${y.value + 20} ${x.value + 7} ${y.value + 23} Q ${x.value} ${y.value + 26} ${x.value - 7} ${y.value + 23} Z`)
const mouth = computed(() => `M ${x.value - 4} ${y.value + 24} Q ${x.value} ${y.value + 27} ${x.value + 4} ${y.value + 24}`)
const torsoF = computed(() => `M ${x.value - 18} ${y.value + 46} Q ${x.value - 18} ${y.value + 36} ${x.value - 9} ${y.value + 36} H ${x.value + 9} Q ${x.value + 18} ${y.value + 36} ${x.value + 18} ${y.value + 46} L ${x.value + 14} ${y.value + 84} H ${x.value - 14} Z`)
const skirt = computed(() => `M ${x.value - 15} ${y.value + 78} H ${x.value + 15} L ${x.value + 23} ${y.value + 104} H ${x.value - 23} Z`)
const feet = computed(() => y.value + 126)
const mouthColor = computed(() => (p.look.beard === 'full' ? '#fca5a5' : fem.value ? '#be123c' : '#7c2d12'))
const smile = computed(() => `M ${x.value - 7} ${y.value + 22} Q ${x.value} ${y.value + 33} ${x.value + 7} ${y.value + 22} Z`)
const laughMouth = computed(() => `M ${x.value - 8} ${y.value + 22} Q ${x.value} ${y.value + 38} ${x.value + 8} ${y.value + 22} Z`)
const frown = computed(() => `M ${x.value - 5} ${y.value + 28} Q ${x.value} ${y.value + 22} ${x.value + 5} ${y.value + 28}`)
// emote arms: [shoulder, elbow, hand] offsets, mirrored for the left / right side
const EARMS = {
  dance: { sh: [18, 42], el: [30, 22], hd: [26, -6] },
  cry: { sh: [18, 44], el: [24, 30], hd: [8, 15] },
  head: { sh: [18, 44], el: [32, 22], hd: [12, 1] },
  laugh: { sh: [18, 44], el: [27, 58], hd: [11, 67] },   // hands on the belly
}
// the working arm is drawn by ActiveArm while it reaches, so the emote must not draw a second copy of it
const workK = computed(() => Math.sign(p.av.sh.x - x.value) || -dir.value)
const earms = computed(() => {
  const a = EARMS[p.emote]
  if (!a) return []
  return [-1, 1].filter(k => p.resting || k !== workK.value).map(k => ({
    k, sx: x.value + k * a.sh[0], sy: y.value + a.sh[1],
    ex: x.value + k * a.el[0], ey: y.value + a.el[1],
    hx: x.value + k * a.hd[0], hy: y.value + a.hd[1],
  }))
})
const talkRx = computed(() => [0, 3, 3.6, 4.2][p.talk] || 0)
const talkRy = computed(() => [0, 2, 3.6, 5.2][p.talk] || 0)
const dreadX = [-18, -12, -6, 6, 12, 18]
const curls = [[-14, 2], [-8, -4], [0, -7], [8, -4], [14, 2]]
</script>

<template>
  <g stroke-linecap="round">
    <ellipse :cx="x" :cy="shadowY" rx="28" ry="8" fill="rgba(0,0,0,.4)" />

    <!-- emote wrappers: bounce (dance) > sway (dance) > shake (cry / head) -->
    <g>
      <animateTransform v-if="emote === 'dance'" attributeName="transform" type="translate" values="0 0;0 -12;0 0" dur="0.5s" repeatCount="indefinite" />
      <animateTransform v-else-if="emote === 'laugh' && resting" attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="0.2s" repeatCount="indefinite" />
      <g>
        <animateTransform v-if="emote === 'laugh' && resting" attributeName="transform" type="rotate" :values="`-3 ${x} ${feet};3 ${x} ${feet};-3 ${x} ${feet}`" dur="0.4s" repeatCount="indefinite" />
        <animateTransform v-else-if="emote === 'dance'" attributeName="transform" type="rotate" :values="`-5 ${x} ${feet};5 ${x} ${feet};-5 ${x} ${feet}`" dur="1s" repeatCount="indefinite" />
        <g>
          <animateTransform v-if="emote === 'cry'" attributeName="transform" type="translate" values="0 0;0 2.5;0 0" dur="0.3s" repeatCount="indefinite" />
          <animateTransform v-else-if="emote === 'head'" attributeName="transform" type="translate" values="0 0;-2 0;2 0;0 0" dur="0.25s" repeatCount="indefinite" />
          <animateTransform v-else-if="!emote && talk" attributeName="transform" type="translate" values="0 0;0 -1.4;0 0" dur="0.32s" repeatCount="indefinite" />

    <!-- legs, shoes (women: skirt) -->
    <template v-if="fem">
      <rect :x="x - 10" :y="y + 100" width="8" height="22" :fill="look.skin" />
      <rect :x="x + 2" :y="y + 100" width="8" height="22" :fill="look.skin" />
      <path :d="skirt" :fill="pants" />
      <rect :x="x - 13" :y="y + 120" width="11" height="6" fill="#0f172a" />
      <rect :x="x + 2" :y="y + 120" width="11" height="6" fill="#0f172a" />
    </template>
    <template v-else>
      <rect :x="x - 14" :y="y + 80" width="10" height="42" :fill="pants" />
      <rect :x="x + 4" :y="y + 80" width="10" height="42" :fill="pants" />
      <rect :x="x - 16" :y="y + 120" width="12" height="6" fill="#0f172a" />
      <rect :x="x + 4" :y="y + 120" width="12" height="6" fill="#0f172a" />
    </template>

    <!-- hair that sits behind the body / head -->
    <g :fill="look.hair">
      <circle v-if="st === 'afro'" :cx="x" :cy="y + 4" r="24" />
      <template v-if="st === 'dreads'">
        <rect v-for="o in dreadX" :key="o" :x="x + o - 3" :y="y + 2" width="6" :height="Math.abs(o) < 10 ? 30 : 40" rx="3" />
      </template>
      <template v-if="st === 'curly'"><circle v-for="c in curls" :key="c[0]" :cx="x + c[0]" :cy="y + c[1]" r="9" /></template>
      <path v-if="st === 'long'" :d="longBack" />
      <path v-if="st === 'bob'" :d="bobBack" />
      <ellipse v-if="st === 'ponytail'" :cx="x + 19" :cy="y + 24" rx="5" ry="14" />
      <circle v-if="st === 'bun'" :cx="x" :cy="y - 8" r="8" />
      <path v-if="st === 'hijab'" :d="hijabBack" />
    </g>

    <!-- torso -->
    <path v-if="fem" :d="torsoF" :fill="shirt" />
    <rect v-else :x="x - 20" :y="y + 36" width="40" height="48" rx="9" :fill="shirt" />

    <!-- team band: keeps Red / Yellow readable whatever clothes are chosen -->
    <line :x1="x - 11" :y1="y + 62" :x2="x + 11" :y2="y + 62" stroke="rgba(255,255,255,.85)" stroke-width="7" />
    <line :x1="x - 11" :y1="y + 62" :x2="x + 11" :y2="y + 62" :stroke="teamColor" stroke-width="4.5" />

    <!-- neck + head -->
    <rect :x="x - 5" :y="y + 28" width="10" height="10" :fill="look.skin" />
    <ellipse :cx="x" :cy="y + 14" rx="16" ry="18" :fill="look.skin" />

    <!-- hair on top of the head -->
    <g :fill="look.hair">
      <path v-if="['short', 'long', 'bob', 'ponytail', 'bun', 'dreads', 'curly'].includes(st)" :d="cap" />
      <path v-if="st === 'afro'" :d="afroFront" />
      <path v-if="st === 'buzz'" :d="cap" opacity=".55" />
      <template v-if="st === 'cap'"><path :d="cap" /><rect :x="x - 18" :y="y + 8" width="36" height="4" /></template>
      <rect v-if="st === 'mohawk'" :x="x - 3.5" :y="y - 15" width="7" height="22" rx="3.5" />
      <path v-if="st === 'hijab'" :d="hijabFront" />
      <ellipse v-if="st === 'bald'" :cx="x - 5" :cy="y - 1" rx="4" ry="2" fill="#fff" opacity=".25" />
    </g>

    <!-- face -->
    <g v-if="emote === 'laugh' && !look.glasses" fill="none" stroke="#1e293b" stroke-width="1.8">
      <path :d="`M ${x - 9} ${y + 14} Q ${x - 5} ${y + 9} ${x - 1} ${y + 14}`" />
      <path :d="`M ${x + 1} ${y + 14} Q ${x + 5} ${y + 9} ${x + 9} ${y + 14}`" />
    </g>
    <template v-else-if="!look.glasses">
      <circle :cx="x - 5" :cy="y + 13" r="1.8" fill="#1e293b" />
      <circle :cx="x + 5" :cy="y + 13" r="1.8" fill="#1e293b" />
    </template>
    <g v-else :fill="look.glasses === 'sun' ? '#0f172a' : 'none'" stroke="#0f172a" stroke-width="2">
      <rect :x="x - 11" :y="y + 10" width="9" height="7" />
      <rect :x="x + 2" :y="y + 10" width="9" height="7" />
      <line :x1="x - 2" :y1="y + 13" :x2="x + 2" :y2="y + 13" />
    </g>
    <path v-if="look.beard === 'full'" :d="beardFull" :fill="beardColor" />
    <path v-if="look.beard === 'stache'" :d="stache" :fill="beardColor" />
    <path v-if="emote === 'dance'" :d="smile" fill="#fff" :stroke="mouthColor" stroke-width="1.6" stroke-linejoin="round" />
    <template v-else-if="emote === 'laugh'">
      <path :d="laughMouth" fill="#450a0a" :stroke="mouthColor" stroke-width="1.4" stroke-linejoin="round" />
      <line :x1="x - 6" :y1="y + 23.6" :x2="x + 6" :y2="y + 23.6" stroke="#fff" stroke-width="2.6" />
    </template>
    <path v-else-if="emote === 'cry'" :d="frown" fill="none" :stroke="mouthColor" stroke-width="2" />
    <ellipse v-else-if="emote === 'head'" :cx="x" :cy="y + 26" rx="3.5" ry="5" fill="#450a0a" :stroke="mouthColor" stroke-width="1" />
    <ellipse v-else-if="talk" :cx="x" :cy="y + 25 + talkRy * 0.4" :rx="talkRx" :ry="talkRy" fill="#450a0a" :stroke="mouthColor" stroke-width="1" />
    <path v-else-if="look.beard !== 'full'" :d="mouth" fill="none" :stroke="fem ? '#be123c' : '#7c2d12'" :stroke-width="fem ? 2 : 1.6" />

    <!-- passive arm -->
    <template v-if="!emote">
    <line :x1="psx" :y1="sy" :x2="phx" :y2="sy + 28" :stroke="shirt" stroke-width="9" />
    <line :x1="phx" :y1="sy + 28" :x2="phx" :y2="sy + 48" :stroke="look.skin" stroke-width="7" />
    <Hand :x="phx" :y="sy + 52" :color="look.skin" />
    </template>

    <!-- working arm at rest (while it is reaching, ActiveArm draws it) -->
    <template v-if="resting && !emote">
      <line :x1="av.sh.x" :y1="sy" :x2="mid" :y2="sy + 20" :stroke="shirt" stroke-width="9" />
      <line :x1="mid" :y1="sy + 20" :x2="av.rest.x" :y2="av.rest.y" :stroke="look.skin" stroke-width="7" />
      <ellipse :cx="av.rest.x" :cy="av.rest.y + 4" rx="10" ry="4" fill="rgba(0,0,0,.3)" />
      <Hand :x="av.rest.x" :y="av.rest.y" :color="look.skin" />
    </template>

    <!-- emote arms -->
    <g v-for="a in earms" :key="a.k">
      <animateTransform v-if="emote === 'dance'" attributeName="transform" type="rotate" :values="a.k < 0 ? `-14 ${a.sx} ${a.sy};14 ${a.sx} ${a.sy};-14 ${a.sx} ${a.sy}` : `14 ${a.sx} ${a.sy};-14 ${a.sx} ${a.sy};14 ${a.sx} ${a.sy}`" dur="0.5s" repeatCount="indefinite" />
      <line :x1="a.sx" :y1="a.sy" :x2="a.ex" :y2="a.ey" :stroke="shirt" stroke-width="9" />
      <line :x1="a.ex" :y1="a.ey" :x2="a.hx" :y2="a.hy" :stroke="look.skin" stroke-width="7" />
      <circle :cx="a.hx" :cy="a.hy" r="6" :fill="look.skin" />
    </g>

    <!-- tears of joy -->
    <g v-if="emote === 'laugh'" fill="#7dd3fc">
      <circle v-for="k in [-1, 1]" :key="k" :cx="x + k * 11" :cy="y + 15" r="2">
        <animate attributeName="cx" :values="`${x + k * 11};${x + k * 17}`" dur="0.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0" dur="0.5s" repeatCount="indefinite" />
      </circle>
    </g>

    <!-- tears -->
    <g v-if="emote === 'cry'" fill="#38bdf8">
      <circle v-for="(t, n) in [[-7, 0], [7, 0.45], [-7, 0.45], [7, 0]]" :key="n" :cx="x + t[0]" :cy="y + 19" r="2.4">
        <animate attributeName="cy" :values="`${y + 19};${y + 44}`" dur="0.9s" :begin="`${t[1]}s`" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0" dur="0.9s" :begin="`${t[1]}s`" repeatCount="indefinite" />
      </circle>
    </g>
        </g>
      </g>
    </g>
  </g>
</template>