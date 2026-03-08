<template>
  <div class="hook-form-field">
    <slot :field="slotField" :field-state="slotFieldState" :error="errorMessage" />
    <small v-if="showError && errorMessage" class="p-error">
      {{ errorMessage }}
    </small>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useController, useFormContext } from '@vuehookform/core'
import type { UseFormReturn } from '@vuehookform/core'
import type { ZodType } from 'zod'

const props = withDefaults(
  defineProps<{
    /** Field name/path in dot notation (e.g., 'age', 'user.score') */
    name: string
    /** Form control from useForm. If not provided, uses useFormContext() */
    control?: UseFormReturn<ZodType>
    /** Whether to show error message below the slot content */
    showError?: boolean
  }>(),
  { showError: true },
)

// Get form control from prop or context
const form = props.control ?? useFormContext()

// Use controller for reactive field management
const { field, fieldState } = useController({
  name: props.name as never,
  control: form,
})

// Slot props - unwrapped values for easier template usage
const slotField = computed(() => ({
  value: field.value.value,
  // Cast onChange to accept any value since slot consumers handle their own types
  onChange: field.onChange as (value: unknown) => void,
  onBlur: field.onBlur,
  name: field.name,
}))

const slotFieldState = computed(() => ({
  isDirty: fieldState.value.isDirty,
  isTouched: fieldState.value.isTouched,
  invalid: !!fieldState.value.error,
  error: fieldState.value.error,
}))

const errorMessage = computed(() => {
  const err = fieldState.value.error
  if (!err) return ''
  return typeof err === 'string' ? err : err.message
})
</script>
