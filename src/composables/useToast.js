import { ref } from 'vue'
export const toast = ref('')
let t = null
export function notify(msg) { toast.value = msg; clearTimeout(t); t = setTimeout(() => (toast.value = ''), 3000) }
