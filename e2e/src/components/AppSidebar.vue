<template>
  <nav class="sidebar">
    <h2>Vue Hook Form E2E</h2>
    <ul>
      <li v-for="link in navLinks" :key="link.to">
        <RouterLink :to="link.to">{{ link.label }}</RouterLink>
      </li>
    </ul>

    <div class="sidebar-settings">
      <h3>Settings</h3>
      <div class="mode-selector">
        <label>Validation Mode:</label>
        <Select
          v-model="globalMode"
          :options="VALIDATION_MODES"
          option-label="name"
          option-value="value"
          data-testid="global-mode-selector"
        />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Select from 'primevue/select'
import { useGlobalValidationMode, VALIDATION_MODES } from '../composables/useGlobalValidationMode'

interface NavLink {
  to: string
  label: string
}

const navLinks: NavLink[] = [
  { to: '/basic', label: 'Basic Form' },
  { to: '/controlled', label: 'Controlled Inputs' },
  { to: '/validation-modes', label: 'Validation Modes' },
  { to: '/field-arrays', label: 'Field Arrays' },
  { to: '/nested', label: 'Nested Fields' },
  { to: '/use-controller', label: 'useController' },
  { to: '/form-context', label: 'Form Context' },
  { to: '/form-state', label: 'Form State' },
  { to: '/reset-setvalue', label: 'Reset & setValue' },
  { to: '/prime-input-number', label: 'PrimeInputNumber' },
]

const globalMode = useGlobalValidationMode()
</script>
