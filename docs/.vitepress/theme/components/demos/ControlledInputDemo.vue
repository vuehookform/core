<template>
  <div class="demo-form">
    <form autocomplete="off" @submit.prevent="handleSubmit(onSubmit)($event)">
      <div class="field">
        <label for="controlled-country">Country (select)</label>
        <select
          id="controlled-country"
          autocomplete="off"
          v-model="countryValue"
          v-bind="countryBindings"
          :class="{ 'has-error': formState.errors.country }"
        >
          <option value="" disabled>Select a country</option>
          <option v-for="c in countries" :key="c.code" :value="c.code">
            {{ c.name }}
          </option>
        </select>
        <span v-if="formState.errors.country" class="error-message">
          {{ formState.errors.country }}
        </span>
      </div>

      <div class="field">
        <label for="controlled-age">Age (number)</label>
        <input
          id="controlled-age"
          type="number"
          autocomplete="off"
          v-model="ageValue"
          v-bind="ageBindings"
          placeholder="18"
          :class="{ 'has-error': formState.errors.age }"
        />
        <span v-if="formState.errors.age" class="error-message">
          {{ formState.errors.age }}
        </span>
      </div>

      <div class="field">
        <label for="controlled-bio">Bio (textarea)</label>
        <textarea
          id="controlled-bio"
          autocomplete="off"
          v-model="bioValue"
          v-bind="bioBindings"
          rows="3"
          placeholder="Tell us about yourself..."
          :class="{ 'has-error': formState.errors.bio }"
        />
        <span v-if="formState.errors.bio" class="error-message">
          {{ formState.errors.bio }}
        </span>
      </div>

      <button type="submit" :disabled="formState.isSubmitting">Submit</button>
    </form>

    <div v-if="submittedData" class="demo-result">
      <h4>Submitted Data:</h4>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>

    <div class="demo-state">
      <ul>
        <li>
          Current values:
          <code>{{ JSON.stringify({ country: countryValue, age: ageValue }) }}</code>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'
import { useToast } from '../../composables/useToast'

const schema = z.object({
  country: z.string().min(1, 'Please select a country'),
  age: z.coerce.number({ message: 'Age is required' }).min(18, 'Must be at least 18'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
})

type FormValues = z.infer<typeof schema>

const countries = [
  { name: 'United States', code: 'US' },
  { name: 'United Kingdom', code: 'UK' },
  { name: 'Germany', code: 'DE' },
  { name: 'France', code: 'FR' },
]

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
  defaultValues: { country: '', age: undefined as number | undefined, bio: '' },
})

// Controlled inputs - use v-model
const { value: countryValue, ...countryBindings } = register('country', { controlled: true })
const { value: ageValue, ...ageBindings } = register('age', { controlled: true })
const { value: bioValue, ...bioBindings } = register('bio', { controlled: true })

const submittedData = ref<FormValues | null>(null)
const toast = useToast()

const onSubmit = (data: FormValues) => {
  submittedData.value = data
  toast.success('Form submitted successfully!')
}
</script>

<style scoped>
textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-family: inherit;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  resize: vertical;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

textarea.has-error {
  border-color: #ef4444;
}

textarea.has-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}
</style>
