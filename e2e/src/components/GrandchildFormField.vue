<template>
  <div class="field">
    <label for="grandchildField">Grandchild Field (via useFormContext)</label>
    <input
      id="grandchildField"
      v-bind="register('grandchildField')"
      data-testid="grandchild-field"
      :class="{ 'p-invalid': formState.errors.grandchildField }"
    />
    <small
      v-if="formState.errors.grandchildField"
      class="error"
      data-testid="grandchild-field-error"
    >
      {{ formState.errors.grandchildField }}
    </small>
  </div>
</template>

<script setup lang="ts">
import { useFormContext } from '@vuehookform/core'
import type { FormContextSchema } from '../schemas/formContextSchema'

const { register, formState } = useFormContext<FormContextSchema>()
</script>

<style scoped>
.error {
  color: #dc3545;
  font-size: 0.75rem;
}
</style>
