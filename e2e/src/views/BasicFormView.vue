<template>
  <div class="form-page">
    <h1>Basic Form Registration</h1>

    <form
      :key="formKey"
      data-testid="basic-form"
      @submit.prevent="form.handleSubmit(onSubmit, onSubmitError)($event)"
    >
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
        <label for="name">Name</label>
        <InputText
          id="name"
          v-bind="form.register('name')"
          data-testid="name-input"
          :class="{ 'p-invalid': form.formState.value.errors.name }"
        />
        <Message v-if="form.formState.value.errors.name" severity="error" data-testid="name-error">
          {{ form.formState.value.errors.name }}
        </Message>
      </div>

      <div class="field">
        <label for="password">Password</label>
        <Password
          id="password"
          v-bind="form.register('password')"
          data-testid="password-input"
          :feedback="false"
          :class="{ 'p-invalid': form.formState.value.errors.password }"
        />
        <Message
          v-if="form.formState.value.errors.password"
          severity="error"
          data-testid="password-error"
        >
          {{ form.formState.value.errors.password }}
        </Message>
      </div>

      <Button
        type="submit"
        label="Submit"
        data-testid="submit-button"
        :loading="form.formState.value.isSubmitting"
      />
    </form>

    <div v-if="submittedData" class="submitted-data" data-testid="submitted-data">
      <h3>Submitted Data:</h3>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>

    <div class="form-state-debug" data-testid="form-state">
      <h3>Form State:</h3>
      <ul>
        <li data-testid="is-dirty">isDirty: {{ form.formState.value.isDirty }}</li>
        <li data-testid="is-valid">isValid: {{ form.formState.value.isValid }}</li>
        <li data-testid="submit-count">submitCount: {{ form.formState.value.submitCount }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useFormSubmission } from '../composables/useFormSubmission'
import { useFormWithGlobalMode } from '../composables/useFormWithGlobalMode'

const schema = z.object({
  email: z.email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

type FormValues = z.infer<typeof schema>

const { form, formKey } = useFormWithGlobalMode({
  schema,
  defaultValues: { email: '', password: '', name: '' },
})

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()

const onSubmit = (data: FormValues) => onSubmitSuccess(data)
</script>
