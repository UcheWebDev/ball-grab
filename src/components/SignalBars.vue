<script setup>
import { computed } from "vue";
const props = defineProps({
  q: { type: String, default: "unknown" },
  rtt: { type: Number, default: null },
});
const level = computed(() => ({ good: 3, ok: 2, poor: 1 })[props.q] ?? 0);
const label = computed(() => {
  const name =
    {
      good: "Strong signal",
      ok: "Fair signal",
      poor: "Weak signal",
      offline: "No connection",
      unknown: "Checking signal…",
    }[props.q] || "Checking signal…";
  return props.rtt != null && props.q !== "offline"
    ? `${name} · ${props.rtt} ms`
    : name;
});
</script>

<template>
  <span class="sig" :class="q" role="img" :title="label" :aria-label="label">
    <i :class="{ on: level >= 1 }" /><i :class="{ on: level >= 2 }" /><i
      :class="{ on: level >= 3 }"
    />
  </span>
</template>

<style scoped>
.sig {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 11px;
}
i {
  width: 3px;
  border-radius: 1px;
  background: #ffffff30;
  transition: background 0.3s;
}
i:nth-child(1) {
  height: 4px;
}
i:nth-child(2) {
  height: 7px;
}
i:nth-child(3) {
  height: 11px;
}
.good i.on {
  background: #22c55e;
}
.ok i.on {
  background: #eab308;
}
.poor i.on {
  background: #ef4444;
}
.offline i {
  background: #ef4444;
  opacity: 0.55;
  animation: sigblink 1s infinite;
}
@keyframes sigblink {
  50% {
    opacity: 0.15;
  }
}
</style>
