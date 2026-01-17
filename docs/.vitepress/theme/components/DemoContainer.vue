<template>
  <div class="demo-container">
    <div class="demo-header">
      <span class="demo-title">{{ title || 'Interactive Example' }}</span>
      <button class="demo-toggle" @click="showCode = !showCode">
        {{ showCode ? 'Hide Code' : 'View Code' }}
      </button>
    </div>
    <div class="demo-preview">
      <slot name="preview" />
    </div>
    <div v-show="showCode" class="demo-source">
      <slot name="source" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title?: string
}>()

const showCode = ref(false)
</script>

<style scoped>
.demo-container {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  margin: 1rem 0;
  overflow: hidden;
}

.demo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.demo-title {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
}

.demo-toggle {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  background: transparent;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-toggle:hover {
  background: var(--vp-c-brand-soft);
}

.demo-preview {
  padding: 1.5rem;
}

.demo-source {
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.demo-source :deep(div[class*='language-']) {
  margin: 0;
  border-radius: 0;
}
</style>
