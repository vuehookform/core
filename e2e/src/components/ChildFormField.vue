<template>
  <div class="field">
    <label for="childField">Child Field (via useFormContext)</label>
    <input
      id="childField"
      v-bind="register('childField')"
      data-testid="child-field"
      :class="{ 'p-invalid': formState.errors.childField }"
    />
    <small v-if="formState.errors.childField" class="error" data-testid="child-field-error">
      {{ formState.errors.childField }}
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
