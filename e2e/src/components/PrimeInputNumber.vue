<template>
  <div class="field">
    <label v-if="label" :for="fieldId">{{ label }}</label>
    <InputNumber
      :id="fieldId"
      v-model="model"
      :class="{ 'p-invalid': !!error }"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      :min-fraction-digits="minFractionDigits"
      :max-fraction-digits="maxFractionDigits"
      :prefix="prefix"
      :suffix="suffix"
      :currency="currency"
      :mode="mode"
      :locale="locale"
      :disabled="disabled"
      :data-testid="testId ? `${testId}-input` : undefined"
    />
    <small v-if="error" class="p-error" :data-testid="testId ? `${testId}-error` : undefined">
      {{ error }}
    </small>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InputNumber from 'primevue/inputnumber'

const props = withDefaults(
  defineProps<{
    /** Label text displayed above the input */
    label?: string
    /** HTML id attribute */
    id?: string
    /** External error message for standalone validation */
    error?: string
    /** Placeholder text */
    placeholder?: string
    /** Minimum allowed value */
    min?: number
    /** Maximum allowed value */
    max?: number
    /** Minimum number of fraction digits */
    minFractionDigits?: number
    /** Maximum number of fraction digits */
    maxFractionDigits?: number
    /** Prefix text (e.g., '$') */
    prefix?: string
    /** Suffix text (e.g., '%') */
    suffix?: string
    /** Currency code for currency mode (e.g., 'USD') */
    currency?: string
    /** Input mode: 'decimal' or 'currency' */
    mode?: 'decimal' | 'currency'
    /** Locale for formatting (e.g., 'en-US') */
    locale?: string
    /** Disable the input */
    disabled?: boolean
    /** data-testid prefix for testing */
    testId?: string
  }>(),
  {
    mode: 'decimal',
  },
)

const model = defineModel<number | null>()

const fieldId = computed(() => props.id ?? undefined)
</script>
