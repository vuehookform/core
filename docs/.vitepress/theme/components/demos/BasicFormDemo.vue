<template>
  <div class="demo-form">
    <form autocomplete="off" @submit.prevent="handleSubmit(onSubmit)($event)">
      <div class="field">
        <label for="basic-email">Email</label>
        <input
          id="basic-email"
          type="email"
          autocomplete="off"
          v-bind="register('email')"
          placeholder="you@example.com"
          :class="{ 'has-error': formState.errors.email }"
        />
        <span v-if="formState.errors.email" class="error-message">
          {{ formState.errors.email }}
        </span>
      </div>

      <div class="field">
        <label for="basic-name">Name</label>
        <input
          id="basic-name"
          autocomplete="off"
          v-bind="register('name')"
          placeholder="John Doe"
          :class="{ 'has-error': formState.errors.name }"
        />
        <span v-if="formState.errors.name" class="error-message">
          {{ formState.errors.name }}
        </span>
      </div>

      <div class="field">
        <label for="basic-password">Password</label>
        <input
          id="basic-password"
          type="password"
          autocomplete="new-password"
          v-bind="register('password')"
          placeholder="Min 8 characters"
          :class="{ 'has-error': formState.errors.password }"
        />
        <span v-if="formState.errors.password" class="error-message">
          {{ formState.errors.password }}
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
          isDirty: <code>{{ formState.isDirty }}</code>
        </li>
        <li>
          isValid: <code>{{ formState.isValid }}</code>
        </li>
        <li>
          submitCount: <code>{{ formState.submitCount }}</code>
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
  email: z.string().email('Please enter a valid email'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
  defaultValues: { email: '', name: '', password: '' },
})

const submittedData = ref<FormValues | null>(null)
const toast = useToast()

const onSubmit = (data: FormValues) => {
  submittedData.value = data
  toast.success('Form submitted successfully!')
}
</script>
