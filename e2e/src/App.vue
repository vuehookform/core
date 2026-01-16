<template>
  <Toast position="top-right" />
  <div class="app-container">
    <nav class="sidebar">
      <h2>Vue Hook Form E2E</h2>
      <ul>
        <li><RouterLink to="/basic">Basic Form</RouterLink></li>
        <li><RouterLink to="/controlled">Controlled Inputs</RouterLink></li>
        <li><RouterLink to="/validation-modes">Validation Modes</RouterLink></li>
        <li><RouterLink to="/field-arrays">Field Arrays</RouterLink></li>
        <li><RouterLink to="/nested">Nested Fields</RouterLink></li>
        <li><RouterLink to="/use-controller">useController</RouterLink></li>
        <li><RouterLink to="/form-context">Form Context</RouterLink></li>
        <li><RouterLink to="/form-state">Form State</RouterLink></li>
        <li><RouterLink to="/reset-setvalue">Reset & setValue</RouterLink></li>
      </ul>
    </nav>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import Toast from 'primevue/toast'
</script>
