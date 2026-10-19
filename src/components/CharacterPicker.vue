<script setup>
import { computed } from 'vue'
import { LOOKS, lookFor } from '../lib/avatars'
import { avatar, shirt, pants, setAvatar, setOutfit } from '../composables/useAuth'
import CharacterPreview from './CharacterPreview.vue'

const SHIRTS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f8fafc', '#64748b', '#111827']
const PANTS = ['#1e293b', '#334155', '#0f766e', '#7c2d12', '#a16207', '#1d4ed8', '#7e22ce', '#be185d', '#f1f5f9', '#000000']

const outfit = computed(() => ({ shirt: shirt.value, pants: pants.value }))
const current = computed(() => ({ ...lookFor(avatar.value), ...outfit.value }))
</script>

<template>
  <div class="hero-prev">
    <CharacterPreview :look="current" />
    <div>
      <b class="fd" style="font-size: 20px">{{ current.name }}</b>
      <p class="sub">{{ current.body === 'f' ? 'Woman' : 'Man' }} · wearing {{ shirt ? 'your colours' : 'team colours' }}</p>
      <p class="sub">A small team band on the chest always shows Red or Yellow.</p>
    </div>
  </div>

  <div class="lbl">Top / dress colour</div>
  <div class="sw-row">
    <button class="sw auto" :class="{ on: !shirt }" title="Team colour" @click="setOutfit({ shirt: null })">AUTO</button>
    <button v-for="c in SHIRTS" :key="c" class="sw" :class="{ on: shirt === c }" :style="{ background: c }" @click="setOutfit({ shirt: c })"></button>
  </div>

  <div class="lbl">{{ current.body === 'f' ? 'Skirt' : 'Pants' }} colour</div>
  <div class="sw-row">
    <button class="sw auto" :class="{ on: !pants }" title="Default" @click="setOutfit({ pants: null })">AUTO</button>
    <button v-for="c in PANTS" :key="c" class="sw" :class="{ on: pants === c }" :style="{ background: c }" @click="setOutfit({ pants: c })"></button>
  </div>

  <div class="lbl">Character</div>
  <div class="chars">
    <button v-for="l in LOOKS" :key="l.e" :class="{ on: l.e === current.e }" @click="setAvatar(l.e)">
      <CharacterPreview :look="{ ...l, ...outfit }" />
      <span>{{ l.name }}</span>
    </button>
  </div>
</template>