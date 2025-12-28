# Examples

Interactive examples demonstrating Vue Hook Form capabilities.

## Basic Examples

### Simple Login Form

A minimal login form with email and password validation.

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
})

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
})

const onSubmit = (data) => console.log(data)
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <input v-bind="register('email')" type="email" placeholder="Email" />
    <input v-bind="register('password')" type="password" placeholder="Password" />
    <button type="submit">Login</button>
  </form>
</template>
```

### Registration Form

User registration with password confirmation.

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z
  .object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

const { register, handleSubmit, formState } = useForm({ schema })
</script>
```

## Dynamic Forms

### Shopping Cart

Dynamic item list with quantity controls.

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  items: z
    .array(
      z.object({
        product: z.string(),
        quantity: z.number().min(1),
      }),
    )
    .min(1),
})

const { register, handleSubmit, fields } = useForm({
  schema,
  defaultValues: { items: [{ product: '', quantity: 1 }] },
})

const items = fields('items')
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <div v-for="field in items.value" :key="field.key">
      <input v-bind="register(`items.${field.index}.product`)" />
      <input v-bind="register(`items.${field.index}.quantity`)" type="number" />
      <button type="button" @click="field.remove()">Remove</button>
    </div>
    <button type="button" @click="items.append({ product: '', quantity: 1 })">Add Item</button>
    <button type="submit">Checkout</button>
  </form>
</template>
```

### Survey Builder

Create dynamic surveys with multiple question types.

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const questionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    question: z.string(),
    answer: z.string(),
  }),
  z.object({
    type: z.literal('rating'),
    question: z.string(),
    rating: z.number().min(1).max(5),
  }),
])

const schema = z.object({
  title: z.string(),
  questions: z.array(questionSchema),
})
</script>
```

## Advanced Patterns

### Multi-Step Wizard

Form split into multiple steps with validation per step.

```vue
<script setup>
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'

const step = ref(1)
const { register, handleSubmit, trigger } = useForm({ schema })

const nextStep = async () => {
  const valid = await trigger(stepFields[step.value])
  if (valid) step.value++
}
</script>
```

### Nested Form Context

Share form across deeply nested components.

```vue
<script setup>
import { useForm, provideForm } from '@vuehookform/core'

const form = useForm({ schema })
provideForm(form) // Make form available to all descendants
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <PersonalInfoSection />
    <AddressSection />
    <PreferencesSection />
    <SubmitButton />
  </form>
</template>
```
