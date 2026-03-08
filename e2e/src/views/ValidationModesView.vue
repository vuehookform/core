<template>
  <div class="form-page">
    <h1>Validation Modes</h1>

    <div class="mode-selector">
      <label>Select Validation Mode:</label>
      <Select
        v-model="selectedMode"
        :options="modes"
        option-label="name"
        option-value="value"
        data-testid="mode-selector"
        @change="onModeChange"
      />
    </div>

    <div class="mode-description">
      <p v-if="selectedMode === 'onSubmit'">
        <strong>onSubmit:</strong> Validation only runs when the form is submitted.
      </p>
      <p v-if="selectedMode === 'onBlur'">
        <strong>onBlur:</strong> Validation runs when a field loses focus.
      </p>
      <p v-if="selectedMode === 'onChange'">
        <strong>onChange:</strong> Validation runs on every input change.
      </p>
      <p v-if="selectedMode === 'onTouched'">
        <strong>onTouched:</strong> Validation runs after a field is touched, then on every change.
      </p>
    </div>

    <form
      :key="formKey"
      data-testid="validation-form"
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

      <Button type="submit" label="Submit" data-testid="submit-button" />
    </form>

    <div v-if="submittedData" class="submitted-data" data-testid="submitted-data">
      <h3>Submitted Data:</h3>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>

    <div class="form-state-debug" data-testid="form-state">
      <h3>Form State:</h3>
      <ul>
        <li data-testid="touched-fields">
          Touched:
          {{ Object.keys(form.formState.value.touchedFields).join(', ') || 'none' }}
        </li>
        <li data-testid="error-count">
          Errors: {{ Object.keys(form.formState.value.errors).length }}
        </li>
        <li data-testid="submit-count">Submit Count: {{ form.formState.value.submitCount }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { useForm, type ValidationMode } from '@vuehookform/core'
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Message from 'primevue/message'
import { useFormSubmission } from '../composables/useFormSubmission'

const schema = z.object({
  email: z.email('Invalid email'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
})

type FormValues = z.infer<typeof schema>

const selectedMode = ref<ValidationMode>('onSubmit')
const modes: { name: string; value: ValidationMode }[] = [
  { name: 'onSubmit', value: 'onSubmit' },
  { name: 'onBlur', value: 'onBlur' },
  { name: 'onChange', value: 'onChange' },
  { name: 'onTouched', value: 'onTouched' },
]

const formKey = ref(0)

const createForm = (mode: ValidationMode) => {
  return useForm({
    schema,
    mode,
    defaultValues: { email: '', username: '' },
  })
}

const form = shallowRef(createForm(selectedMode.value))

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()

const onModeChange = () => {
  form.value = createForm(selectedMode.value)
  formKey.value++
  submittedData.value = null
}

const onSubmit = (data: FormValues) => onSubmitSuccess(data)
</script>
