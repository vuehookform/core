<template>
  <div class="form-page">
    <h1>useController Demo</h1>

    <form
      :key="formKey"
      data-testid="controller-form"
      @submit.prevent="form.handleSubmit(onSubmit, onSubmitError)($event)"
    >
      <div class="field">
        <label for="firstName">First Name</label>
        <InputText
          id="firstName"
          v-model="firstNameController.field.value.value"
          data-testid="firstname-input"
          :class="{ 'p-invalid': firstNameController.fieldState.value.error }"
          @blur="firstNameController.field.onBlur"
        />
        <Message
          v-if="firstNameController.fieldState.value.error"
          severity="error"
          data-testid="firstname-error"
        >
          {{ firstNameController.fieldState.value.error }}
        </Message>
        <div class="field-state" data-testid="firstname-state">
          <span>isDirty: {{ firstNameController.fieldState.value.isDirty }}</span>
          <span>isTouched: {{ firstNameController.fieldState.value.isTouched }}</span>
        </div>
      </div>

      <div class="field">
        <label for="lastName">Last Name</label>
        <InputText
          id="lastName"
          v-model="lastNameController.field.value.value"
          data-testid="lastname-input"
          :class="{ 'p-invalid': lastNameController.fieldState.value.error }"
          @blur="lastNameController.field.onBlur"
        />
        <Message
          v-if="lastNameController.fieldState.value.error"
          severity="error"
          data-testid="lastname-error"
        >
          {{ lastNameController.fieldState.value.error }}
        </Message>
        <div class="field-state" data-testid="lastname-state">
          <span>isDirty: {{ lastNameController.fieldState.value.isDirty }}</span>
          <span>isTouched: {{ lastNameController.fieldState.value.isTouched }}</span>
        </div>
      </div>

      <div class="field">
        <label for="email">Email</label>
        <InputText
          id="email"
          v-model="emailController.field.value.value"
          data-testid="email-input"
          :class="{ 'p-invalid': emailController.fieldState.value.error }"
          @blur="emailController.field.onBlur"
        />
        <Message
          v-if="emailController.fieldState.value.error"
          severity="error"
          data-testid="email-error"
        >
          {{ emailController.fieldState.value.error }}
        </Message>
        <div class="field-state" data-testid="email-state">
          <span>isDirty: {{ emailController.fieldState.value.isDirty }}</span>
          <span>isTouched: {{ emailController.fieldState.value.isTouched }}</span>
        </div>
      </div>

      <Button type="submit" label="Submit" data-testid="submit-button" />
    </form>

    <div v-if="submittedData" class="submitted-data" data-testid="submitted-data">
      <h3>Submitted Data:</h3>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, computed } from 'vue'
import { useController, provideForm } from '@vuehookform/core'
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useFormSubmission } from '../composables/useFormSubmission'
import { useFormWithGlobalMode } from '../composables/useFormWithGlobalMode'

const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.email('Invalid email'),
})

type FormValues = z.infer<typeof schema>

const { form, formKey } = useFormWithGlobalMode({
  schema,
  defaultValues: { firstName: '', lastName: '', email: '' },
})

// Provide form to child components, update when form is recreated
provideForm(form.value)
watch(form, (newForm) => provideForm(newForm))

// Controllers need to be computed to update when form is recreated
const firstNameController = computed(() =>
  useController({
    name: 'firstName',
    control: form.value,
  }),
)

const lastNameController = computed(() =>
  useController({
    name: 'lastName',
    control: form.value,
  }),
)

const emailController = computed(() =>
  useController({
    name: 'email',
    control: form.value,
  }),
)

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()

const onSubmit = (data: FormValues) => onSubmitSuccess(data)
</script>
