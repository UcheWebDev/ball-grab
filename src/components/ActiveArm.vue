<script setup>
import { computed } from 'vue'
import { AV, GROUND } from '../lib/geometry'
import Hand from './Hand.vue'

const p = defineProps({ team: String, look: Object, x: Number, y: Number, closed: Boolean })
const sh = computed(() => AV[p.team].sh)
const shirt = computed(() => p.look.shirt || (p.team === 'R' ? '#ef4444' : '#eab308'))
const mx = computed(() => (sh.value.x + p.x) / 2 + (p.team === 'R' ? 12 : -12))   // elbow
const my = computed(() => (sh.value.y + p.y) / 2 - 8)
</script>

<template>
  <g stroke-linecap="round">
    <line :x1="sh.x" :y1="sh.y" :x2="mx" :y2="my" :stroke="shirt" stroke-width="10" />
    <line :x1="mx" :y1="my" :x2="x" :y2="y" :stroke="look.skin" stroke-width="8" />
    <ellipse :cx="x" :cy="Math.min(y + 12, GROUND - 8)" rx="12" ry="5" fill="rgba(0,0,0,.25)" />
    <Hand :x="x" :y="y" :color="look.skin" :closed="closed" />
  </g>
</template>