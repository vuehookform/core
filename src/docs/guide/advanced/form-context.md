# Form Context

Share form state across deeply nested components without prop drilling.

## Overview

Form context uses Vue's provide/inject to make form methods and state available to any descendant component.

## Setting Up Context

Call `provideForm()` in your setup script:

```vue
<script setup>
import { useForm, provideForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
  email: z.email(),
})

const form = useForm({ schema })
provideForm(form) // Make form available to all descendants

const onSubmit = (data) => {
  console.log(data)
}
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <PersonalInfo />
    <FormActions />
  </form>
</template>
```

## Consuming Context

Use `useFormContext` in child components:

```vue
<!-- PersonalInfo.vue -->
<script setup>
import { useFormContext } from '@vuehookform/core'

const { register, formState } = useFormContext()
</script>

<template>
  <div class="personal-info">
    <div class="field">
      <label>Name</label>
      <input v-bind="register('name')" />
      <span v-if="formState.value.errors.name">
        {{ formState.value.errors.name }}
      </span>
    </div>

    <div class="field">
      <label>Email</label>
      <input v-bind="register('email')" type="email" />
      <span v-if="formState.value.errors.email">
        {{ formState.value.errors.email }}
      </span>
    </div>
  </div>
</template>
```

```vue
<!-- FormActions.vue -->
<script setup>
import { useFormContext } from '@vuehookform/core'

const { formState, reset } = useFormContext()
</script>

<template>
  <div class="form-actions">
    <button type="button" @click="reset()">Reset</button>
    <button type="submit" :disabled="formState.value.isSubmitting">
      {{ formState.value.isSubmitting ? 'Saving...' : 'Save' }}
    </button>
  </div>
</template>
```

## Available from Context

`useFormContext` returns the same object as `useForm`:

```typescript
const {
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
} = useFormContext()
```

## Building Reusable Field Components

Create generic field components that work with any form:

```vue
<!-- FormField.vue -->
<script setup lang="ts">
import { useFormContext } from '@vuehookform/core'

const props = defineProps<{
  name: string
  label?: string
  type?: string
  placeholder?: string
}>()

const { register, formState } = useFormContext()
</script>

<template>
  <div class="form-field">
    <label v-if="label" :for="name">{{ label }}</label>
    <input :id="name" v-bind="register(name)" :type="type ?? 'text'" :placeholder="placeholder" />
    <span v-if="formState.value.errors[name]" class="error">
      {{ formState.value.errors[name] }}
    </span>
  </div>
</template>
```

Usage:

```vue
<script setup>
import { useForm, provideForm } from '@vuehookform/core'

const form = useForm({ schema })
provideForm(form)
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <FormField name="firstName" label="First Name" />
    <FormField name="lastName" label="Last Name" />
    <FormField name="email" label="Email" type="email" />
    <button type="submit">Submit</button>
  </form>
</template>
```

## Nested Components

Context flows through any depth of nesting:

```vue
<!-- ContactForm.vue -->
<script setup>
import { useForm, provideForm } from '@vuehookform/core'

const form = useForm({ schema })
provideForm(form)
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <ContactInfo />
  </form>
</template>
```

```vue
<!-- ContactInfo.vue -->
<template>
  <div>
    <BasicFields />
    <AddressSection />
  </div>
</template>
```

```vue
<!-- BasicFields.vue -->
<script setup>
import { useFormContext } from '@vuehookform/core'
const { register } = useFormContext()
</script>

<template>
  <input v-bind="register('name')" />
  <input v-bind="register('email')" />
</template>
```

```vue
<!-- AddressSection.vue -->
<script setup>
import { useFormContext } from '@vuehookform/core'
const { register } = useFormContext()
</script>

<template>
  <fieldset>
    <legend>Address</legend>
    <input v-bind="register('address.street')" />
    <input v-bind="register('address.city')" />
    <input v-bind="register('address.zip')" />
  </fieldset>
</template>
```

## TypeScript Support

For type-safe context, specify the generic type:

```typescript
import type { z } from 'zod'

const schema = z.object({
  name: z.string(),
  email: z.email(),
})

type FormData = z.infer<typeof schema>

// In child component
const { register } = useFormContext<FormData>()

register('name') // OK
register('invalid') // Type error
```

## Multiple Forms

For multiple forms, create separate wrapper components that each call `provideForm()`:

```vue
<!-- ShippingFormWrapper.vue -->
<script setup>
import { useForm, provideForm } from '@vuehookform/core'

const form = useForm({ schema: shippingSchema })
provideForm(form)
</script>

<template>
  <form @submit="form.handleSubmit(onShipping)">
    <h2>Shipping</h2>
    <AddressFields />
  </form>
</template>
```

```vue
<!-- BillingFormWrapper.vue -->
<script setup>
import { useForm, provideForm } from '@vuehookform/core'

const form = useForm({ schema: billingSchema })
provideForm(form)
</script>

<template>
  <form @submit="form.handleSubmit(onBilling)">
    <h2>Billing</h2>
    <AddressFields />
    <!-- Same component, different form -->
  </form>
</template>
```

```vue
<!-- Parent component -->
<template>
  <div class="side-by-side">
    <ShippingFormWrapper />
    <BillingFormWrapper />
  </div>
</template>
```

## Error Handling

`useFormContext` throws if used outside a component where `provideForm()` was called:

```typescript
// This throws if provideForm() was not called in a parent component
const form = useFormContext()
// Error: useFormContext must be used within a component tree where provideForm() has been called
```

Handle this gracefully in reusable components:

```typescript
import { inject } from 'vue'
import { FormContextKey } from '@vuehookform/core'

// Check if context exists
const context = inject(FormContextKey, null)
if (!context) {
  console.warn('Component used outside form context')
}
```

## Performance Considerations

Form context shares reactive state, so all consuming components re-render when form state changes. For large forms:

1. Split into smaller sub-forms if possible
2. Use `useFormState` for selective subscriptions
3. Consider component-level memoization

## Next Steps

- Learn about [Watch](/guide/advanced/watch) for reactive values
- Explore [Programmatic Control](/guide/advanced/programmatic-control)
