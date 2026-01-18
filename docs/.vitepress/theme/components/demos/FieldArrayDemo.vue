<template>
  <div class="demo-form">
    <form autocomplete="off" @submit.prevent="handleSubmit(onSubmit)($event)">
      <div class="field">
        <label for="array-name">Name</label>
        <input
          id="array-name"
          autocomplete="off"
          v-bind="register('name')"
          placeholder="John Doe"
          :class="{ 'has-error': formState.errors.name }"
        />
        <span v-if="formState.errors.name" class="error-message">
          {{ formState.errors.name }}
        </span>
      </div>

      <h4 style="margin: 1rem 0 0.5rem; font-size: 0.875rem; font-weight: 600">Addresses</h4>

      <div v-for="field in addressFields.value" :key="field.key" class="demo-array-item">
        <h4>Address {{ field.index + 1 }}</h4>

        <div class="field">
          <label>Street</label>
          <input
            autocomplete="off"
            v-bind="register(`addresses.${field.index}.street`)"
            placeholder="123 Main St"
            :class="{ 'has-error': getErrors(`addresses.${field.index}.street`) }"
          />
          <span v-if="getErrors(`addresses.${field.index}.street`)" class="error-message">
            {{ getErrors(`addresses.${field.index}.street`) }}
          </span>
        </div>

        <div class="field">
          <label>City</label>
          <input
            autocomplete="off"
            v-bind="register(`addresses.${field.index}.city`)"
            placeholder="San Francisco"
            :class="{ 'has-error': getErrors(`addresses.${field.index}.city`) }"
          />
          <span v-if="getErrors(`addresses.${field.index}.city`)" class="error-message">
            {{ getErrors(`addresses.${field.index}.city`) }}
          </span>
        </div>

        <button
          type="button"
          class="demo-button demo-button-danger demo-button-sm"
          :disabled="addressFields.value.length <= 1"
          @click="removeAddress(field.index)"
        >
          Remove
        </button>
      </div>

      <div class="demo-array-controls">
        <button type="button" class="demo-button demo-button-secondary" @click="addAddress">
          Add Address
        </button>
      </div>

      <button type="submit" :disabled="formState.isSubmitting">Submit</button>
    </form>

    <div v-if="submittedData" class="demo-result">
      <h4>Submitted Data:</h4>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>

    <div class="demo-state">
      <ul>
        <li>
          Array length: <code>{{ addressFields.value.length }}</code>
        </li>
        <li>
          Keys: <code>{{ addressFields.value.map((f) => f.key).join(', ') }}</code>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'
import { useToast } from '../../composables/useToast'

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
})

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  addresses: z.array(addressSchema).min(1, 'At least one address is required'),
})

type FormValues = z.infer<typeof schema>

const { register, handleSubmit, formState, fields, getErrors } = useForm({
  schema,
  mode: 'onBlur',
  defaultValues: {
    name: '',
    addresses: [{ street: '', city: '' }],
  },
})

const addressFields = fields('addresses', {
  rules: { minLength: { value: 1, message: 'At least one address required' } },
})

const submittedData = ref<FormValues | null>(null)
const toast = useToast()

const onSubmit = (data: FormValues) => {
  submittedData.value = data
  toast.success('Form submitted successfully!')
}

const addAddress = () => {
  addressFields.append({ street: '', city: '' })
}

const removeAddress = (index: number) => {
  addressFields.remove(index)
}
</script>
