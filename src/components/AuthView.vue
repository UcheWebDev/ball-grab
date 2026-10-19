<script setup>
import { ref } from 'vue'
import { signIn, signUp } from '../composables/useAuth'

const isSignup = ref(false), email = ref(''), pass = ref(''), name = ref('')
const busy = ref(false), msg = ref('')

async function submit() {
  if (!email.value || pass.value.length < 6) { msg.value = 'Enter an email and a password of 6+ characters.'; return }
  busy.value = true; msg.value = ''
  msg.value = isSignup.value ? await signUp(email.value.trim(), pass.value, name.value) : await signIn(email.value.trim(), pass.value)
  busy.value = false
}
</script>

<template>
  <div class="card">
    <h2 style="font-size: 22px">{{ isSignup ? 'Create account' : 'Sign in' }}</h2>
    <p class="sub">Email and password. Your avatar and name follow you across devices.</p>
    <input v-if="isSignup" class="in" v-model="name" maxlength="12" placeholder="Player name" autocomplete="nickname" />
    <input class="in" v-model="email" type="email" placeholder="Email" autocomplete="email" />
    <input class="in" v-model="pass" type="password" placeholder="Password (6+ characters)" autocomplete="current-password" @keyup.enter="submit" />
    <div class="msg">{{ msg }}</div>
    <button class="btn" :disabled="busy" @click="submit">{{ isSignup ? 'Sign up and play' : 'Sign in' }}</button>
    <button class="link" style="margin-top: 12px" @click="isSignup = !isSignup; msg = ''">
      {{ isSignup ? 'Have an account? Sign in' : 'New here? Create an account' }}
    </button>
  </div>
</template>
