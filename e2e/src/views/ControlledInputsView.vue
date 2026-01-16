<template>
  <div class="form-page">
    <h1>Controlled Inputs (PrimeVue)</h1>

    <form
      data-testid="controlled-form"
      @submit.prevent="handleSubmit(onSubmit, onSubmitError)($event)"
    >
      <div class="field">
        <label for="country">Country</label>
        <Select
          id="country"
          v-model="countryValue"
          :options="countries"
          option-label="name"
          option-value="code"
          placeholder="Select a country"
          data-testid="country-dropdown"
          :class="{ 'p-invalid': formState.errors.country }"
          @blur="handleCountryBlur"
        />
        <Message v-if="formState.errors.country" severity="error" data-testid="country-error">
          {{ formState.errors.country }}
        </Message>
      </div>

      <div class="field">
        <label for="birthDate">Birth Date</label>
        <DatePicker
          id="birthDate"
          v-model="birthDateValue"
          date-format="yy-mm-dd"
          data-testid="birthdate-calendar"
          :class="{ 'p-invalid': formState.errors.birthDate }"
          @blur="handleBirthDateBlur"
        />
        <Message v-if="formState.errors.birthDate" severity="error" data-testid="birthdate-error">
          {{ formState.errors.birthDate }}
        </Message>
      </div>

      <div class="field">
        <label for="age">Age</label>
        <InputNumber
          id="age"
          v-model="ageValue"
          data-testid="age-input"
          :class="{ 'p-invalid': formState.errors.age }"
          @blur="handleAgeBlur"
        />
        <Message v-if="formState.errors.age" severity="error" data-testid="age-error">
          {{ formState.errors.age }}
        </Message>
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
import { useForm } from '@vuehookform/core'
import { z } from 'zod'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useFormSubmission } from '../composables/useFormSubmission'

const schema = z.object({
  country: z.string().min(1, 'Please select a country'),
  birthDate: z.date({ message: 'Please select a birth date' }),
  age: z.number({ message: 'Age is required' }).min(18, 'Must be at least 18 years old'),
})

type FormValues = z.infer<typeof schema>

const countries = [
  { name: 'United States', code: 'US' },
  { name: 'United Kingdom', code: 'UK' },
  { name: 'Germany', code: 'DE' },
  { name: 'France', code: 'FR' },
]

const { register, handleSubmit, formState } = useForm({
  schema,
  defaultValues: { country: '', birthDate: undefined, age: undefined },
})

const countryField = register('country', { controlled: true })
const birthDateField = register('birthDate', { controlled: true })
const ageField = register('age', { controlled: true })

// Extract values with non-null assertion (safe because controlled: true guarantees existence)
const countryValue = countryField.value!
const birthDateValue = birthDateField.value!
const ageValue = ageField.value!

// Blur handlers that create synthetic events (PrimeVue emits custom event types)
const handleCountryBlur = () => countryField.onBlur(new Event('blur'))
const handleBirthDateBlur = () => birthDateField.onBlur(new Event('blur'))
const handleAgeBlur = () => ageField.onBlur(new Event('blur'))

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()

const onSubmit = (data: FormValues) => onSubmitSuccess(data)
</script>
