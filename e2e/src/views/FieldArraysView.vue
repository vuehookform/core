<template>
  <div class="form-page">
    <h1>Field Arrays</h1>

    <form
      :key="formKey"
      data-testid="field-array-form"
      @submit.prevent="form.handleSubmit(onSubmit, onSubmitError)($event)"
    >
      <div class="field">
        <label for="name">Name</label>
        <InputText id="name" v-bind="form.register('name')" data-testid="name-input" />
        <Message v-if="form.formState.value.errors.name" severity="error" data-testid="name-error">
          {{ form.formState.value.errors.name }}
        </Message>
      </div>

      <div class="addresses-section">
        <h2>Addresses</h2>

        <div
          v-for="field in form.fields('addresses', {
            rules: { minLength: { value: 1, message: 'At least one address required' } },
          }).value"
          :key="field.key"
          class="address-item"
          :data-testid="`address-${field.index}`"
        >
          <h3>Address {{ field.index + 1 }}</h3>

          <div class="field">
            <label>Street</label>
            <InputText
              v-bind="form.register(`addresses.${field.index}.street`)"
              :data-testid="`street-${field.index}`"
            />
            <Message
              v-if="form.getErrors(`addresses.${field.index}.street`)"
              severity="error"
              :data-testid="`street-error-${field.index}`"
            >
              {{ form.getErrors(`addresses.${field.index}.street`) }}
            </Message>
          </div>

          <div class="field">
            <label>City</label>
            <InputText
              v-bind="form.register(`addresses.${field.index}.city`)"
              :data-testid="`city-${field.index}`"
            />
            <Message
              v-if="form.getErrors(`addresses.${field.index}.city`)"
              severity="error"
              :data-testid="`city-error-${field.index}`"
            >
              {{ form.getErrors(`addresses.${field.index}.city`) }}
            </Message>
          </div>

          <div class="field">
            <label>Zip Code</label>
            <InputText
              v-bind="form.register(`addresses.${field.index}.zipCode`)"
              :data-testid="`zipcode-${field.index}`"
            />
            <Message
              v-if="form.getErrors(`addresses.${field.index}.zipCode`)"
              severity="error"
              :data-testid="`zipcode-error-${field.index}`"
            >
              {{ form.getErrors(`addresses.${field.index}.zipCode`) }}
            </Message>
          </div>

          <Button
            type="button"
            label="Remove"
            severity="danger"
            :data-testid="`remove-${field.index}`"
            @click="removeAddress(field.index)"
          />
        </div>

        <div class="array-controls">
          <Button type="button" label="Add Address" data-testid="add-address" @click="addAddress" />
          <Button
            type="button"
            label="Swap First Two"
            data-testid="swap-addresses"
            :disabled="addressFields.value.length < 2"
            @click="swapAddresses"
          />
          <Button
            type="button"
            label="Move Last to First"
            data-testid="move-address"
            :disabled="addressFields.value.length < 2"
            @click="moveAddressToFirst"
          />
        </div>
      </div>

      <Button type="submit" label="Submit" data-testid="submit-button" />
    </form>

    <div v-if="submittedData" class="submitted-data" data-testid="submitted-data">
      <h3>Submitted Data:</h3>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>

    <div class="array-state" data-testid="array-state">
      <h3>Array State:</h3>
      <p data-testid="array-length">Length: {{ addressFields.value.length }}</p>
      <p data-testid="array-keys">Keys: {{ addressFields.value.map((f) => f.key).join(', ') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useFormSubmission } from '../composables/useFormSubmission'
import { useFormWithGlobalMode } from '../composables/useFormWithGlobalMode'

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  zipCode: z.string().min(5, 'Zip code must be at least 5 characters'),
})

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  addresses: z.array(addressSchema).min(1, 'At least one address is required'),
})

type FormValues = z.infer<typeof schema>

const { form, formKey } = useFormWithGlobalMode({
  schema,
  defaultValues: {
    name: '',
    addresses: [{ street: '', city: '', zipCode: '' }],
  },
})

// Computed to get addressFields that updates when form is recreated
const addressFields = computed(() =>
  form.value.fields('addresses', {
    rules: {
      minLength: { value: 1, message: 'At least one address required' },
    },
  }),
)

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()

const onSubmit = (data: FormValues) => onSubmitSuccess(data)

const addAddress = () => {
  addressFields.value.append({ street: '', city: '', zipCode: '' })
}

const removeAddress = (index: number) => {
  console.log('[DEBUG] Before remove:', {
    index,
    length: addressFields.value.value.length,
  })
  const result = addressFields.value.remove(index)
  console.log('[DEBUG] After remove:', {
    result,
    length: addressFields.value.value.length,
  })
}

const swapAddresses = () => {
  if (addressFields.value.value.length >= 2) {
    addressFields.value.swap(0, 1)
  }
}

const moveAddressToFirst = () => {
  if (addressFields.value.value.length >= 2) {
    addressFields.value.move(addressFields.value.value.length - 1, 0)
  }
}
</script>
