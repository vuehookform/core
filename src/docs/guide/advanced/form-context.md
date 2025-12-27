# Form Context

Share form state across deeply nested components without prop drilling.

## Overview

Form context uses Vue's provide/inject to make form methods and state available to any descendant component.

## Setting Up Context

Wrap your form with `FormProvider`:

```vue
<script setup>
import { useForm, FormProvider } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
  email: z.email(),
})

const form = useForm({ schema })

const onSubmit = (data) => {
  console.log(data)
}
</script>

<template>
  <FormProvider :form="form">
    <form @submit="form.handleSubmit(onSubmit)">
      <PersonalInfo />
      <FormActions />
    </form>
  </FormProvider>
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
<template>
  <FormProvider :form="form">
    <form @submit="form.handleSubmit(onSubmit)">
      <FormField name="firstName" label="First Name" />
      <FormField name="lastName" label="Last Name" />
      <FormField name="email" label="Email" type="email" />
      <button type="submit">Submit</button>
    </form>
  </FormProvider>
</template>
```

## Nested Components

Context flows through any depth of nesting:

```vue
<!-- ContactForm.vue -->
<template>
  <FormProvider :form="form">
    <form @submit="form.handleSubmit(onSubmit)">
      <ContactInfo />
    </form>
  </FormProvider>
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

Each `FormProvider` creates its own context:

```vue
<template>
  <div class="side-by-side">
    <FormProvider :form="shippingForm">
      <form @submit="shippingForm.handleSubmit(onShipping)">
        <h2>Shipping</h2>
        <AddressFields />
      </form>
    </FormProvider>

    <FormProvider :form="billingForm">
      <form @submit="billingForm.handleSubmit(onBilling)">
        <h2>Billing</h2>
        <AddressFields />
        <!-- Same component, different form -->
      </form>
    </FormProvider>
  </div>
</template>
```

## Error Handling

`useFormContext` throws if used outside a provider:

```typescript
// This throws if no FormProvider ancestor exists
const form = useFormContext()
// Error: useFormContext must be used within a FormProvider
```

Handle this gracefully in reusable components:

```typescript
import { inject } from 'vue'
import { FORM_CONTEXT_KEY } from '@vuehookform/core'

// Check if context exists
const context = inject(FORM_CONTEXT_KEY, null)
if (!context) {
  console.warn('Component used outside FormProvider')
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
