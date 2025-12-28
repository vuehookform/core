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
  tagline: Build performant forms in Vue 3 with minimal boilerplate and perfect type inference
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/vuehookform/core

features:
  - icon: 🎯
    title: TypeScript First
    details: Perfect type inference with zero manual typing. Your IDE knows every field, every error, every path.
  - icon: ⚡
    title: Performant
    details: Uncontrolled inputs by default minimize re-renders. Only update what changed, when it changes.
  - icon: 🔐
    title: Zod Native
    details: First-class Zod integration. Define your schema once, get TypeScript types and runtime validation.
  - icon: 📦
    title: Tiny Bundle
    details: Less than 10kb gzipped with tree-shaking support. No bloat, just what you need.
  - icon: 🔄
    title: Dynamic Arrays
    details: Built-in field array management with stable keys. Add, remove, swap, move with ease.
  - icon: 🎨
    title: UI Agnostic
    details: Works with any component library or custom components. No vendor lock-in.
---

## Quick Example

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
