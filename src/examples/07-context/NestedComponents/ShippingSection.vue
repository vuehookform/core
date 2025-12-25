<template>
  <fieldset class="section">
    <legend class="section__title">Shipping Details</legend>

    <div class="field-group">
      <label class="label">Street Address *</label>
      <input
        type="text"
        placeholder="123 Main St"
        :class="['input', errors.address && 'input--error']"
        v-bind="register('shipping.address')"
      />
      <span v-if="errors.address" class="error">
        {{ errors.address }}
      </span>
    </div>

    <div class="field-group">
      <label class="label">City *</label>
      <input
        type="text"
        placeholder="New York"
        :class="['input', errors.city && 'input--error']"
        v-bind="register('shipping.city')"
      />
      <span v-if="errors.city" class="error">
        {{ errors.city }}
      </span>
    </div>

    <div class="field-group field-group--checkbox">
      <input type="checkbox" id="express" v-bind="register('shipping.express')" />
      <label for="express" class="checkbox-label">Express Shipping (+$15)</label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormContext } from '../../../lib'
import type { OrderSchema } from './schema'

const { register, formState } = useFormContext<OrderSchema>()

// Type-safe error access for nested fields
const errors = computed(() => {
  const shippingErrors = formState.value.errors.shipping
  if (typeof shippingErrors === 'object' && shippingErrors !== null) {
    return shippingErrors as { address?: unknown; city?: unknown }
  }
  return { address: undefined, city: undefined }
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

.field-group--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}

.checkbox-label {
  font-size: 0.9rem;
  color: #374151;
  cursor: pointer;
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
