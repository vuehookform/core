# Quick Start

Get up and running with Vue Hook Form in minutes.

## Installation

::: code-group

```bash [npm]
npm install @vuehookform/core zod
```

```bash [pnpm]
pnpm add @vuehookform/core zod
```

```bash [yarn]
yarn add @vuehookform/core zod
```

```bash [bun]
bun add @vuehookform/core zod
```

:::

## Your First Form

Here's a complete login form example:

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

// 1. Define your schema
const schema = z.object({
  email: z.email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// 2. Initialize the form
const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur', // Validate when fields lose focus
})

// 3. Handle submission
const onSubmit = (data: z.infer<typeof schema>) => {
  console.log('Form data:', data)
  // data is fully typed: { email: string, password: string }
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <div>
      <label for="email">Email</label>
      <input id="email" v-bind="register('email')" type="email" />
      <span v-if="formState.value.errors.email" class="error">
        {{ formState.value.errors.email }}
      </span>
    </div>

    <div>
      <label for="password">Password</label>
      <input id="password" v-bind="register('password')" type="password" />
      <span v-if="formState.value.errors.password" class="error">
        {{ formState.value.errors.password }}
      </span>
    </div>

    <button type="submit" :disabled="formState.value.isSubmitting">
      {{ formState.value.isSubmitting ? 'Submitting...' : 'Login' }}
    </button>
  </form>
</template>

<style scoped>
.error {
  color: red;
  font-size: 0.875rem;
}
</style>
```

## Understanding the Code

### 1. Define Your Schema

The Zod schema serves as the single source of truth:

```typescript
const schema = z.object({
  email: z.email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
```

This defines both the TypeScript types and validation rules in one place.

### 2. Initialize the Form

Call `useForm` with your schema and options:

```typescript
const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
})
```

The returned object contains everything you need to manage the form.

### 3. Register Inputs

Use `v-bind` to spread the register bindings onto your inputs:

```vue
<input v-bind="register('email')" type="email" />
```

This sets up the `name`, `ref`, `onChange`, and `onBlur` handlers automatically.

### 4. Display Errors

Access errors through `formState.value.errors`:

```vue
<span v-if="formState.value.errors.email">
  {{ formState.value.errors.email }}
</span>
```

### 5. Handle Submission

Wrap your submit handler with `handleSubmit`:

```vue
<form @submit="handleSubmit(onSubmit)"></form>
```

Your handler only runs if validation passes, and receives typed data.

## Default Values

Pre-populate your form with default values:

```typescript
const { register, handleSubmit, formState } = useForm({
  schema,
  defaultValues: {
    email: 'user@example.com',
    password: '',
  },
})
```

## Validation Modes

Choose when validation occurs:

```typescript
useForm({
  schema,
  mode: 'onSubmit', // Only on submit (default)
  // mode: 'onBlur',    // When field loses focus
  // mode: 'onChange',  // On every change
  // mode: 'onTouched', // After first blur, then on change
})
```

## Next Steps

- Learn about [Form Setup](/guide/essentials/form-setup) for more options
- Understand [Validation](/guide/essentials/validation) strategies
- Explore [Error Handling](/guide/essentials/error-handling) patterns
- Build [Dynamic Forms](/guide/dynamic/field-arrays) with field arrays
