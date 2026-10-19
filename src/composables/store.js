import { ref, computed } from 'vue'
export const G = ref(null)      // latest public state from the engine / host
export const D = ref(null)      // state currently DISPLAYED (lags G while animations play)
export const busy = ref(false)  // an animation is running
export const mode = ref('cpu')  // 'cpu' | 'online'
export const me = ref('R')      // R = host / vs CPU, Y = guest
export const opp = ref({ name: 'CPU', avatar: '🤖' })
export const myTurn = computed(() => !!D.value && !D.value.winner && D.value.turn === me.value && !busy.value)
