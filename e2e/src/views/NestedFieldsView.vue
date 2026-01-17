<template>
  <div class="form-page">
    <h1>Nested Fields</h1>

    <form
      :key="formKey"
      data-testid="nested-form"
      @submit.prevent="form.handleSubmit(onSubmit, onSubmitError)($event)"
    >
      <h2>User Information</h2>

      <div class="field">
        <label for="firstName">First Name</label>
        <InputText
          id="firstName"
          v-bind="form.register('user.firstName')"
          data-testid="user-firstname"
          :class="{ 'p-invalid': form.getErrors('user.firstName') }"
        />
        <Message
          v-if="form.getErrors('user.firstName')"
          severity="error"
          data-testid="user-firstname-error"
        >
          {{ form.getErrors('user.firstName') }}
        </Message>
      </div>

      <div class="field">
        <label for="lastName">Last Name</label>
        <InputText
          id="lastName"
          v-bind="form.register('user.lastName')"
          data-testid="user-lastname"
          :class="{ 'p-invalid': form.getErrors('user.lastName') }"
        />
        <Message
          v-if="form.getErrors('user.lastName')"
          severity="error"
          data-testid="user-lastname-error"
        >
          {{ form.getErrors('user.lastName') }}
        </Message>
      </div>

      <div class="field">
        <label for="email">Email</label>
        <InputText
          id="email"
          v-bind="form.register('user.contact.email')"
          data-testid="user-email"
          :class="{ 'p-invalid': form.getErrors('user.contact.email') }"
        />
        <Message
          v-if="form.getErrors('user.contact.email')"
          severity="error"
          data-testid="user-email-error"
        >
          {{ form.getErrors('user.contact.email') }}
        </Message>
      </div>

      <div class="field">
        <label for="phone">Phone</label>
        <InputText
          id="phone"
          v-bind="form.register('user.contact.phone')"
          data-testid="user-phone"
          :class="{ 'p-invalid': form.getErrors('user.contact.phone') }"
        />
        <Message
          v-if="form.getErrors('user.contact.phone')"
          severity="error"
          data-testid="user-phone-error"
        >
          {{ form.getErrors('user.contact.phone') }}
        </Message>
      </div>

      <h2>Company Information</h2>

      <div class="field">
        <label for="companyName">Company Name</label>
        <InputText
          id="companyName"
          v-bind="form.register('company.name')"
          data-testid="company-name"
          :class="{ 'p-invalid': form.getErrors('company.name') }"
        />
        <Message
          v-if="form.getErrors('company.name')"
          severity="error"
          data-testid="company-name-error"
        >
          {{ form.getErrors('company.name') }}
        </Message>
      </div>

      <div class="field">
        <label for="street">Street</label>
        <InputText
          id="street"
          v-bind="form.register('company.address.street')"
          data-testid="company-street"
          :class="{ 'p-invalid': form.getErrors('company.address.street') }"
        />
        <Message
          v-if="form.getErrors('company.address.street')"
          severity="error"
          data-testid="company-street-error"
        >
          {{ form.getErrors('company.address.street') }}
        </Message>
      </div>

      <div class="field">
        <label for="city">City</label>
        <InputText
          id="city"
          v-bind="form.register('company.address.city')"
          data-testid="company-city"
          :class="{ 'p-invalid': form.getErrors('company.address.city') }"
        />
        <Message
          v-if="form.getErrors('company.address.city')"
          severity="error"
          data-testid="company-city-error"
        >
          {{ form.getErrors('company.address.city') }}
        </Message>
      </div>

      <div class="field">
        <label for="country">Country</label>
        <InputText
          id="country"
          v-bind="form.register('company.address.country')"
          data-testid="company-country"
          :class="{ 'p-invalid': form.getErrors('company.address.country') }"
        />
        <Message
          v-if="form.getErrors('company.address.country')"
          severity="error"
          data-testid="company-country-error"
        >
          {{ form.getErrors('company.address.country') }}
        </Message>
      </div>

      <div style="display: flex; gap: 0.5rem">
        <Button type="submit" label="Submit" data-testid="submit-button" />
        <Button
          type="button"
          label="Show Values"
          severity="secondary"
          data-testid="show-values-button"
          @click="showCurrentValues"
        />
      </div>
    </form>

    <div v-if="submittedData" class="submitted-data" data-testid="submitted-data">
      <h3>Submitted Data:</h3>
      <pre data-testid="submitted-data-json">{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>

    <div v-if="currentValues" class="form-state-debug" data-testid="current-values">
      <h3>Current Values (via getValues):</h3>
      <pre>{{ JSON.stringify(currentValues, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useFormSubmission } from '../composables/useFormSubmission'
import { useFormWithGlobalMode } from '../composables/useFormWithGlobalMode'

const schema = z.object({
  user: z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    contact: z.object({
      email: z.email('Invalid email'),
      phone: z.string().min(10, 'Phone must be at least 10 characters'),
    }),
  }),
  company: z.object({
    name: z.string().min(1, 'Company name is required'),
    address: z.object({
      street: z.string().min(1, 'Street is required'),
      city: z.string().min(1, 'City is required'),
      country: z.string().min(1, 'Country is required'),
    }),
  }),
})

type FormValues = z.infer<typeof schema>

const { form, formKey } = useFormWithGlobalMode({
  schema,
  defaultValues: {
    user: {
      firstName: '',
      lastName: '',
      contact: {
        email: '',
        phone: '',
      },
    },
    company: {
      name: '',
      address: {
        street: '',
        city: '',
        country: '',
      },
    },
  },
})

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()
const currentValues = ref<FormValues | null>(null)

const onSubmit = (data: FormValues) => onSubmitSuccess(data)

const showCurrentValues = () => {
  currentValues.value = form.value.getValues()
}
</script>
