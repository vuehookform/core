<template>
  <div class="form-page">
    <h1>Form State Tracking</h1>

    <form
      data-testid="form-state-form"
      @submit.prevent="handleSubmit(onSubmit, onSubmitError)($event)"
    >
      <div class="field">
        <label for="username">Username</label>
        <InputText
          id="username"
          v-bind="register('username')"
          data-testid="username-input"
          :class="{ 'p-invalid': formState.errors.username }"
        />
        <Message v-if="formState.errors.username" severity="error" data-testid="username-error">
          {{ formState.errors.username }}
        </Message>
      </div>

      <div class="field">
        <label for="email">Email</label>
        <InputText
          id="email"
          v-bind="register('email')"
          data-testid="email-input"
          :class="{ 'p-invalid': formState.errors.email }"
        />
        <Message v-if="formState.errors.email" severity="error" data-testid="email-error">
          {{ formState.errors.email }}
        </Message>
      </div>

      <div class="field">
        <label for="bio">Bio (optional)</label>
        <InputText id="bio" v-bind="register('bio')" data-testid="bio-input" />
      </div>

      <div style="display: flex; gap: 0.5rem">
        <Button type="submit" label="Submit" data-testid="submit-button" />
        <Button
          type="button"
          label="Get Username State"
          severity="secondary"
          data-testid="get-field-state-button"
          @click="captureUsernameState"
        />
      </div>
    </form>

    <div class="form-state-debug" data-testid="form-state-panel">
      <h3>Form State (reactive)</h3>
      <table>
        <tbody>
          <tr>
            <td><strong>isDirty:</strong></td>
            <td data-testid="state-is-dirty">{{ formState.isDirty }}</td>
          </tr>
          <tr>
            <td><strong>isValid:</strong></td>
            <td data-testid="state-is-valid">{{ formState.isValid }}</td>
          </tr>
          <tr>
            <td><strong>isSubmitting:</strong></td>
            <td data-testid="state-is-submitting">{{ formState.isSubmitting }}</td>
          </tr>
          <tr>
            <td><strong>isSubmitted:</strong></td>
            <td data-testid="state-is-submitted">{{ formState.isSubmitted }}</td>
          </tr>
          <tr>
            <td><strong>isSubmitSuccessful:</strong></td>
            <td data-testid="state-is-submit-successful">
              {{ formState.isSubmitSuccessful }}
            </td>
          </tr>
          <tr>
            <td><strong>submitCount:</strong></td>
            <td data-testid="state-submit-count">{{ formState.submitCount }}</td>
          </tr>
          <tr>
            <td><strong>isLoading:</strong></td>
            <td data-testid="state-is-loading">{{ formState.isLoading }}</td>
          </tr>
          <tr>
            <td><strong>dirtyFields:</strong></td>
            <td data-testid="state-dirty-fields">
              {{ Object.keys(formState.dirtyFields).join(', ') || 'none' }}
            </td>
          </tr>
          <tr>
            <td><strong>touchedFields:</strong></td>
            <td data-testid="state-touched-fields">
              {{ Object.keys(formState.touchedFields).join(', ') || 'none' }}
            </td>
          </tr>
          <tr>
            <td><strong>errors:</strong></td>
            <td data-testid="state-errors">
              {{ Object.keys(formState.errors).join(', ') || 'none' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="fieldStateSnapshot" class="form-state-debug" data-testid="field-state-snapshot">
      <h3>Username Field State (snapshot via getFieldState)</h3>
      <pre>{{ JSON.stringify(fieldStateSnapshot, null, 2) }}</pre>
    </div>

    <div v-if="submittedData" class="submitted-data" data-testid="submitted-data">
      <h3>Submitted Data:</h3>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useFormSubmission } from '../composables/useFormSubmission'

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.email('Invalid email'),
  bio: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const { register, handleSubmit, formState, getFieldState } = useForm({
  schema,
  mode: 'onBlur',
  defaultValues: { username: '', email: '', bio: '' },
})

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()
const fieldStateSnapshot = ref<ReturnType<typeof getFieldState> | null>(null)

const onSubmit = (data: FormValues) => onSubmitSuccess(data)

const captureUsernameState = () => {
  fieldStateSnapshot.value = getFieldState('username')
}
</script>

<style scoped>
table {
  font-size: 0.875rem;
}

table td {
  padding: 0.25rem 0.5rem 0.25rem 0;
}
</style>
