<script setup>
import Avatar from './Avatar.vue'
defineProps({ look: Object, team: { type: String, default: 'R' } })
const av = { x: 0, y: 0, sh: { x: 16, y: 42 }, rest: { x: 22, y: 60 } }
</script>

<template>
  <svg viewBox="-34 -24 68 156" class="prev">
    <Avatar :team="team" :look="look" :av="av" resting :shadow-y="128" />
  </svg>
</template>