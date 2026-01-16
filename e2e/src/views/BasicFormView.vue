<template>
  <div class="form-page">
    <h1>Basic Form Registration</h1>

    <form data-testid="basic-form" @submit.prevent="handleSubmit(onSubmit, onSubmitError)($event)">
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
        <label for="name">Name</label>
        <InputText
          id="name"
          v-bind="register('name')"
          data-testid="name-input"
          :class="{ 'p-invalid': formState.errors.name }"
        />
        <Message v-if="formState.errors.name" severity="error" data-testid="name-error">
          {{ formState.errors.name }}
        </Message>
      </div>

      <div class="field">
        <label for="password">Password</label>
        <Password
          id="password"
          v-bind="register('password')"
          data-testid="password-input"
          :feedback="false"
          :class="{ 'p-invalid': formState.errors.password }"
        />
        <Message v-if="formState.errors.password" severity="error" data-testid="password-error">
          {{ formState.errors.password }}
        </Message>
      </div>

      <Button
        type="submit"
        label="Submit"
        data-testid="submit-button"
        :loading="formState.isSubmitting"
      />
    </form>

    <div v-if="submittedData" class="submitted-data" data-testid="submitted-data">
      <h3>Submitted Data:</h3>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>

    <div class="form-state-debug" data-testid="form-state">
      <h3>Form State:</h3>
      <ul>
        <li data-testid="is-dirty">isDirty: {{ formState.isDirty }}</li>
        <li data-testid="is-valid">isValid: {{ formState.isValid }}</li>
        <li data-testid="submit-count">submitCount: {{ formState.submitCount }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useFormSubmission } from '../composables/useFormSubmission'

const schema = z.object({
  email: z.email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

type FormValues = z.infer<typeof schema>

const { register, handleSubmit, formState } = useForm({
  schema,
  defaultValues: { email: '', password: '', name: '' },
})

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()

const onSubmit = (data: FormValues) => onSubmitSuccess(data)
</script>
