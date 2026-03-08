<template>
  <div class="demo-form">
    <div class="demo-mode-selector">
      <label for="validation-mode">Validation Mode:</label>
      <select id="validation-mode" v-model="selectedMode" @change="onModeChange">
        <option v-for="mode in modes" :key="mode.value" :value="mode.value">
          {{ mode.name }}
        </option>
      </select>
      <p class="demo-mode-description">
        {{ modes.find((m) => m.value === selectedMode)?.description }}
      </p>
    </div>

    <form :key="formKey" autocomplete="off" @submit.prevent="form.handleSubmit(onSubmit)($event)">
      <div class="field">
        <label for="validation-email">Email</label>
        <input
          id="validation-email"
          type="email"
          autocomplete="off"
          v-bind="form.register('email')"
          placeholder="you@example.com"
          :class="{ 'has-error': form.formState.value.errors.email }"
        />
        <span v-if="form.formState.value.errors.email" class="error-message">
          {{ form.formState.value.errors.email }}
        </span>
      </div>

      <div class="field">
        <label for="validation-username">Username</label>
        <input
          id="validation-username"
          autocomplete="off"
          v-bind="form.register('username')"
          placeholder="johndoe"
          :class="{ 'has-error': form.formState.value.errors.username }"
        />
        <span v-if="form.formState.value.errors.username" class="error-message">
          {{ form.formState.value.errors.username }}
        </span>
      </div>

      <button type="submit">Submit</button>
    </form>

    <div v-if="submittedData" class="demo-result">
      <h4>Submitted Data:</h4>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>

    <div class="demo-state">
      <ul>
        <li>
          Touched:
          <code>{{ Object.keys(form.formState.value.touchedFields).join(', ') || 'none' }}</code>
        </li>
        <li>
          Errors: <code>{{ Object.keys(form.formState.value.errors).length }}</code>
        </li>
        <li>
          submitCount: <code>{{ form.formState.value.submitCount }}</code>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { useForm, type ValidationMode } from '@vuehookform/core'
import { z } from 'zod'
import { useToast } from '../../composables/useToast'

const schema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
})

type FormValues = z.infer<typeof schema>

const selectedMode = ref<ValidationMode>('onSubmit')
const modes: { name: string; value: ValidationMode; description: string }[] = [
  {
    name: 'onSubmit',
    value: 'onSubmit',
    description: 'Validation only runs when the form is submitted.',
  },
  { name: 'onBlur', value: 'onBlur', description: 'Validation runs when a field loses focus.' },
  { name: 'onChange', value: 'onChange', description: 'Validation runs on every input change.' },
  {
    name: 'onTouched',
    value: 'onTouched',
    description: 'Validation runs after a field is touched, then on every change.',
  },
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

const submittedData = ref<FormValues | null>(null)
const toast = useToast()

const onModeChange = () => {
  form.value = createForm(selectedMode.value)
  formKey.value++
  submittedData.value = null
}

const onSubmit = (data: FormValues) => {
  submittedData.value = data
  toast.success('Form submitted successfully!')
}
</script>
