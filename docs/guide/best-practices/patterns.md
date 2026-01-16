# Patterns

Common patterns and best practices for building forms with Vue Hook Form.

## Form Organization

### Separate Schema Definition

Keep schemas in separate files for reusability:

```typescript
// schemas/user.ts
import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  role: z.enum(['admin', 'user', 'guest']),
})

export type UserFormData = z.infer<typeof userSchema>
```

```vue
<!-- UserForm.vue -->
<script setup>
import { useForm } from '@vuehookform/core'
import { userSchema, type UserFormData } from '@/schemas/user'

const form = useForm({ schema: userSchema })
</script>
```

### Composable Wrapper

Create a composable for forms you use multiple times:

```typescript
// composables/useUserForm.ts
import { useForm } from '@vuehookform/core'
import { userSchema } from '@/schemas/user'

export function useUserForm(defaultValues?: Partial<UserFormData>) {
  return useForm({
    schema: userSchema,
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
      ...defaultValues,
    },
  })
}
```

## Error Handling

### Centralized Error Display

Create a consistent error component:

```vue
<!-- FormError.vue -->
<script setup>
defineProps<{
  message?: string
  show?: boolean
}>()
</script>

<template>
  <Transition name="fade">
    <p v-if="message && show !== false" class="form-error" role="alert">
      {{ message }}
    </p>
  </Transition>
</template>
```

### Error Summary

Show all errors at once:

```vue
<script setup>
import { computed } from 'vue'

const { formState } = useForm({ schema })

const errorMessages = computed(() => {
  return Object.entries(formState.value.errors)
    .filter(([, msg]) => msg)
    .map(([field, msg]) => ({ field, message: msg }))
})
</script>

<template>
  <div v-if="errorMessages.length" class="error-summary">
    <h3>Please fix the following errors:</h3>
    <ul>
      <li v-for="err in errorMessages" :key="err.field">
        <strong>{{ err.field }}:</strong> {{ err.message }}
      </li>
    </ul>
  </div>
</template>
```

## Server Integration

For server error handling patterns, see [Async Patterns - Server Error Integration](/guide/advanced/async-patterns#server-error-integration).

### Optimistic Updates

Update UI before server confirms:

```typescript
const onSubmit = async (data) => {
  // Optimistically update UI
  showSuccessMessage()

  try {
    await api.submit(data)
  } catch (error) {
    // Revert on failure
    hideSuccessMessage()
    setError('root', 'Submission failed')
  }
}
```

## Form State Management

### Unsaved Changes Warning

```vue
<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

const { formState } = useForm({ schema })

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (formState.value.isDirty) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>
```

### Auto-Save

```typescript
import { watchDebounced } from '@vueuse/core'

const formData = watch()

watchDebounced(
  formData,
  async (values) => {
    if (formState.value.isDirty && formState.value.isValid) {
      await saveDraft(values)
    }
  },
  { debounce: 2000 },
)
```

## Multi-Step Forms

Build wizard-style forms where each step has its own validation schema and data persists across all steps.

### Per-Step Schema Definition

Define separate Zod schemas for each step, then combine them for the full form:

```typescript
// schemas/checkout.ts
import { z } from 'zod'

// Step 1: Personal Info
export const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
})

// Step 2: Shipping Address
export const shippingSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
})

// Step 3: Payment
export const paymentSchema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits'),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, 'Format: MM/YY'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Invalid CVV'),
})

// Combined schema for full form validation on final submit
export const checkoutSchema = personalInfoSchema.merge(shippingSchema).merge(paymentSchema)

export type CheckoutFormData = z.infer<typeof checkoutSchema>
```

### Complete Multi-Step Form Component

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useForm } from '@vuehookform/core'
import { checkoutSchema, type CheckoutFormData } from '@/schemas/checkout'

// Step configuration with field mappings
const steps = [
  {
    id: 1,
    name: 'Personal Info',
    fields: ['firstName', 'lastName', 'email'] as const,
  },
  {
    id: 2,
    name: 'Shipping',
    fields: ['street', 'city', 'state', 'zip'] as const,
  },
  {
    id: 3,
    name: 'Payment',
    fields: ['cardNumber', 'expiry', 'cvv'] as const,
  },
]

const currentStep = ref(1)
const totalSteps = steps.length

// Use the combined schema - data persists across all steps
const { register, handleSubmit, formState, trigger } = useForm({
  schema: checkoutSchema,
  mode: 'onSubmit',
  reValidateMode: 'onChange', // Real-time feedback after step validation
  defaultValues: {
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  },
})

const currentStepConfig = computed(() => steps[currentStep.value - 1])

// Validate only the current step's fields
const validateCurrentStep = async (): Promise<boolean> => {
  const stepFields = currentStepConfig.value.fields
  const isValid = await trigger([...stepFields], {
    markAsSubmitted: true, // Activates reValidateMode for these fields
  })
  return isValid
}

const nextStep = async () => {
  const isValid = await validateCurrentStep()
  if (isValid && currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// Data persists - all fields from all steps are available on submit
const onSubmit = async (data: CheckoutFormData) => {
  console.log('Complete form data:', data)
  // Submit to your API
}
</script>

<template>
  <div class="multi-step-form">
    <!-- Progress indicator -->
    <div class="progress flex gap-2 mb-6">
      <div
        v-for="step in steps"
        :key="step.id"
        class="step-indicator px-3 py-1 rounded"
        :class="{
          'bg-blue-500 text-white': step.id === currentStep,
          'bg-green-500 text-white': step.id < currentStep,
          'bg-gray-200': step.id > currentStep,
        }"
      >
        {{ step.name }}
      </div>
    </div>

    <form @submit="handleSubmit(onSubmit)">
      <!-- Step 1: Personal Info -->
      <div v-show="currentStep === 1" class="step-content">
        <h2 class="text-xl font-bold mb-4">Personal Information</h2>

        <div class="field mb-4">
          <label class="block mb-1">First Name</label>
          <input v-bind="register('firstName')" class="w-full p-2 border rounded" />
          <span v-if="formState.value.errors.firstName" class="text-red-500 text-sm">
            {{ formState.value.errors.firstName }}
          </span>
        </div>

        <div class="field mb-4">
          <label class="block mb-1">Last Name</label>
          <input v-bind="register('lastName')" class="w-full p-2 border rounded" />
          <span v-if="formState.value.errors.lastName" class="text-red-500 text-sm">
            {{ formState.value.errors.lastName }}
          </span>
        </div>

        <div class="field mb-4">
          <label class="block mb-1">Email</label>
          <input v-bind="register('email')" type="email" class="w-full p-2 border rounded" />
          <span v-if="formState.value.errors.email" class="text-red-500 text-sm">
            {{ formState.value.errors.email }}
          </span>
        </div>
      </div>

      <!-- Step 2: Shipping -->
      <div v-show="currentStep === 2" class="step-content">
        <h2 class="text-xl font-bold mb-4">Shipping Address</h2>

        <div class="field mb-4">
          <label class="block mb-1">Street Address</label>
          <input v-bind="register('street')" class="w-full p-2 border rounded" />
          <span v-if="formState.value.errors.street" class="text-red-500 text-sm">
            {{ formState.value.errors.street }}
          </span>
        </div>

        <div class="field mb-4">
          <label class="block mb-1">City</label>
          <input v-bind="register('city')" class="w-full p-2 border rounded" />
          <span v-if="formState.value.errors.city" class="text-red-500 text-sm">
            {{ formState.value.errors.city }}
          </span>
        </div>

        <div class="flex gap-4">
          <div class="field mb-4 flex-1">
            <label class="block mb-1">State</label>
            <input v-bind="register('state')" class="w-full p-2 border rounded" />
            <span v-if="formState.value.errors.state" class="text-red-500 text-sm">
              {{ formState.value.errors.state }}
            </span>
          </div>

          <div class="field mb-4 flex-1">
            <label class="block mb-1">ZIP Code</label>
            <input v-bind="register('zip')" class="w-full p-2 border rounded" />
            <span v-if="formState.value.errors.zip" class="text-red-500 text-sm">
              {{ formState.value.errors.zip }}
            </span>
          </div>
        </div>
      </div>

      <!-- Step 3: Payment -->
      <div v-show="currentStep === 3" class="step-content">
        <h2 class="text-xl font-bold mb-4">Payment Details</h2>

        <div class="field mb-4">
          <label class="block mb-1">Card Number</label>
          <input
            v-bind="register('cardNumber')"
            placeholder="1234567890123456"
            class="w-full p-2 border rounded"
          />
          <span v-if="formState.value.errors.cardNumber" class="text-red-500 text-sm">
            {{ formState.value.errors.cardNumber }}
          </span>
        </div>

        <div class="flex gap-4">
          <div class="field mb-4 flex-1">
            <label class="block mb-1">Expiry</label>
            <input
              v-bind="register('expiry')"
              placeholder="MM/YY"
              class="w-full p-2 border rounded"
            />
            <span v-if="formState.value.errors.expiry" class="text-red-500 text-sm">
              {{ formState.value.errors.expiry }}
            </span>
          </div>

          <div class="field mb-4 flex-1">
            <label class="block mb-1">CVV</label>
            <input v-bind="register('cvv')" type="password" class="w-full p-2 border rounded" />
            <span v-if="formState.value.errors.cvv" class="text-red-500 text-sm">
              {{ formState.value.errors.cvv }}
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="actions flex gap-2 mt-6">
        <button
          type="button"
          @click="prevStep"
          :disabled="currentStep === 1"
          class="px-4 py-2 border rounded disabled:opacity-50"
        >
          Back
        </button>

        <button
          v-if="currentStep < totalSteps"
          type="button"
          @click="nextStep"
          class="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Next
        </button>

        <button
          v-else
          type="submit"
          :disabled="formState.value.isSubmitting"
          class="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          {{ formState.value.isSubmitting ? 'Processing...' : 'Place Order' }}
        </button>
      </div>
    </form>
  </div>
</template>
```

### Key Concepts

**Data Persistence:** The form uses a single `useForm` instance with the combined schema. All field values persist in the form's internal state regardless of which step is visible. Using `v-show` (instead of `v-if`) keeps fields in the DOM even when hidden, preserving their registration.

**Per-Step Validation:** The `trigger()` method validates only the current step's fields. The `markAsSubmitted: true` option activates `reValidateMode` so subsequent changes to validated fields show immediate feedback.

**Schema Composition:** Zod's `.merge()` combines individual step schemas into a full form schema, ensuring:

- TypeScript types are accurate for the complete form
- Full validation works on final submission
- Each step schema can be reused independently

### Alternative: Separate Forms Per Step

For complex wizards where steps are completely independent (different data models, save each step separately):

```typescript
import { ref, reactive } from 'vue'
import { useForm } from '@vuehookform/core'
import { personalInfoSchema, shippingSchema, paymentSchema } from '@/schemas/checkout'

// Store completed step data outside of forms
const formData = reactive<Partial<CheckoutFormData>>({})
const currentStep = ref(1)

// Step 1 form
const step1Form = useForm({
  schema: personalInfoSchema,
  mode: 'onBlur',
})

const onStep1Complete = step1Form.handleSubmit((data) => {
  Object.assign(formData, data)
  currentStep.value = 2
})

// Step 2 form
const step2Form = useForm({
  schema: shippingSchema,
  mode: 'onBlur',
})

const onStep2Complete = step2Form.handleSubmit((data) => {
  Object.assign(formData, data)
  currentStep.value = 3
})

// Step 3 form
const step3Form = useForm({
  schema: paymentSchema,
  mode: 'onBlur',
})

// Final submission uses combined data from all steps
const onFinalSubmit = step3Form.handleSubmit(async (paymentData) => {
  const completeData = { ...formData, ...paymentData }
  await submitOrder(completeData as CheckoutFormData)
})
```

This approach is better when:

- Each step saves data to the server independently
- Steps have completely different schemas that don't merge well
- You need different validation modes per step

## Reusable Field Components

### Field Wrapper

```vue
<!-- FormField.vue -->
<script setup>
import { useFormContext } from '@vuehookform/core'

const props = defineProps<{
  name: string
  label?: string
  type?: string
  required?: boolean
}>()

const { register, formState } = useFormContext()
const error = computed(() => formState.value.errors[props.name])
</script>

<template>
  <div class="form-field" :class="{ 'has-error': error }">
    <label v-if="label" :for="name">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <input :id="name" v-bind="register(name)" :type="type ?? 'text'" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>
```

## Testing

### Unit Testing Forms

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import LoginForm from './LoginForm.vue'

describe('LoginForm', () => {
  it('shows error for invalid email', async () => {
    const wrapper = mount(LoginForm)

    await wrapper.find('input[name="email"]').setValue('invalid')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Invalid email')
  })

  it('calls onSubmit with valid data', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(LoginForm, {
      props: { onSubmit },
    })

    await wrapper.find('input[name="email"]').setValue('test@example.com')
    await wrapper.find('input[name="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit')

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })
})
```

## Accessibility

### ARIA Attributes

```vue
<template>
  <div class="field">
    <label :for="name">{{ label }}</label>
    <input
      :id="name"
      v-bind="register(name)"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${name}-error` : undefined"
    />
    <p v-if="error" :id="`${name}-error`" role="alert" class="error">
      {{ error }}
    </p>
  </div>
</template>
```

### Focus Management

```typescript
const onSubmit = async (data) => {
  const firstError = Object.keys(formState.value.errors)[0]
  if (firstError) {
    const element = document.querySelector(`[name="${firstError}"]`)
    element?.focus()
  }
}
```

## Common Mistakes to Avoid

### Don't Mix v-model with register

```vue
<!-- Wrong -->
<input v-model="email" v-bind="register('email')" />

<!-- Right: uncontrolled -->
<input v-bind="register('email')" />

<!-- Right: controlled -->
<input v-model="emailValue" v-bind="emailBindings" />
```

### Don't Use Array Bracket Notation

```typescript
// Wrong
register('items[0].name')

// Right
register('items.0.name')
register(`items.${index}.name`)
```

### Don't Forget .value for Refs

```vue
<!-- Wrong -->
<span v-if="formState.errors.email"></span>
```

### Don't Use Index as Key in Field Arrays

```vue
<!-- Wrong -->
<div v-for="(field, index) in items.value" :key="index"></div>
```

## Summary

1. **Organize schemas** in separate files
2. **Create reusable** field components
3. **Handle errors** consistently
4. **Implement proper** server integration
5. **Add accessibility** attributes
6. **Test your forms** thoroughly
7. **Avoid common mistakes**
