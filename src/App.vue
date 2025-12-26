<template>
  <WipBanner />
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import WipBanner from '@/components/landing/WipBanner.vue'
</script>
