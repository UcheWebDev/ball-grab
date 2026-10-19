<script setup>
import { computed } from 'vue'
import { lookFor } from '../lib/avatars'
import Avatar from './Avatar.vue'

const p = defineProps({
  id: String,                                   // avatar id (emoji) saved on the user
  team: { type: String, default: 'R' },
  size: { type: Number, default: 40 },
  outfit: { type: Object, default: () => ({}) }, // optional { shirt, pants }
})

const look = computed(() => ({ ...lookFor(p.id), ...p.outfit }))
const av = { x: 0, y: 0, sh: { x: 16, y: 42 }, rest: { x: 22, y: 60 } }
const ring = computed(() => (p.team === 'R' ? '#ef4444' : '#eab308'))
</script>

<template>
  <svg
    viewBox="-26 -22 52 62"
    class="portrait"
    :style="{ width: size + 'px', height: size + 'px', borderColor: ring }"
  >
    <Avatar :team="team" :look="look" :av="av" resting :shadow-y="500" />
  </svg>
</template>

<style scoped>
.portrait {
  display: block;
  flex: none;
  border-radius: 50%;
  border: 2px solid;
  background: #1e293b;
  overflow: hidden;
}
</style>