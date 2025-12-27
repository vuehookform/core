# Vue Hook Form

A TypeScript-first form library for Vue 3, inspired by React Hook Form.

[![npm version](https://img.shields.io/npm/v/@vuehookform/core)](https://www.npmjs.com/package/@vuehookform/core) [![CI](https://img.shields.io/github/actions/workflow/status/vuehookform/core/ci.yml?branch=main&label=CI)](https://github.com/vuehookform/core/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Coverage](https://img.shields.io/badge/coverage-90%25+-brightgreen)](https://github.com/vuehookform/core)

## Features

- **TypeScript First** - Perfect type inference with zero manual typing
- **Field Arrays** - Dynamic lists with stable keys built-in
- **Performant** - Minimal re-renders using uncontrolled inputs
- **Zod Native** - First-class Zod integration for validation
- **Tiny Bundle** - ~10kb gzipped, tree-shakable
- **UI Agnostic** - Works with any UI library or custom components

## Quick Start

```bash
npm install @vuehookform/core zod
```

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
})

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
})

const onSubmit = (data) => {
  console.log(data) // Fully typed: { email: string, password: string }
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <input v-bind="register('email')" type="email" />
    <span v-if="formState.errors.email">{{ formState.errors.email }}</span>

    <input v-bind="register('password')" type="password" />
    <span v-if="formState.errors.password">{{ formState.errors.password }}</span>

    <button type="submit" :disabled="formState.isSubmitting">Submit</button>
  </form>
</template>
```

## Key Concepts

### Schema as Source of Truth

```typescript
const userSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  age: z.number().min(18),
})

type UserForm = z.infer<typeof userSchema>
// { name: string; email: string; age: number }
```

### Dynamic Arrays

```vue
<script setup>
const { register, fields } = useForm({ schema })
const addresses = fields('addresses')

// Available methods:
// addresses.append(value)  - Add to end
// addresses.remove(index)  - Remove at index
// addresses.insert(index, value)
// addresses.swap(i, j)
// addresses.move(from, to)
</script>

<template>
  <div v-for="field in addresses.value" :key="field.key">
    <input v-bind="register(`addresses.${field.index}.street`)" />
    <button @click="field.remove()">Remove</button>
  </div>
  <button @click="addresses.append({ street: '', city: '' })">Add Address</button>
</template>
```

### Validation Modes

```typescript
useForm({
  schema,
  mode: 'onSubmit', // Only validate on submit (default)
  // mode: 'onBlur',    // Validate when field loses focus
  // mode: 'onChange',  // Validate on every keystroke
  // mode: 'onTouched', // Validate after field is touched
})
```

- `disabled: ref(true)` - Disable entire form (reactive, blocks submission)
- `shouldUseNativeValidation: true` - Enable CSS `:valid`/`:invalid` selectors

## Tips

### Controlled vs Uncontrolled

```typescript
// Default (uncontrolled) - for native inputs
<input v-bind="register('email')" />

// Controlled - for v-model / custom components
const { value, ...bindings } = register('field', { controlled: true })
<CustomInput v-model="value" v-bind="bindings" />
```

### Common Mistakes

| Wrong                    | Right                    |
| ------------------------ | ------------------------ |
| `items[0].name`          | `items.0.name`           |
| `:key="index"`           | `:key="field.key"`       |
| `formState.errors`       | `formState.value.errors` |
| `v-model` + `register()` | Either one, not both     |

## Contributing

Contributions welcome! Feel free to report bugs, suggest features, or submit PRs.

## License

MIT
