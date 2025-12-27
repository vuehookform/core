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

### Validation Mode

Control when validation occurs:

```typescript
const form = useForm({
  schema,
  mode: 'onBlur', // 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'
})
```

| Mode        | Description                                    |
| ----------- | ---------------------------------------------- |
| `onSubmit`  | Only validate on form submission (default)     |
| `onBlur`    | Validate when field loses focus                |
| `onChange`  | Validate on every input change                 |
| `onTouched` | Validate on blur, then on change after touched |

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

## Return Values

`useForm` returns an object with everything you need:

```typescript
const {
  // Register inputs
  register,

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
  reset,
  trigger,

  // Watch field values
  watch,
} = useForm({ schema })
```

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
