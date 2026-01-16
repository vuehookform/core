<template>
  <div class="form-page">
    <h1>Reset & setValue</h1>

    <form data-testid="reset-form" @submit.prevent="handleSubmit(onSubmit, onSubmitError)($event)">
      <div class="field">
        <label for="firstName">First Name</label>
        <InputText
          id="firstName"
          v-bind="register('firstName')"
          data-testid="firstname-input"
          :class="{ 'p-invalid': formState.errors.firstName }"
        />
        <Message v-if="formState.errors.firstName" severity="error" data-testid="firstname-error">
          {{ formState.errors.firstName }}
        </Message>
      </div>

      <div class="field">
        <label for="lastName">Last Name</label>
        <InputText
          id="lastName"
          v-bind="register('lastName')"
          data-testid="lastname-input"
          :class="{ 'p-invalid': formState.errors.lastName }"
        />
        <Message v-if="formState.errors.lastName" severity="error" data-testid="lastname-error">
          {{ formState.errors.lastName }}
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

      <Button type="submit" label="Submit" data-testid="submit-button" />
    </form>

    <div class="array-controls" style="margin-top: 1.5rem">
      <h3 style="width: 100%; margin: 0 0 0.5rem 0">Reset Actions</h3>
      <Button
        type="button"
        label="Reset to Default"
        severity="secondary"
        data-testid="reset-default"
        @click="handleReset"
      />
      <Button
        type="button"
        label="Reset to Custom Values"
        severity="secondary"
        data-testid="reset-custom"
        @click="handleResetToCustom"
      />
      <Button
        type="button"
        label="Reset First Name Only"
        severity="secondary"
        data-testid="reset-firstname"
        @click="handleResetFirstName"
      />
    </div>

    <div class="array-controls" style="margin-top: 1rem">
      <h3 style="width: 100%; margin: 0 0 0.5rem 0">setValue Actions</h3>
      <Button
        type="button"
        label="Set Email"
        severity="info"
        data-testid="set-email"
        @click="handleSetEmail"
      />
      <Button
        type="button"
        label="Set All Values"
        severity="info"
        data-testid="set-all"
        @click="handleSetAllValues"
      />
      <Button
        type="button"
        label="Get Current Values"
        severity="help"
        data-testid="get-values"
        @click="showCurrentValues"
      />
    </div>

    <div class="form-state-debug" data-testid="form-state">
      <h3>Form State:</h3>
      <ul>
        <li data-testid="is-dirty">isDirty: {{ formState.isDirty }}</li>
        <li data-testid="dirty-fields">
          dirtyFields: {{ Object.keys(formState.dirtyFields).join(', ') || 'none' }}
        </li>
        <li data-testid="submit-count">submitCount: {{ formState.submitCount }}</li>
      </ul>
    </div>

    <div v-if="currentValues" class="submitted-data" data-testid="current-values">
      <h3>Current Values (via getValues):</h3>
      <pre>{{ JSON.stringify(currentValues, null, 2) }}</pre>
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
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.email('Invalid email'),
})

type FormValues = z.infer<typeof schema>

const { register, handleSubmit, formState, reset, resetField, setValue, getValues } = useForm({
  schema,
  defaultValues: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
})

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()
const currentValues = ref<FormValues | null>(null)

const onSubmit = (data: FormValues) => onSubmitSuccess(data)

const handleReset = () => {
  reset()
  submittedData.value = null
}

const handleResetToCustom = () => {
  reset({
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
  })
  submittedData.value = null
}

const handleResetFirstName = () => {
  resetField('firstName')
}

const handleSetEmail = () => {
  setValue('email', 'updated@example.com')
}

const handleSetAllValues = () => {
  setValue('firstName', 'Alice')
  setValue('lastName', 'Wonder')
  setValue('email', 'alice@example.com')
}

const showCurrentValues = () => {
  currentValues.value = getValues()
}
</script>
