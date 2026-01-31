---
layout: home
title: Vue Hook Form - TypeScript-first Form Library
titleTemplate: false
description: Type-safe, performant form library for Vue 3 with Zod validation. Build forms with minimal boilerplate and perfect TypeScript inference.

head:
  - - meta
    - property: og:title
      content: Vue Hook Form - TypeScript-first Form Library
  - - meta
    - property: og:description
      content: Type-safe, performant form library for Vue 3 with Zod validation. Build forms with minimal boilerplate and perfect TypeScript inference.

hero:
  name: Vue Hook Form
  text: TypeScript-first Form Library
  tagline: One composable. Schema-driven. Perfect types. From OpenClaw with love ❤️
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Why Vue Hook Form?
      link: '#why-vue-hook-form'
    - theme: alt
      text: GitHub
      link: https://github.com/vuehookform/core

features:
  - icon: 🎯
    title: One Composable, Full Control
    details: No scattered field composables. Just useForm() with everything you need - registration, validation, arrays, state.
  - icon: ⚡
    title: Fast by Default
    details: Uncontrolled inputs skip Vue reactivity during typing. Opt into controlled mode only where needed.
  - icon: 🔐
    title: Schema as Source of Truth
    details: Define your Zod schema once. Get TypeScript types AND runtime validation. No duplication, no adapters.
  - icon: 📦
    title: 10kb, Fully Featured
    details: Field arrays, validation modes, form context, watch API - everything included without the bloat.
  - icon: 🔄
    title: Nested Arrays Made Simple
    details: Dynamic field groups with stable keys. Add, remove, swap, move - all with boolean return values.
  - icon: 🎨
    title: TypeScript That Just Works
    details: Perfect inference from schema to submit handler. Your IDE catches path typos before runtime.
---

## Quick Example

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
})

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
})

// Data is fully typed as { email: string; password: string }
const onSubmit = (data: z.infer<typeof schema>) => {
  console.log(data.email, data.password)
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <input v-bind="register('email')" type="email" />
    <span v-if="formState.value.errors.email">
      {{ formState.value.errors.email }}
    </span>

    <input v-bind="register('password')" type="password" />
    <span v-if="formState.value.errors.password">
      {{ formState.value.errors.password }}
    </span>

    <button type="submit" :disabled="formState.value.isSubmitting">Submit</button>
  </form>
</template>
```

## Type-Safe Nested Paths

Your IDE knows every field path. Invalid paths cause TypeScript errors at compile time.

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  user: z.object({
    name: z.string().min(2, 'Name too short'),
    email: z.string().email('Invalid email'),
  }),
  address: z.object({
    street: z.string().min(1, 'Required'),
    city: z.string().min(1, 'Required'),
  }),
})

const { register, handleSubmit } = useForm({ schema })

// Full autocomplete: data.user.name, data.address.city
const onSubmit = (data: z.infer<typeof schema>) => {
  console.log(`${data.user.name} from ${data.address.city}`)
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <!-- Paths are type-checked: 'user.name' works, 'user.invalid' errors -->
    <input v-bind="register('user.name')" placeholder="Name" />
    <input v-bind="register('user.email')" type="email" placeholder="Email" />
    <input v-bind="register('address.street')" placeholder="Street" />
    <input v-bind="register('address.city')" placeholder="City" />
    <button type="submit">Submit</button>
  </form>
</template>
```

## Dynamic Field Arrays

Built-in array management with stable keys. No external libraries needed.

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  teamName: z.string().min(1, 'Required'),
  members: z
    .array(
      z.object({
        name: z.string().min(1, 'Required'),
        role: z.enum(['developer', 'designer', 'manager']),
      }),
    )
    .min(1, 'Add at least one member'),
})

const { register, handleSubmit, fields } = useForm({
  schema,
  defaultValues: { teamName: '', members: [{ name: '', role: 'developer' }] },
})

// Get field array manager - call once in setup
const members = fields('members')
</script>

<template>
  <form @submit="handleSubmit((data) => console.log(data))">
    <input v-bind="register('teamName')" placeholder="Team name" />

    <!-- Always use field.key for v-for, never index -->
    <div v-for="field in members.value" :key="field.key">
      <!-- Dot notation for array paths: members.0.name, not members[0].name -->
      <input v-bind="register(`members.${field.index}.name`)" placeholder="Name" />
      <select v-bind="register(`members.${field.index}.role`)">
        <option value="developer">Developer</option>
        <option value="designer">Designer</option>
        <option value="manager">Manager</option>
      </select>
      <button type="button" @click="members.remove(field.index)">Remove</button>
    </div>

    <button type="button" @click="members.append({ name: '', role: 'developer' })">
      Add Member
    </button>
    <button type="submit">Create Team</button>
  </form>
</template>
```

## Why Vue Hook Form? {#why-vue-hook-form}

### The Problem

Building forms in Vue often means choosing between:

- **Component-based libraries** that add 50kb+ to your bundle
- **Field-level composables** that scatter state across your codebase
- **Rolling your own** and reinventing validation, arrays, and types

### The Solution

Vue Hook Form takes a different approach:

- **Form-level state** - One `useForm()` composable manages everything. Cross-field validation? Simple. Form-wide state? One object.
- **Zod-native** - Your schema is the source of truth for types AND validation. No adapters, no plugins.
- **Performance by default** - Uncontrolled inputs mean zero re-renders during typing. Opt into reactivity only where you need it.

<div class="table-wrapper">

| Feature     | Vue Hook Form  | VeeValidate | FormKit   |
| ----------- | -------------- | ----------- | --------- |
| Bundle      | **~10kb**      | ~15kb       | ~50kb     |
| API Style   | **Form-level** | Field-level | Component |
| Zod Support | **Native**     | Adapter     | Limited   |
| TypeScript  | **Perfect**    | Good        | Good      |

</div>

## Validation When You Want It

Four validation modes to match your UX needs:

```typescript
useForm({
  schema,
  mode: 'onSubmit', // Only on submit (default) - cleanest UX
  mode: 'onBlur', // When field loses focus - recommended balance
  mode: 'onChange', // Every keystroke - real-time feedback
  mode: 'onTouched', // After first touch, then on change
})
```

_Pro tip: Use `reValidateMode: 'onChange'` for instant feedback after first validation._

## Quick Reference

<div class="table-wrapper">

| Wrong                    | Right                    |
| ------------------------ | ------------------------ |
| `items[0].name`          | `items.0.name`           |
| `:key="index"`           | `:key="field.key"`       |
| `formState.errors`       | `formState.value.errors` |
| `v-model` + `register()` | Either one, not both     |

</div>

## Real-World Examples

- [Login Form](/examples/#simple-login-form) - Basic email/password validation
- [Registration](/examples/#registration-form) - Password confirmation with cross-field validation
- [Shopping Cart](/examples/#shopping-cart) - Dynamic field arrays with add/remove
- [Survey Builder](/examples/#survey-builder) - Discriminated unions for question types
- [Multi-Step Wizard](/examples/#multi-step-wizard) - Step-by-step validation with trigger()
- [Nested Context](/examples/#nested-form-context) - Share form state across components
