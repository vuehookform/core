<template>
  <div class="form-page">
    <h1>Form State Tracking</h1>

    <form
      :key="formKey"
      data-testid="form-state-form"
      @submit.prevent="form.handleSubmit(onSubmit, onSubmitError)($event)"
    >
      <div class="field">
        <label for="username">Username</label>
        <InputText
          id="username"
          v-bind="form.register('username')"
          data-testid="username-input"
          :class="{ 'p-invalid': form.formState.value.errors.username }"
        />
        <Message
          v-if="form.formState.value.errors.username"
          severity="error"
          data-testid="username-error"
        >
          {{ form.formState.value.errors.username }}
        </Message>
      </div>

      <div class="field">
        <label for="email">Email</label>
        <InputText
          id="email"
          v-bind="form.register('email')"
          data-testid="email-input"
          :class="{ 'p-invalid': form.formState.value.errors.email }"
        />
        <Message
          v-if="form.formState.value.errors.email"
          severity="error"
          data-testid="email-error"
        >
          {{ form.formState.value.errors.email }}
        </Message>
      </div>

      <div class="field">
        <label for="bio">Bio (optional)</label>
        <InputText id="bio" v-bind="form.register('bio')" data-testid="bio-input" />
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
            <td data-testid="state-is-dirty">{{ form.formState.value.isDirty }}</td>
          </tr>
          <tr>
            <td><strong>isValid:</strong></td>
            <td data-testid="state-is-valid">{{ form.formState.value.isValid }}</td>
          </tr>
          <tr>
            <td><strong>isSubmitting:</strong></td>
            <td data-testid="state-is-submitting">{{ form.formState.value.isSubmitting }}</td>
          </tr>
          <tr>
            <td><strong>isSubmitted:</strong></td>
            <td data-testid="state-is-submitted">{{ form.formState.value.isSubmitted }}</td>
          </tr>
          <tr>
            <td><strong>isSubmitSuccessful:</strong></td>
            <td data-testid="state-is-submit-successful">
              {{ form.formState.value.isSubmitSuccessful }}
            </td>
          </tr>
          <tr>
            <td><strong>submitCount:</strong></td>
            <td data-testid="state-submit-count">{{ form.formState.value.submitCount }}</td>
          </tr>
          <tr>
            <td><strong>isLoading:</strong></td>
            <td data-testid="state-is-loading">{{ form.formState.value.isLoading }}</td>
          </tr>
          <tr>
            <td><strong>dirtyFields:</strong></td>
            <td data-testid="state-dirty-fields">
              {{ Object.keys(form.formState.value.dirtyFields).join(', ') || 'none' }}
            </td>
          </tr>
          <tr>
            <td><strong>touchedFields:</strong></td>
            <td data-testid="state-touched-fields">
              {{ Object.keys(form.formState.value.touchedFields).join(', ') || 'none' }}
            </td>
          </tr>
          <tr>
            <td><strong>errors:</strong></td>
            <td data-testid="state-errors">
              {{ Object.keys(form.formState.value.errors).join(', ') || 'none' }}
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
import type { FieldState } from '@vuehookform/core'
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useFormSubmission } from '../composables/useFormSubmission'
import { useFormWithGlobalMode } from '../composables/useFormWithGlobalMode'

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.email('Invalid email'),
  bio: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const { form, formKey } = useFormWithGlobalMode({
  schema,
  defaultValues: { username: '', email: '', bio: '' },
})

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()
const fieldStateSnapshot = ref<FieldState | null>(null)

const onSubmit = (data: FormValues) => onSubmitSuccess(data)

const captureUsernameState = () => {
  fieldStateSnapshot.value = form.value.getFieldState('username')
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
