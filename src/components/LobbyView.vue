<script setup>
import { ref } from 'vue'
import { notify } from '../composables/useToast'
import { searching, roomCode, lobbyMsg, resumable, quickMatch, cancelSearch, createRoom, joinRoom, startCpu, cancelRoom, resumeMatch, discardSession } from '../composables/useGame'

const code = ref('')
const copied = ref(false)
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(roomCode.value)
  } catch {
    const t = document.createElement('textarea')       // fallback for non-secure contexts
    t.value = roomCode.value
    document.body.appendChild(t); t.select()
    document.execCommand('copy')
    t.remove()
  }
  copied.value = true
  notify('Room code copied')
  setTimeout(() => { copied.value = false }, 1500)
}
const showJoin = ref(false)
const openJoin = () => { code.value = ''; showJoin.value = true }
const submitJoin = () => {
  if (!code.value.trim()) return
  joinRoom(code.value)
  showJoin.value = false
}
</script>

<template>
  <div v-if="resumable" class="card resume">
    <h2 style="font-size: 16px">Match in progress</h2>
    <p class="sub">You vs {{ resumable.oppName }} · {{ resumable.mine }} – {{ resumable.theirs }} balls. You can rejoin for about {{ resumable.minsLeft }} more min.</p>
    <button class="btn" @click="resumeMatch">↩️ Rejoin match</button>
    <button class="btn alt" @click="discardSession">Forfeit match</button>
  </div>

  <div class="card">
    <h2 style="font-size: 16px">Play</h2>
    <button class="btn" :disabled="searching" @click="quickMatch">🌐 Quick match</button>
    <button class="btn alt" @click="createRoom">🔑 Create private room</button>
    <button class="btn alt" @click="openJoin">🚪 Join private room</button>
    <button class="btn alt" @click="startCpu">🤖 Practice vs CPU</button>
    <div class="msg">{{ lobbyMsg }}</div>
  </div>

  <div class="card">
    <h2 style="font-size: 16px">Shakes</h2>
    <p class="sub">Every player gets one shake per match to hide exposed balls.</p>
    <!-- Placeholder: purchase flow not implemented yet -->
    <button class="btn alt" @click="notify('Buying extra shakes is coming soon')">🛒 Buy extra shake</button>
  </div>

  <div v-if="searching" class="modal">
    <div class="card">
      <div class="spinner"></div>
      <h2 style="font-size: 18px">Searching…</h2>
      <p class="sub">Looking for an opponent</p>
      <button class="btn alt" @click="cancelSearch">Cancel</button>
    </div>
  </div>

  <div v-if="roomCode" class="modal">
    <div class="card">
      <div class="spinner"></div>
      <h2 style="font-size: 18px">Waiting for a friend…</h2>
      <p class="sub">Share this room code</p>
      <div class="code-row">
        <span class="status fd code-text">{{ roomCode }}</span>
        <button class="copy" :title="copied ? 'Copied' : 'Copy code'" aria-label="Copy room code" @click="copyCode">
          <svg v-if="!copied" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
      <button class="btn alt" @click="cancelRoom">Cancel room</button>
    </div>
  </div>

  <div v-if="showJoin" class="modal" @click.self="showJoin = false">
    <div class="card">
      <h2 style="font-size: 18px">Join private room</h2>
      <p class="sub">Enter the 5-character room code.</p>
      <input class="in code" v-model="code" maxlength="5" placeholder="ROOM CODE" autofocus @keyup.enter="submitJoin" />
      <button class="btn" :disabled="!code.trim()" @click="submitJoin">Join</button>
      <button class="btn alt" @click="showJoin = false">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.spinner {
  width: 48px;
  height: 48px;
  margin: 4px auto 14px;
  border: 5px solid var(--line);
  border-top-color: var(--acc);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.code-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 6px 0; }
.code-text { font-size: 34px; letter-spacing: 8px; padding-left: 8px; }
.copy { width: 40px; height: 40px; flex: none; display: grid; place-items: center; border-radius: 10px; border: 2px solid var(--line); background: #2c2745; color: var(--txt); cursor: pointer; }
.copy:active { transform: scale(0.94); }
@keyframes spin { to { transform: rotate(360deg); } }
</style>