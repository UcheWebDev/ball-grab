<script setup>
import { onMounted } from 'vue'
import { user, ready, avatar, displayName, needsSetup, initAuth, signOut } from './composables/useAuth'
import { G, leave } from './composables/useGame'
import { toast } from './composables/useToast'
import './composables/useStage'
import AuthView from './components/AuthView.vue'
import LobbyView from './components/LobbyView.vue'
import GameView from './components/GameView.vue'
import SetupView from './components/SetupView.vue'
import Portrait from './components/Portrait.vue'

onMounted(initAuth)
const logout = async () => { leave(); await signOut() }
</script>

<template>
  <div class="app">
    <div class="top">
      <h1 class="fd" style="font-size: 20px">🏀 BALL GRAB BATTLE</h1>
      <div v-if="user" class="chip">
        <Portrait :id="avatar" team="R" :size="34" /><span>{{ displayName }}</span>
        <button class="link" @click="logout">Sign out</button>
      </div>
    </div>
    <template v-if="ready">
      <AuthView v-if="!user" />
      <SetupView v-else-if="needsSetup" />
      <GameView v-else-if="G" />
      <LobbyView v-else />
    </template>
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>