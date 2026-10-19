<script setup>
import CharacterPicker from './CharacterPicker.vue'
import { finishSetup } from '../composables/useAuth'
</script>

<template>
  <div class="card">
    <h2 style="font-size: 22px">Create your character</h2>
    <p class="sub">Pick who reaches into the mystery box and choose their clothes.</p>
    <CharacterPicker />
    <button class="btn" @click="finishSetup">Continue to lobby</button>
  </div>
</template>