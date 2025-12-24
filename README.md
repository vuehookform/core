# Vue Hook Form 📝

> A TypeScript-first form library for Vue 3, inspired by React Hook Form

**Vue Hook Form** makes form handling in Vue.js feel like a superpower. Built with performance, developer experience, and type safety as top priorities.

## ✨ Features

- **🎯 TypeScript First** - Perfect type inference with zero manual typing
- **⚡ Zero Config** - Works out of the box with sensible defaults
- **🚀 Performant** - Minimal re-renders using uncontrolled inputs
- **🔥 Zod Native** - First-class Zod integration for validation
- **📦 Tiny Bundle** - Tree-shakable and dependency-free (< 10kb gzipped)
- **🎨 UI Agnostic** - Works with any UI library or custom components
- **🔌 Composable-First** - Built for Vue 3's Composition API

## 🚀 Quick Start

### Installation

```bash
npm install @vuehookform/core zod
# or
bun add @vuehookform/core zod
```

### Basic Usage

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

// 1. Define your schema
const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
})

// 2. Initialize form
const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
})

// 3. Handle submission
const onSubmit = (data) => {
  console.log(data) // Fully typed! { email: string, password: string }
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <!-- Bind inputs with v-bind -->
    <input v-bind="register('email')" type="email" />
    <span v-if="formState.errors.email">{{ formState.errors.email }}</span>

    <input v-bind="register('password')" type="password" />
    <span v-if="formState.errors.password">{{ formState.errors.password }}</span>

    <button type="submit" :disabled="formState.isSubmitting">Submit</button>
  </form>
</template>
```

That's it! Three steps and you have a fully validated, type-safe form. 🎉

## 📚 Examples

This repo includes working examples showcasing all features:

### Run Examples

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Then open http://localhost:5173 to see:

1. **Basic Form** - Simple validation, error handling, form state
2. **Dynamic Arrays** - Add/remove nested form sections dynamically

## 💡 Key Concepts

### Schema as Source of Truth

Define your form structure and validation in one place:

```typescript
const userSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  age: z.number().min(18),
})

// Types are automatically inferred
type UserForm = z.infer<typeof userSchema>
// { name: string; email: string; age: number }
```

### Zero-Boilerplate Dynamic Arrays

Managing dynamic form sections is trivial:

```vue
<script setup>
const { register, fields } = useForm({ schema })

// Get field array manager
const addresses = fields('addresses')
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

Control when validation runs:

```typescript
useForm({
  schema,
  mode: 'onSubmit', // Only validate on submit (default)
  // mode: 'onBlur',      // Validate when field loses focus
  // mode: 'onChange',    // Validate on every keystroke
  // mode: 'onTouched',   // Validate after field is touched
})
```

## 🎨 API Reference

### `useForm(options)`

Main composable for form management.

**Options:**

```typescript
{
  schema: ZodSchema          // Zod schema for validation
  defaultValues?: Partial<T> // Initial form values
  mode?: ValidationMode      // When to validate
}
```

**Returns:**

```typescript
{
  register: (name, options?) => RegisterReturn
  handleSubmit: (onValid, onInvalid?) => (e) => Promise<void>
  formState: ComputedRef<FormState>
  fields: (name) => FieldArray
  setValue: (name, value) => void
  getValue: (name) => any
  reset: (values?) => void
  watch: (name?) => ComputedRef<any>
  validate: (name?) => Promise<boolean>
}
```

### `register(name, options?)`

Register an input field for validation and state management.

```vue
<input v-bind="register('email')" />
<input v-bind="register('email', { controlled: true })" />
```

### `handleSubmit(onValid, onInvalid?)`

Create submit handler with validation.

```typescript
const onSubmit = handleSubmit(
  (data) => {
    // Called with validated data
    console.log(data)
  },
  (errors) => {
    // Optional: called when validation fails
    console.log(errors)
  },
)
```

### `fields(name)`

Manage dynamic field arrays.

```typescript
const addresses = fields('addresses')

addresses.append({ street: '', city: '' }) // Add item
addresses.remove(0) // Remove by index
addresses.insert(1, value) // Insert at index
addresses.swap(0, 1) // Swap two items
addresses.move(0, 2) // Move item
```

## 🏗️ Project Structure

```
src/
├── lib/              # Library source code
│   ├── index.ts      # Public exports
│   ├── useForm.ts    # Main composable
│   ├── types.ts      # TypeScript definitions
│   └── utils/        # Helper functions
├── examples/         # Demo applications
│   ├── BasicForm.vue
│   └── DynamicArrays.vue
└── App.vue          # Example showcase
```

## 🎯 Why Vue Hook Form?

### vs VeeValidate

- **Less boilerplate** - One composable manages entire form
- **Better performance** - Uncontrolled inputs by default
- **Simpler API** - Form-level vs field-level management

### vs FormKit

- **Lighter** - < 10kb vs 50kb+
- **Less opinionated** - No UI components required
- **Native Zod** - First-class integration, not an adapter

### vs Vuelidate

- **Type-safe** - Perfect TypeScript inference
- **Built-in arrays** - Dynamic fields work out of the box
- **Modern** - Built for Composition API

## 🔧 Development

### Setup

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

### Type Check

```bash
npm run type-check
```

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

## 📖 Documentation

For detailed implementation notes, architecture decisions, and future roadmap, see [CORE_CONCEPTS.md](./CORE_CONCEPTS.md).

## 🤝 Contributing

Contributions welcome! This is a proof-of-concept library demonstrating:

- Form-level state management
- Zod-first validation
- TypeScript-first design
- Performance-optimized architecture

Feel free to:

- Report bugs
- Suggest features
- Submit PRs
- Ask questions

## 📝 License

MIT - Build something awesome!

## 🙏 Inspiration

- [React Hook Form](https://react-hook-form.com/) - API design inspiration
- [Zod](https://zod.dev/) - Schema validation
- [VeeValidate](https://vee-validate.logaretm.com/) - Vue form validation patterns

---

**Made with ❤️ for the Vue community**
