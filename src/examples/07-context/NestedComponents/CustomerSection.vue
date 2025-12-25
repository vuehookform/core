<template>
  <fieldset class="section">
    <legend class="section__title">Customer Information</legend>

    <div class="field-group">
      <label class="label">Full Name *</label>
      <input
        type="text"
        placeholder="John Doe"
        :class="['input', errors.name && 'input--error']"
        v-bind="register('customer.name')"
      />
      <span v-if="errors.name" class="error">
        {{ errors.name }}
      </span>
    </div>

    <div class="field-group">
      <label class="label">Email *</label>
      <input
        type="email"
        placeholder="john@example.com"
        :class="['input', errors.email && 'input--error']"
        v-bind="register('customer.email')"
      />
      <span v-if="errors.email" class="error">
        {{ errors.email }}
      </span>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormContext } from '../../../lib'
import type { OrderSchema } from './schema'

// Access form context - works at ANY depth!
const { register, formState } = useFormContext<OrderSchema>()

// Type-safe error access for nested fields
const errors = computed(() => {
  const customerErrors = formState.value.errors.customer
  if (typeof customerErrors === 'object' && customerErrors !== null) {
    return customerErrors as { name?: unknown; email?: unknown }
  }
  return { name: undefined, email: undefined }
})
</script>

<style scoped>
.section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.25rem;
  background: #fafafa;
}

.section__title {
  color: #42b883;
  font-weight: 600;
  font-size: 1rem;
  padding: 0 0.5rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.field-group:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}

.input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.input--error {
  border-color: #e74c3c;
}

.error {
  color: #e74c3c;
  font-size: 0.85rem;
}
</style>
