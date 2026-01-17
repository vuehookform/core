<template>
  <div class="form-page">
    <h1>PrimeInputNumber Wrapper Demo</h1>
    <p class="description">
      Demonstrates the separation of concerns pattern with <code>HookFormField</code> (form
      integration) wrapping <code>PrimeInputNumber</code> (pure UI component).
    </p>

    <form
      :key="formKey"
      data-testid="number-form"
      @submit.prevent="form.handleSubmit(onSubmit, onSubmitError)($event)"
    >
      <!-- Example 1: Basic number input -->
      <h2>1. Basic Number Input</h2>
      <HookFormField name="age" :control="form" :show-error="false" v-slot="{ field, error }">
        <PrimeInputNumber
          :model-value="field.value"
          label="Age"
          test-id="age"
          placeholder="Enter your age"
          :error="error"
          @update:model-value="field.onChange"
          @blur="field.onBlur"
        />
      </HookFormField>

      <!-- Example 2: With min/max constraints -->
      <h2>2. Min/Max Constraints</h2>
      <HookFormField name="quantity" :control="form" :show-error="false" v-slot="{ field, error }">
        <PrimeInputNumber
          :model-value="field.value"
          label="Quantity (1-100)"
          test-id="quantity"
          :min="1"
          :max="100"
          :error="error"
          @update:model-value="field.onChange"
          @blur="field.onBlur"
        />
      </HookFormField>

      <!-- Example 3: Currency mode -->
      <h2>3. Currency Mode</h2>
      <HookFormField name="price" :control="form" :show-error="false" v-slot="{ field, error }">
        <PrimeInputNumber
          :model-value="field.value"
          label="Price"
          test-id="price"
          mode="currency"
          currency="USD"
          locale="en-US"
          :error="error"
          @update:model-value="field.onChange"
          @blur="field.onBlur"
        />
      </HookFormField>

      <!-- Example 4: Decimal precision -->
      <h2>4. Decimal Precision</h2>
      <HookFormField
        name="temperature"
        :control="form"
        :show-error="false"
        v-slot="{ field, error }"
      >
        <PrimeInputNumber
          :model-value="field.value"
          label="Temperature (°C)"
          test-id="temperature"
          :min-fraction-digits="1"
          :max-fraction-digits="2"
          suffix=" °C"
          :error="error"
          @update:model-value="field.onChange"
          @blur="field.onBlur"
        />
      </HookFormField>

      <!-- Example 5: Percentage with suffix -->
      <h2>5. Percentage</h2>
      <HookFormField name="discount" :control="form" :show-error="false" v-slot="{ field, error }">
        <PrimeInputNumber
          :model-value="field.value"
          label="Discount"
          test-id="discount"
          suffix="%"
          :min="0"
          :max="100"
          :error="error"
          @update:model-value="field.onChange"
          @blur="field.onBlur"
        />
      </HookFormField>

      <!-- Example 6: Field Arrays -->
      <h2>6. Field Arrays (Scores)</h2>
      <div
        v-for="item in scoreFields.value"
        :key="item.key"
        class="score-item"
        :data-testid="`score-${item.index}`"
      >
        <div class="score-row">
          <HookFormField
            :name="`scores.${item.index}.value`"
            :control="form"
            :show-error="false"
            v-slot="{ field, error }"
          >
            <PrimeInputNumber
              :model-value="field.value"
              :label="`Score ${item.index + 1}`"
              :test-id="`score-${item.index}`"
              :min="0"
              :max="100"
              :error="error"
              @update:model-value="field.onChange"
              @blur="field.onBlur"
            />
          </HookFormField>
          <Button
            type="button"
            icon="pi pi-trash"
            severity="danger"
            :data-testid="`remove-score-${item.index}`"
            @click="scoreFields.remove(item.index)"
          />
        </div>
      </div>
      <Button
        type="button"
        label="Add Score"
        icon="pi pi-plus"
        data-testid="add-score"
        class="add-score-btn"
        @click="scoreFields.append({ value: 0 })"
      />

      <div class="form-actions">
        <Button type="submit" label="Submit" data-testid="submit-button" />
        <Button type="button" label="Reset" severity="secondary" @click="form.reset()" />
      </div>
    </form>

    <div v-if="submittedData" class="submitted-data" data-testid="submitted-data">
      <h3>Submitted Data:</h3>
      <pre>{{ JSON.stringify(submittedData, null, 2) }}</pre>
    </div>

    <div class="form-state-debug" data-testid="form-state">
      <h3>Form State:</h3>
      <ul>
        <li data-testid="is-dirty">isDirty: {{ form.formState.value.isDirty }}</li>
        <li data-testid="is-valid">isValid: {{ form.formState.value.isValid }}</li>
        <li data-testid="submit-count">submitCount: {{ form.formState.value.submitCount }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { z } from 'zod'
import Button from 'primevue/button'
import PrimeInputNumber from '../components/PrimeInputNumber.vue'
import HookFormField from '../components/HookFormField.vue'
import { useFormSubmission } from '../composables/useFormSubmission'
import { useFormWithGlobalMode } from '../composables/useFormWithGlobalMode'

const schema = z.object({
  age: z
    .number({ error: () => 'Age is required' })
    .min(18, 'Must be at least 18')
    .max(120, 'Must be at most 120'),
  quantity: z
    .number({ error: () => 'Quantity is required' })
    .int('Must be a whole number')
    .min(1, 'At least 1 required')
    .max(100, 'At most 100'),
  price: z.number({ error: () => 'Price is required' }).min(0, 'Price must be positive'),
  temperature: z
    .number({ error: () => 'Temperature is required' })
    .min(-40, 'Min -40°C')
    .max(60, 'Max 60°C'),
  discount: z
    .number({ error: () => 'Discount is required' })
    .min(0, 'Min 0%')
    .max(100, 'Max 100%'),
  scores: z.array(
    z.object({
      value: z
        .number({ error: () => 'Score is required' })
        .min(0, 'Min 0')
        .max(100, 'Max 100'),
    }),
  ),
})

type FormValues = z.infer<typeof schema>

const { form, formKey } = useFormWithGlobalMode({
  schema,
  defaultValues: {
    age: undefined,
    quantity: undefined,
    price: undefined,
    temperature: undefined,
    discount: undefined,
    scores: [{ value: 0 }],
  },
})

// Computed to get scoreFields that updates when form is recreated
const scoreFields = computed(() => form.value.fields('scores'))

const { submittedData, onSubmitSuccess, onSubmitError } = useFormSubmission<FormValues>()

const onSubmit = (data: FormValues) => onSubmitSuccess(data)
</script>

<style scoped>
.description {
  margin-bottom: 2rem;
  color: #6c757d;
}

h2 {
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: #495057;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 0.5rem;
}

.score-item {
  margin-bottom: 0.5rem;
}

.score-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.score-row .field {
  flex: 1;
}

.add-score-btn {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.submitted-data {
  margin-top: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.submitted-data pre {
  margin: 0;
  white-space: pre-wrap;
}

.form-state-debug {
  margin-top: 2rem;
  padding: 1rem;
  background: #e9ecef;
  border-radius: 4px;
}

.form-state-debug ul {
  margin: 0;
  padding-left: 1.5rem;
}
</style>
