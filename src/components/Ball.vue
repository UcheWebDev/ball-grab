<script setup>defineProps({ x: Number, y: Number, r: Number, c: String })</script>
<template><circle :cx="x" :cy="y" :r="r" :fill="`url(#g${c})`" stroke="rgba(0,0,0,.35)" stroke-width=".8" /></template>
