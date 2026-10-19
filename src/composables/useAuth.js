import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { notify } from './useToast'

export const user = ref(null)
export const ready = ref(false)
const meta = computed(() => user.value?.user_metadata || {})
export const avatar = computed(() => meta.value.avatar || '😎')
export const shirt = computed(() => meta.value.shirt || null)     // null = team colour
export const pants = computed(() => meta.value.pants || null)
export const displayName = computed(() => meta.value.name || (user.value?.email || 'Player').split('@')[0])
// New accounts must pick a character before reaching the lobby
export const needsSetup = computed(() => !!user.value && meta.value.onboarded === false)

export async function initAuth() {
  const { data } = await supabase.auth.getSession()
  user.value = data.session?.user ?? null
  ready.value = true
  supabase.auth.onAuthStateChange((_e, s) => { user.value = s?.user ?? null })
}

export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name: (name || email.split('@')[0]).slice(0, 12), avatar: '😎', onboarded: false } },
  })
  if (error) return error.message
  if (!data.session) return 'Account created. Confirm the email we sent, or turn off "Confirm email" in Supabase Auth settings.'
  return ''
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? error.message : ''
}

export const signOut = () => supabase.auth.signOut()

async function saveMeta(patch) {
  user.value = { ...user.value, user_metadata: { ...user.value.user_metadata, ...patch } }   // instant UI
  const { error } = await supabase.auth.updateUser({ data: patch })
  if (error) notify('Could not save: ' + error.message)
}
export const setAvatar = a => saveMeta({ avatar: a })
export const setOutfit = patch => saveMeta(patch)          // { shirt } or { pants }; null = team colour
export const finishSetup = () => saveMeta({ onboarded: true })