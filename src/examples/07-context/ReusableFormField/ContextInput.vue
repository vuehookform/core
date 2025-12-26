<template>
  <div class="context-input">
    <label :for="id" class="context-input__label">
      {{ label }}
      <span v-if="required" class="context-input__required"> *</span>
    </label>

    <textarea
      v-if="multiline"
      :id="id"
      :rows="rows"
      :placeholder="placeholder"
      :class="['context-input__field', error && 'context-input__field--error']"
      :maxlength="maxLength"
      v-bind="field"
    />
    <input
      v-else
      :id="id"
      :type="type"
      :placeholder="placeholder"
      :class="['context-input__field', error && 'context-input__field--error']"
      :maxlength="maxLength"
      v-bind="field"
    />

    <div class="context-input__footer">
      <span v-if="error" class="context-input__error">{{ error }}</span>
      <span
        v-if="maxLength"
        :class="[
          'context-input__counter',
          currentLength > maxLength && 'context-input__counter--over',
        ]"
      >
        {{ currentLength }}/{{ maxLength }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, useId } from 'vue'
import { useFormContext } from '../../../lib'
import { get } from '../../../lib/utils/paths'
import type { ZodType } from 'zod'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    type?: 'text' | 'email' | 'url' | 'password'
    placeholder?: string
    required?: boolean
    multiline?: boolean
    rows?: number
    maxLength?: number
  }>(),
  {
    type: 'text',
    placeholder: '',
    required: false,
    multiline: false,
    rows: 3,
    maxLength: undefined,
  },
)

// Access form context - works with any schema
// Using ZodType as generic allows this component to be reused
const { register, formState, watch: watchField } = useFormContext<ZodType>()

const id = useId()

// Get field binding from register (cast to avoid Vue template type inference issue with textarea)
const field = computed(() => register(props.name as never) as unknown as Record<string, unknown>)

// Get error using path utility - supports nested fields like 'user.email'
const error = computed(() => {
  const errors = formState.value.errors as Record<string, unknown>
  const err = get(errors, props.name)
  return typeof err === 'string' ? err : undefined
})

// Character counter for maxLength
const currentLength = ref(0)
if (props.maxLength) {
  const watched = watchField(props.name as never)
  watch(
    watched,
    (val: unknown) => {
      currentLength.value = typeof val === 'string' ? val.length : 0
    },
    { immediate: true },
  )
}
</script>

<style scoped>
.context-input {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.context-input__label {
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}

.context-input__required {
  color: #e74c3c;
}

.context-input__field {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  resize: vertical;
}

.context-input__field:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.context-input__field--error {
  border-color: #e74c3c;
}

.context-input__field--error:focus {
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
}

.context-input__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 1.25rem;
}

.context-input__error {
  color: #e74c3c;
  font-size: 0.85rem;
}

.context-input__counter {
  color: #6b7280;
  font-size: 0.8rem;
  margin-left: auto;
}

.context-input__counter--over {
  color: #e74c3c;
  font-weight: 600;
}
</style>
