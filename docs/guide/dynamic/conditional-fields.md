# Conditional Fields

Show or hide form fields based on other field values.

## Basic Conditional Rendering

Use `watch` to reactively show/hide fields:

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  accountType: z.enum(['personal', 'business']),
  // Optional fields that depend on accountType
  companyName: z.string().optional(),
  taxId: z.string().optional(),
})

const { register, handleSubmit, watch } = useForm({ schema })

const accountType = watch('accountType')
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <select v-bind="register('accountType')">
      <option value="personal">Personal</option>
      <option value="business">Business</option>
    </select>

    <!-- Only show for business accounts -->
    <div v-if="accountType === 'business'">
      <input v-bind="register('companyName')" placeholder="Company Name" />
      <input v-bind="register('taxId')" placeholder="Tax ID" />
    </div>

    <button type="submit">Submit</button>
  </form>
</template>
```

## Conditional Validation

Use Zod's `refine` or discriminated unions for conditional validation:

### With refine

```typescript
const schema = z
  .object({
    hasDiscount: z.boolean(),
    discountCode: z.string().optional(),
  })
  .refine(
    (data) => {
      // If hasDiscount is true, discountCode must be provided
      if (data.hasDiscount && !data.discountCode) {
        return false
      }
      return true
    },
    {
      message: 'Discount code is required when discount is enabled',
      path: ['discountCode'],
    },
  )
```

### With Discriminated Unions

```typescript
const personalSchema = z.object({
  accountType: z.literal('personal'),
  fullName: z.string().min(1),
})

const businessSchema = z.object({
  accountType: z.literal('business'),
  companyName: z.string().min(1),
  taxId: z.string().min(1),
})

const schema = z.discriminatedUnion('accountType', [personalSchema, businessSchema])
```

## Conditional Field Arrays

Show different fields in array items based on a type:

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const contactSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    email: z.email(),
  }),
  z.object({
    type: z.literal('phone'),
    phone: z.string().min(10),
    extension: z.string().optional(),
  }),
])

const schema = z.object({
  contacts: z.array(contactSchema).min(1),
})

const { register, handleSubmit, fields, watch } = useForm({
  schema,
  defaultValues: {
    contacts: [{ type: 'email', email: '' }],
  },
})

const contacts = fields('contacts')
const watchedContacts = watch('contacts')
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <div v-for="(field, idx) in contacts.value" :key="field.key" class="contact-row">
      <select v-bind="register(`contacts.${field.index}.type`)">
        <option value="email">Email</option>
        <option value="phone">Phone</option>
      </select>

      <!-- Conditional fields based on type -->
      <template v-if="watchedContacts?.[idx]?.type === 'email'">
        <input
          v-bind="register(`contacts.${field.index}.email`)"
          type="email"
          placeholder="Email address"
        />
      </template>

      <template v-else-if="watchedContacts?.[idx]?.type === 'phone'">
        <input
          v-bind="register(`contacts.${field.index}.phone`)"
          type="tel"
          placeholder="Phone number"
        />
        <input
          v-bind="register(`contacts.${field.index}.extension`)"
          placeholder="Extension (optional)"
        />
      </template>

      <button type="button" @click="field.remove()">Remove</button>
    </div>

    <button type="button" @click="contacts.append({ type: 'email', email: '' })">
      Add Contact
    </button>

    <button type="submit">Submit</button>
  </form>
</template>
```

## Multi-Step Conditional Forms

Multi-step forms use conditional rendering combined with step-wise validation. The key technique is using `trigger()` to validate only the current step's fields before proceeding.

See [Patterns - Multi-Step Forms](/guide/best-practices/patterns#multi-step-forms) for a complete implementation pattern.

## Dependent Field Values

Clear or update field values when dependencies change:

```vue
<script setup>
import { watchEffect } from 'vue'
import { useForm } from '@vuehookform/core'

const schema = z.object({
  country: z.string(),
  state: z.string(),
  city: z.string(),
})

const { register, handleSubmit, watch, setValue } = useForm({ schema })

const country = watch('country')

// Clear state and city when country changes
watchEffect(() => {
  if (country.value) {
    setValue('state', '')
    setValue('city', '')
  }
})

const states = computed(() => {
  // Return states based on selected country
  return getStatesForCountry(country.value)
})
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <select v-bind="register('country')">
      <option value="">Select country</option>
      <option value="us">United States</option>
      <option value="ca">Canada</option>
    </select>

    <select v-bind="register('state')" :disabled="!country">
      <option value="">Select state</option>
      <option v-for="s in states" :key="s.code" :value="s.code">
        {{ s.name }}
      </option>
    </select>

    <input v-bind="register('city')" :disabled="!country" />
  </form>
</template>
```

## Show/Hide vs v-if

Use `v-show` to keep field state when hiding, `v-if` to reset:

```vue
<!-- v-show: keeps field registered and value preserved -->
<div v-show="showOptionalFields">
  <input v-bind="register('optional')" />
</div>

<!-- v-if: unregisters field and clears value when hidden -->
<div v-if="showOptionalFields">
  <input v-bind="register('optional')" />
</div>
```

## Next Steps

- Learn about [Form Context](/guide/advanced/form-context) for complex forms
- Explore [Watch](/guide/advanced/watch) for reactive field values
