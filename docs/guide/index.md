# Introduction

Vue Hook Form is a TypeScript-first form library for Vue 3, inspired by [React Hook Form](https://react-hook-form.com/). It provides form-level state management with Zod validation, optimized for performance through uncontrolled inputs by default.

## Why Vue Hook Form?

Current Vue form libraries struggle with several common challenges:

- **Complex cross-field validation** - Validating one field based on another's value
- **Nested/dynamic form arrays** - Adding/removing form sections dynamically
- **Type-safe form schemas** - Getting TypeScript to infer types correctly
- **Performance issues** - Unnecessary re-renders on every keystroke

Vue Hook Form solves these problems with a unique approach.

## Core Philosophy

### Form-Level Management

Unlike other Vue form libraries (VeeValidate, Formwerk) that manage each field separately, Vue Hook Form uses a single composable to manage the entire form state centrally:

```typescript
// One composable manages everything
const { register, handleSubmit, formState, fields } = useForm({ schema })
```

This makes cross-field validation simple and keeps all state in one place.

### Schema as Source of Truth

We use **Zod** as the single source of truth for both TypeScript types and runtime validation:

```typescript
// 1. Define schema (with validation rules)
const schema = z.object({
  name: z.string().min(2),
  email: z.email(),
})

// 2. TypeScript types are automatically inferred
type FormValues = z.infer<typeof schema>
// { name: string; email: string }

// 3. Runtime validation uses the same schema
// No duplication, no manual typing
```

### Uncontrolled by Default

For maximum performance, inputs use DOM refs by default (like React Hook Form). This avoids Vue reactivity overhead during typing:

```typescript
// Default: uncontrolled for native inputs
<input v-bind="register('email')" />

// Opt-in: controlled for v-model / custom components
const { value, ...bindings } = register('email', { controlled: true })
```

## Features

- **Perfect TypeScript inference** - Your IDE knows every field path
- **Multiple validation modes** - onSubmit, onBlur, onChange, onTouched
- **Dynamic field arrays** - Built-in CRUD operations with stable keys
- **Form context** - Share form state across components
- **Watch API** - React to field value changes
- **Programmatic control** - setValue, getValue, reset, trigger

## Comparison

| Feature       | **Vue Hook Form** | VeeValidate | FormKit   |
| ------------- | ----------------- | ----------- | --------- |
| Bundle (gzip) | **~10kb**         | ~15kb       | ~50kb     |
| TypeScript    | **Perfect**       | Good        | Good      |
| API Style     | **Form-level**    | Field-level | Component |
| Nested Arrays | **Simple**        | Verbose     | Complex   |
| Zod Support   | **Native**        | Adapter     | Limited   |

## Ready to Start?

Head over to the [Quick Start](/guide/quick-start) guide to build your first form in minutes.
