# Form Setup

Learn how to properly configure `useForm` for your needs.

## Basic Setup

The simplest form setup requires only a schema:

```typescript
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
})

const { register, handleSubmit } = useForm({ schema })
```

## Configuration Options

### Schema

The Zod schema that defines your form structure and validation rules:

```typescript
const schema = z.object({
  email: z.email(),
  age: z.number().min(18),
  preferences: z.object({
    newsletter: z.boolean(),
  }),
})

const form = useForm({ schema })
```

### Default Values

Pre-populate form fields with initial values:

```typescript
const form = useForm({
  schema,
  defaultValues: {
    email: 'user@example.com',
    age: 25,
    preferences: {
      newsletter: true,
    },
  },
})
```

::: tip
Default values should match your schema structure. TypeScript will warn you if they don't.
:::

#### Async Default Values

Load initial values from an API:

```typescript
const { formState } = useForm({
  schema,
  defaultValues: async () => {
    const response = await fetch('/api/user')
    return response.json()
  },
  onDefaultValuesError: (error) => {
    console.error('Failed to load:', error)
  },
})
```

Track loading state via `formState`:

- `formState.value.isLoading` - `true` while fetching
- `formState.value.isReady` - `true` once loading completes
- `formState.value.defaultValuesError` - error object if loading failed

See [Async Patterns](/guide/advanced/async-patterns) for complete examples.

### Validation Mode

Control when validation occurs:

```typescript
const form = useForm({
  schema,
  mode: 'onBlur', // 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'
})
```

See [Validation Modes](./validation.md#validation-modes) for detailed descriptions of each mode.

### Disabled State

Disable the entire form:

```typescript
import { ref } from 'vue'

const isLoading = ref(false)

const form = useForm({
  schema,
  disabled: isLoading, // Reactive ref
})
```

When disabled:

- All inputs receive the `disabled` attribute
- Form submission is blocked
- Useful for loading states

### Native Validation

Enable browser's native validation UI:

```typescript
const form = useForm({
  schema,
  shouldUseNativeValidation: true,
})
```

This adds HTML5 validation attributes and enables `:valid`/`:invalid` CSS selectors.

### Should Unregister

Control whether field data is removed when a field is unmounted:

```typescript
const form = useForm({
  schema,
  shouldUnregister: true, // Remove data when fields unmount (default: false)
})
```

When `shouldUnregister: true`:

- Field values are deleted when the field unmounts
- Useful for dynamic forms where fields are conditionally shown
- Override per-field with `register('field', { shouldUnregister: false })`

When `shouldUnregister: false` (default):

- Field values persist even when unmounted
- Form retains all values for submission
- Better for multi-step forms

### External Values Sync

Sync form values with external state without marking fields as dirty:

```typescript
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const externalValues = computed(() => ({
  search: route.query.q || '',
  page: Number(route.query.page) || 1,
}))

const form = useForm({
  schema,
  values: externalValues, // Form syncs when this changes
})
```

Use `values` when you need to sync with URL params, stores, or parent state.

### External Errors

Pass server-side validation errors into the form:

```typescript
import { ref } from 'vue'

const serverErrors = ref({})

const form = useForm({
  schema,
  errors: serverErrors, // Merged with validation errors
})

// After API returns validation errors:
serverErrors.value = {
  email: 'This email is already registered',
  username: 'Username contains invalid characters',
}
```

Server errors take precedence over client-side validation errors.

See [Async Patterns](/guide/advanced/async-patterns) for complete server error handling examples.

## Return Values

`useForm` returns an object with everything you need:

```typescript
const {
  // Register inputs
  register,
  unregister,

  // Handle form submission
  handleSubmit,

  // Reactive form state
  formState,

  // Field array management
  fields,

  // Programmatic control
  setValue,
  getValue,
  getValues,
  getFieldState,
  reset,
  resetField,

  // Validation
  trigger, // Manually trigger validation

  // Error management
  setError,
  setErrors,
  clearErrors,
  hasErrors,
  getErrors,

  // Watch field values
  watch,

  // Focus management
  setFocus,

  // For child components
  control,
} = useForm({ schema })
```

See [Programmatic Control](/guide/advanced/programmatic-control) for detailed usage of each method.

## Complete Example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.email('Invalid email address'),
  age: z.number().min(18, 'Must be 18 or older'),
})

const isLoading = ref(false)

const { register, handleSubmit, formState, reset } = useForm({
  schema,
  mode: 'onBlur',
  defaultValues: {
    firstName: '',
    lastName: '',
    email: '',
    age: 18,
  },
  disabled: isLoading,
})

const onSubmit = async (data: z.infer<typeof schema>) => {
  isLoading.value = true
  try {
    await submitToServer(data)
    reset() // Clear form on success
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <!-- Form fields here -->
  </form>
</template>
```

## Next Steps

- Learn about [Validation](/guide/essentials/validation) strategies
- Understand [Error Handling](/guide/essentials/error-handling)
- Explore [Form State](/guide/essentials/form-state)
