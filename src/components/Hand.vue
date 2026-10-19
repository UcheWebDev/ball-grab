<script setup>
defineProps({ x: Number, y: Number, color: String, closed: Boolean })
const fingers = [[-7, 8], [-3.5, 10], [0, 11], [3.5, 10], [7, 8]]
</script>
<template>
  <g :transform="`translate(${x} ${y})`" :fill="color" stroke="rgba(0,0,0,.25)" stroke-width="1">
    <circle v-if="closed" r="10" />
    <template v-else>
      <path d="M 8 -2 A 8 8 0 0 1 -8 -2 Z" stroke="none" />
      <rect v-for="f in fingers" :key="f[0]" :x="f[0] - 1.5" y="-2" width="3" :height="f[1]" rx="2" />
    </template>
  </g>
</template>
