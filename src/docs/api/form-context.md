# Form Context

Share form state across components using Vue's provide/inject.

## Overview

Form context allows child components to access the form without prop drilling. This is useful for:

- Complex forms with many nested components
- Reusable form field components
- Multi-step forms

## provideForm

Provides form context to all descendant components.

### Import

```typescript
import { provideForm } from '@vuehookform/core'
```

### Usage

```vue
<script setup>
import { useForm, provideForm } from '@vuehookform/core'

const form = useForm({ schema })

// Make form available to all descendant components
provideForm(form)
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <!-- Child components can access form via useFormContext -->
    <EmailField />
    <PasswordField />
    <SubmitButton />
  </form>
</template>
```

### Parameters

| Parameter | Type               | Required | Description                    |
| --------- | ------------------ | -------- | ------------------------------ |
| `form`    | `UseFormReturn<T>` | Yes      | The form object from `useForm` |

## useFormContext

Access the form context in child components.

### Import

```typescript
import { useFormContext } from '@vuehookform/core'
```

### Usage

```typescript
const {
  register,
  handleSubmit,
  formState,
  control,
  // ... all useForm return values
} = useFormContext()
```

### Return Value

Returns the same object as `useForm`:

```typescript
{
  register,
  handleSubmit,
  formState,
  fields,
  control,
  setValue,
  getValue,
  getValues,
  reset,
  trigger,
  watch,
  setError,
  clearErrors,
}
```

## Examples

### Reusable Field Component

```vue
<!-- TextField.vue -->
<script setup lang="ts">
import { useFormContext } from '@vuehookform/core'

const props = defineProps<{
  name: string
  label?: string
  type?: string
}>()

const { register, formState } = useFormContext()
</script>

<template>
  <div class="form-field">
    <label v-if="label" :for="name">{{ label }}</label>
    <input
      :id="name"
      v-bind="register(name)"
      :type="type ?? 'text'"
      :class="{ error: formState.value.errors[name] }"
    />
    <span v-if="formState.value.errors[name]" class="error-message">
      {{ formState.value.errors[name] }}
    </span>
  </div>
</template>
```

Usage:

```vue
<script setup>
import { useForm, provideForm } from '@vuehookform/core'
import TextField from './TextField.vue'

const form = useForm({ schema })
provideForm(form)
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <TextField name="firstName" label="First Name" />
    <TextField name="lastName" label="Last Name" />
    <TextField name="email" label="Email" type="email" />
    <button type="submit">Submit</button>
  </form>
</template>
```

### Submit Button Component

```vue
<!-- SubmitButton.vue -->
<script setup lang="ts">
import { useFormContext } from '@vuehookform/core'

const props = defineProps<{
  label?: string
}>()

const { formState } = useFormContext()
</script>

<template>
  <button type="submit" :disabled="formState.value.isSubmitting">
    <span v-if="formState.value.isSubmitting">Loading...</span>
    <span v-else>{{ label ?? 'Submit' }}</span>
  </button>
</template>
```

### Nested Components

```vue
<!-- AddressSection.vue -->
<script setup>
import { useFormContext } from '@vuehookform/core'
import TextField from './TextField.vue'

const { register } = useFormContext()
</script>

<template>
  <fieldset>
    <legend>Address</legend>
    <TextField name="address.street" label="Street" />
    <TextField name="address.city" label="City" />
    <TextField name="address.zip" label="ZIP Code" />
  </fieldset>
</template>
```

```vue
<!-- ContactForm.vue -->
<script setup>
import { useForm, provideForm } from '@vuehookform/core'
import TextField from './TextField.vue'
import AddressSection from './AddressSection.vue'
import SubmitButton from './SubmitButton.vue'

const form = useForm({ schema })
provideForm(form)
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <TextField name="name" label="Name" />
    <TextField name="email" label="Email" type="email" />

    <!-- Nested component has access to form context -->
    <AddressSection />

    <SubmitButton label="Save Contact" />
  </form>
</template>
```

### Multiple Forms

For multiple forms on the same page, create separate wrapper components that each call `provideForm()`:

```vue
<!-- ShippingForm.vue -->
<script setup>
import { useForm, provideForm } from '@vuehookform/core'

const form = useForm({ schema: shippingSchema })
provideForm(form)
</script>

<template>
  <form @submit="form.handleSubmit(onShipping)">
    <h2>Shipping Address</h2>
    <AddressFields />
  </form>
</template>
```

```vue
<!-- BillingForm.vue -->
<script setup>
import { useForm, provideForm } from '@vuehookform/core'

const form = useForm({ schema: billingSchema })
provideForm(form)
</script>

<template>
  <form @submit="form.handleSubmit(onBilling)">
    <h2>Billing Address</h2>
    <AddressFields />
  </form>
</template>
```

```vue
<!-- Parent component -->
<template>
  <div class="two-forms">
    <ShippingForm />
    <BillingForm />
  </div>
</template>
```

### TypeScript Support

For type-safe context access:

```vue
<script setup lang="ts">
import { useFormContext } from '@vuehookform/core'
import type { z } from 'zod'

// Define your schema type
type FormSchema = z.infer<typeof schema>

// Get typed context
const { register, formState } = useFormContext<FormSchema>()

// Now paths are type-checked
register('email') // OK
register('nonexistent') // Type error
</script>
```

## Error Handling

`useFormContext` throws if used outside a component where `provideForm()` was called:

```typescript
// This will throw if provideForm() was not called in a parent component
const form = useFormContext()
// Error: useFormContext must be used within a component tree where provideForm() has been called
```

Always ensure components using `useFormContext` are descendants of a component that calls `provideForm()`.
