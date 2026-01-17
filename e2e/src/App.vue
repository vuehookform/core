<template>
  <Toast position="top-right" />
  <div class="app-container">
    <AppSidebar />
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import AppSidebar from './components/AppSidebar.vue'
import { provideValidationMode } from './composables/useGlobalValidationMode'

provideValidationMode()
</script>
