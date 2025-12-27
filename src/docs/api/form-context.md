# Form Context

Share form state across components using Vue's provide/inject.

## Overview

Form context allows child components to access the form without prop drilling. This is useful for:

- Complex forms with many nested components
- Reusable form field components
- Multi-step forms

## FormProvider

Wraps a component tree and provides form context to all descendants.

### Import

```typescript
import { FormProvider } from '@vuehookform/core'
```

### Usage

```vue
<script setup>
import { useForm, FormProvider } from '@vuehookform/core'

const form = useForm({ schema })
</script>

<template>
  <FormProvider :form="form">
    <form @submit="form.handleSubmit(onSubmit)">
      <!-- Child components can access form -->
      <EmailField />
      <PasswordField />
      <SubmitButton />
    </form>
  </FormProvider>
</template>
```

### Props

| Prop   | Type               | Required | Description                    |
| ------ | ------------------ | -------- | ------------------------------ |
| `form` | `UseFormReturn<T>` | Yes      | The form object from `useForm` |

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
import { useForm, FormProvider } from '@vuehookform/core'
import TextField from './TextField.vue'

const form = useForm({ schema })
</script>

<template>
  <FormProvider :form="form">
    <form @submit="form.handleSubmit(onSubmit)">
      <TextField name="firstName" label="First Name" />
      <TextField name="lastName" label="Last Name" />
      <TextField name="email" label="Email" type="email" />
      <button type="submit">Submit</button>
    </form>
  </FormProvider>
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
import { useForm, FormProvider } from '@vuehookform/core'
import TextField from './TextField.vue'
import AddressSection from './AddressSection.vue'
import SubmitButton from './SubmitButton.vue'

const form = useForm({ schema })
</script>

<template>
  <FormProvider :form="form">
    <form @submit="form.handleSubmit(onSubmit)">
      <TextField name="name" label="Name" />
      <TextField name="email" label="Email" type="email" />

      <!-- Nested component has access to form context -->
      <AddressSection />

      <SubmitButton label="Save Contact" />
    </form>
  </FormProvider>
</template>
```

### Multiple Forms

Each `FormProvider` creates its own context:

```vue
<template>
  <div class="two-forms">
    <FormProvider :form="shippingForm">
      <form @submit="shippingForm.handleSubmit(onShipping)">
        <h2>Shipping Address</h2>
        <AddressFields />
      </form>
    </FormProvider>

    <FormProvider :form="billingForm">
      <form @submit="billingForm.handleSubmit(onBilling)">
        <h2>Billing Address</h2>
        <AddressFields />
      </form>
    </FormProvider>
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

`useFormContext` throws if used outside a `FormProvider`:

```typescript
// This will throw if no FormProvider ancestor exists
const form = useFormContext()
// Error: useFormContext must be used within a FormProvider
```

Always ensure components using `useFormContext` are descendants of a `FormProvider`.
