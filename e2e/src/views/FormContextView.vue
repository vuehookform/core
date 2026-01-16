<template>
  <div class="form-page">
    <h1>Form Context (provideForm / useFormContext)</h1>

    <p class="mode-description">
      This demonstrates how form context can be shared across deeply nested components using Vue's
      provide/inject pattern.
    </p>

    <form
      data-testid="context-form"
      @submit.prevent="handleSubmit(onSubmit, onSubmitError)($event)"
    >
      <div class="field">
        <label for="parentField">Parent Field (direct register)</label>
        <input
          id="parentField"
          v-bind="register('parentField')"
          data-testid="parent-field"
          :class="{ 'p-invalid': formState.errors.parentField }"
        />
        <small v-if="formState.errors.parentField" class="error" data-testid="parent-field-error">
          {{ formState.errors.parentField }}
        </small>
      </div>

      <div class="nested-component" data-testid="child-component">
        <h3>Child Component</h3>
        <ChildFormField />
      </div>

      <div class="nested-component" data-testid="grandchild-wrapper">
        <h3>Grandchild Component (2 levels deep)</h3>
        <GrandchildFormField />
      </div>

      <Button type="submit" label="Submit" data-testid="submit-button" />
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
        <li data-testid="error-count">Error Count: {{ Object.keys(formState.errors).length }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useForm, provideForm } from '@vuehookform/core'
import { z } from 'zod'
import Button from 'primevue/button'
import ChildFormField from '../components/ChildFormField.vue'
import GrandchildFormField from '../components/GrandchildFormField.vue'
import { formContextSchema } from '../schemas/formContextSchema'
import { useFormSubmission } from '../composables/useFormSubmission'

const schema = formContextSchema

type FormValues = z.infer<typeof schema>

const form = useForm({
  schema,
  defaultValues: {
    parentField: '',
    childField: '',
    grandchildField: '',
  },
})

provideForm(form)

const { register, handleSubmit, formState } = form

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()

const onSubmit = (data: FormValues) => onSubmitSuccess(data)
</script>

<style scoped>
.nested-component {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px dashed #ced4da;
  border-radius: 4px;
  background: #f8f9fa;
}

.nested-component h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #6c757d;
}

.error {
  color: #dc3545;
  font-size: 0.75rem;
}
</style>
