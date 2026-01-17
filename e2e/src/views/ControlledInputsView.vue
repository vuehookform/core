<template>
  <div class="form-page">
    <h1>Controlled Inputs (PrimeVue)</h1>

    <form
      :key="formKey"
      data-testid="controlled-form"
      @submit.prevent="form.handleSubmit(onSubmit, onSubmitError)($event)"
    >
      <div class="field">
        <label for="country">Country</label>
        <Select
          id="country"
          v-model="form.register('country', { controlled: true }).value!.value"
          :options="countries"
          option-label="name"
          option-value="code"
          placeholder="Select a country"
          data-testid="country-dropdown"
          :class="{ 'p-invalid': form.formState.value.errors.country }"
          @blur="form.register('country', { controlled: true }).onBlur()"
        />
        <Message
          v-if="form.formState.value.errors.country"
          severity="error"
          data-testid="country-error"
        >
          {{ form.formState.value.errors.country }}
        </Message>
      </div>

      <div class="field">
        <label for="birthDate">Birth Date</label>
        <DatePicker
          id="birthDate"
          v-model="form.register('birthDate', { controlled: true }).value!.value"
          date-format="yy-mm-dd"
          data-testid="birthdate-calendar"
          :class="{ 'p-invalid': form.formState.value.errors.birthDate }"
          @blur="form.register('birthDate', { controlled: true }).onBlur()"
        />
        <Message
          v-if="form.formState.value.errors.birthDate"
          severity="error"
          data-testid="birthdate-error"
        >
          {{ form.formState.value.errors.birthDate }}
        </Message>
      </div>

      <div class="field">
        <label for="age">Age</label>
        <InputNumber
          id="age"
          v-model="form.register('age', { controlled: true }).value!.value"
          data-testid="age-input"
          :class="{ 'p-invalid': form.formState.value.errors.age }"
          @blur="form.register('age', { controlled: true }).onBlur()"
        />
        <Message v-if="form.formState.value.errors.age" severity="error" data-testid="age-error">
          {{ form.formState.value.errors.age }}
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
import { z } from 'zod'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useFormSubmission } from '../composables/useFormSubmission'
import { useFormWithGlobalMode } from '../composables/useFormWithGlobalMode'

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

const { form, formKey } = useFormWithGlobalMode({
  schema,
  defaultValues: { country: '', birthDate: undefined, age: undefined },
})

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()

const onSubmit = (data: FormValues) => onSubmitSuccess(data)
</script>
