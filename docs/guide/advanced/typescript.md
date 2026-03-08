# TypeScript

Vue Hook Form is built with TypeScript and provides excellent type inference out of the box.

## Schema-Driven Types

Your Zod schema automatically generates TypeScript types:

```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
  email: z.email(),
  age: z.number(),
  preferences: z.object({
    newsletter: z.boolean(),
    theme: z.enum(['light', 'dark']),
  }),
})

// Infer the type from schema
type FormData = z.infer<typeof schema>
// {
//   name: string
//   email: string
//   age: number
//   preferences: {
//     newsletter: boolean
//     theme: 'light' | 'dark'
//   }
// }
```

## Type-Safe Field Paths

All field paths are type-checked:

```typescript
const { register, setValue, getValue } = useForm({ schema })

// Valid paths - TypeScript allows these
register('name')
register('email')
register('preferences.newsletter')
register('preferences.theme')

// Invalid paths - TypeScript errors
register('invalid') // Error: not a valid path
register('preferences.invalid') // Error: invalid nested path
setValue('name', 123) // Error: expected string
```

## Typed Form Data

Submit handlers receive fully typed data:

```typescript
const onSubmit = (data: z.infer<typeof schema>) => {
  // data is fully typed
  console.log(data.name) // string
  console.log(data.age) // number
  console.log(data.preferences.theme) // 'light' | 'dark'

  // TypeScript catches errors
  console.log(data.invalid) // Error
}
```

## Array Paths

Array field paths include index positions:

```typescript
const schema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
    }),
  ),
})

const { register, fields } = useForm({ schema })
const items = fields('items')

// Template usage with type-safe paths
items.value.forEach((field) => {
  register(`items.${field.index}.name`) // OK
  register(`items.${field.index}.quantity`) // OK
  register(`items.${field.index}.invalid`) // Error
})
```

## Generic Components

Create type-safe reusable components:

```typescript
// FormField.vue
import type { Control, Path } from '@vuehookform/core'
import type { ZodSchema } from 'zod'

interface Props<T extends ZodSchema> {
  control: Control<T>
  name: Path<z.infer<T>>
  label?: string
}

// Usage
const props = defineProps<Props<typeof schema>>()
```

## Typed useFormContext

Specify the schema type for type-safe context:

```typescript
// In child component
import type { z } from 'zod'

// Reference the same schema type
type FormData = z.infer<typeof schema>

const { register, formState } = useFormContext<FormData>()

// Now paths are type-checked
register('email') // OK
register('invalid') // Error
```

## Typed Control Object

Pass typed control to child components:

```typescript
// Parent
const { control } = useForm({ schema })

// Child component props
interface Props {
  control: Control<z.infer<typeof schema>>
}
```

## Handling Optional Fields

Zod handles optional fields correctly:

```typescript
const schema = z.object({
  required: z.string(),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
  withDefault: z.string().default('default'),
})

type FormData = z.infer<typeof schema>
// {
//   required: string
//   optional?: string | undefined
//   nullable: string | null
//   withDefault: string
// }
```

## Union Types

Use discriminated unions for conditional fields:

```typescript
const personalSchema = z.object({
  type: z.literal('personal'),
  fullName: z.string(),
})

const businessSchema = z.object({
  type: z.literal('business'),
  companyName: z.string(),
  taxId: z.string(),
})

const schema = z.object({
  account: z.discriminatedUnion('type', [personalSchema, businessSchema]),
})

// TypeScript narrows types based on discriminant
const onSubmit = (data: z.infer<typeof schema>) => {
  if (data.account.type === 'personal') {
    console.log(data.account.fullName) // OK
    console.log(data.account.companyName) // Error
  } else {
    console.log(data.account.companyName) // OK
    console.log(data.account.taxId) // OK
  }
}
```

## Type Assertions

Sometimes you need to assert types for dynamic paths:

```typescript
// Dynamic field name from props
const props = defineProps<{ fieldName: string }>()

// Use type assertion when needed
register(props.fieldName as Path<FormData>)
```

## Error Types

Errors are typed based on your schema structure:

```typescript
const { formState } = useForm({ schema })

// Typed error access
const emailError: string | undefined = formState.value.errors.email
const nestedError: string | undefined = formState.value.errors.preferences?.theme

// For arrays
const itemError: string | undefined = formState.value.errors.items?.[0]?.name
```

## Complete Example

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

// Define schema
const schema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().min(1, 'Required'),
    email: z.email('Invalid email'),
  }),
  settings: z.object({
    notifications: z.boolean(),
    language: z.enum(['en', 'es', 'fr']),
  }),
  addresses: z.array(
    z.object({
      street: z.string(),
      city: z.string(),
      country: z.string(),
    }),
  ),
})

// Infer type
type FormData = z.infer<typeof schema>

// Initialize form
const { register, handleSubmit, formState, fields, setValue } = useForm({
  schema,
  defaultValues: {
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
    },
    settings: {
      notifications: true,
      language: 'en',
    },
    addresses: [],
  },
})

// Type-safe field array
const addresses = fields('addresses')

// Type-safe submit handler
const onSubmit = (data: FormData) => {
  // Full type inference
  console.log(data.personalInfo.email)
  console.log(data.settings.language)
  data.addresses.forEach((addr) => {
    console.log(addr.city)
  })
}

// Type-safe setValue
const setDefaults = () => {
  setValue('settings.language', 'en') // OK
  setValue('settings.language', 'invalid') // Type error
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <fieldset>
      <legend>Personal Info</legend>
      <input v-bind="register('personalInfo.firstName')" />
      <input v-bind="register('personalInfo.lastName')" />
      <input v-bind="register('personalInfo.email')" type="email" />
    </fieldset>

    <fieldset>
      <legend>Settings</legend>
      <label>
        <input v-bind="register('settings.notifications')" type="checkbox" />
        Notifications
      </label>
      <select v-bind="register('settings.language')">
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
      </select>
    </fieldset>

    <fieldset>
      <legend>Addresses</legend>
      <div v-for="field in addresses.value" :key="field.key">
        <input v-bind="register(`addresses.${field.index}.street`)" />
        <input v-bind="register(`addresses.${field.index}.city`)" />
        <input v-bind="register(`addresses.${field.index}.country`)" />
      </div>
    </fieldset>

    <button type="submit">Submit</button>
  </form>
</template>
```

## Next Steps

- Explore [Performance](/guide/best-practices/performance) optimization
- Learn common [Patterns](/guide/best-practices/patterns)
