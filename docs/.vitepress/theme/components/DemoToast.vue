<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="toast.state.value.visible"
        class="demo-toast"
        :class="`demo-toast--${toast.state.value.type}`"
        role="alert"
      >
        <span class="demo-toast__message">{{ toast.state.value.message }}</span>
        <button class="demo-toast__close" aria-label="Close" @click="toast.hide">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast'

const toast = useToast()
</script>
