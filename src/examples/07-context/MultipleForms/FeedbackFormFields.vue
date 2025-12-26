<template>
  <div class="form-fields">
    <div class="field-group">
      <label class="label">Rating</label>
      <div class="rating-group">
        <label v-for="n in 5" :key="n" class="rating-option">
          <input type="radio" :value="n" v-bind="register('rating')" />
          <span class="rating-star">{{ n }}</span>
        </label>
      </div>
      <span v-if="formState.errors.rating" class="error">
        {{ formState.errors.rating }}
      </span>
    </div>

    <div class="field-group">
      <label class="label">Category</label>
      <select
        :class="['input', formState.errors.category && 'input--error']"
        v-bind="register('category')"
      >
        <option value="">Select a category...</option>
        <option value="bug">Bug Report</option>
        <option value="feature">Feature Request</option>
        <option value="other">Other</option>
      </select>
      <span v-if="formState.errors.category" class="error">
        {{ formState.errors.category }}
      </span>
    </div>

    <div class="field-group">
      <label class="label">Comment</label>
      <textarea
        rows="3"
        placeholder="Tell us more..."
        :class="['input', formState.errors.comment && 'input--error']"
        v-bind="commentBinding"
      />
      <span v-if="formState.errors.comment" class="error">
        {{ formState.errors.comment }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFormContext } from '../../../lib'
import type { FeedbackSchema } from './schema'

const { register, formState } = useFormContext<FeedbackSchema>()

// Textarea binding - cast to avoid Vue template type inference issue with textarea
const commentBinding = register('comment') as unknown as Record<string, unknown>
</script>

<style scoped>
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
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
  font-family: inherit;
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

.rating-group {
  display: flex;
  gap: 0.5rem;
}

.rating-option {
  cursor: pointer;
}

.rating-option input {
  margin-right: 0.25rem;
}

.rating-star {
  font-weight: 600;
}
</style>
