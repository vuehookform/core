<template>
  <div class="demo-form">
    <form autocomplete="off" @submit.prevent="form.handleSubmit(onSubmit)($event)">
      <div class="field">
        <label for="controller-firstName">First Name</label>
        <input
          id="controller-firstName"
          autocomplete="off"
          :value="firstNameController.field.value.value"
          :class="{ 'has-error': firstNameController.fieldState.value.error }"
          placeholder="John"
          @input="firstNameController.field.onChange(($event.target as HTMLInputElement).value)"
          @blur="firstNameController.field.onBlur"
        />
        <span v-if="firstNameController.fieldState.value.error" class="error-message">
          {{ firstNameController.fieldState.value.error }}
        </span>
        <div class="field-state-inline">
          <span>isDirty: {{ firstNameController.fieldState.value.isDirty }}</span>
          <span>isTouched: {{ firstNameController.fieldState.value.isTouched }}</span>
        </div>
      </div>

      <div class="field">
        <label for="controller-lastName">Last Name</label>
        <input
          id="controller-lastName"
          autocomplete="off"
          :value="lastNameController.field.value.value"
          :class="{ 'has-error': lastNameController.fieldState.value.error }"
          placeholder="Doe"
          @input="lastNameController.field.onChange(($event.target as HTMLInputElement).value)"
          @blur="lastNameController.field.onBlur"
        />
        <span v-if="lastNameController.fieldState.value.error" class="error-message">
          {{ lastNameController.fieldState.value.error }}
        </span>
        <div class="field-state-inline">
          <span>isDirty: {{ lastNameController.fieldState.value.isDirty }}</span>
          <span>isTouched: {{ lastNameController.fieldState.value.isTouched }}</span>
        </div>
      </div>

      <div class="field">
        <label for="controller-email">Email</label>
        <input
          id="controller-email"
          type="email"
          autocomplete="off"
          :value="emailController.field.value.value"
          :class="{ 'has-error': emailController.fieldState.value.error }"
          placeholder="john@example.com"
          @input="emailController.field.onChange(($event.target as HTMLInputElement).value)"
          @blur="emailController.field.onBlur"
        />
        <span v-if="emailController.fieldState.value.error" class="error-message">
          {{ emailController.fieldState.value.error }}
        </span>
        <div class="field-state-inline">
          <span>isDirty: {{ emailController.fieldState.value.isDirty }}</span>
          <span>isTouched: {{ emailController.fieldState.value.isTouched }}</span>
        </div>
      </div>

      <button type="submit" :disabled="form.formState.value.isSubmitting">Submit</button>
    </form>

    <div v-if="submittedData" class="demo-result">
      <h4>Submitted Data:</h4>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useForm, useController } from '@vuehookform/core'
import { z } from 'zod'
import { useToast } from '../../composables/useToast'

const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
})

type FormValues = z.infer<typeof schema>

const form = useForm({
  schema,
  mode: 'onBlur',
  defaultValues: { firstName: '', lastName: '', email: '' },
})

// useController provides reactive fieldState
const firstNameController = useController({
  name: 'firstName',
  control: form,
})

const lastNameController = useController({
  name: 'lastName',
  control: form,
})

const emailController = useController({
  name: 'email',
  control: form,
})

const submittedData = ref<FormValues | null>(null)
const toast = useToast()

const onSubmit = (data: FormValues) => {
  submittedData.value = data
  toast.success('Form submitted successfully!')
}
</script>

<style scoped>
.field-state-inline {
  display: flex;
  gap: 1rem;
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
}
</style>
