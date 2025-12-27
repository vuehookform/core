# Vue Hook Form - Code Patterns

Copy-paste ready code templates for common form scenarios.

## Table of Contents

- [Basic Forms](#basic-forms)
- [Field Registration](#field-registration)
- [Validation Modes](#validation-modes)
- [Error Handling](#error-handling)
- [Field Arrays](#field-arrays)
- [Form State](#form-state)
- [Async Operations](#async-operations)
- [Form Context](#form-context)
- [Advanced Patterns](#advanced-patterns)

---

## Basic Forms

### Simple Login Form

```typescript
import { useForm } from 'vue-hook-form'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const { register, handleSubmit, formState } = useForm({
  schema,
  defaultValues: { email: '', password: '' },
})

const onSubmit = (data: z.infer<typeof schema>) => {
  console.log('Form submitted:', data)
}
```

```vue
<template>
  <form @submit.prevent="handleSubmit(onSubmit)">
    <div>
      <label>Email</label>
      <input v-bind="register('email')" type="email" />
      <span v-if="formState.value.errors.email">
        {{ formState.value.errors.email }}
      </span>
    </div>

    <div>
      <label>Password</label>
      <input v-bind="register('password')" type="password" />
      <span v-if="formState.value.errors.password">
        {{ formState.value.errors.password }}
      </span>
    </div>

    <button type="submit" :disabled="formState.value.isSubmitting">
      {{ formState.value.isSubmitting ? 'Submitting...' : 'Login' }}
    </button>
  </form>
</template>
```

### Registration Form with Nested Object

```typescript
const schema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
  profile: z.object({
    firstName: z.string().min(1, 'First name required'),
    lastName: z.string().min(1, 'Last name required'),
    bio: z.string().max(500).optional(),
  }),
})

const { register, handleSubmit, formState } = useForm({
  schema,
  defaultValues: {
    username: '',
    email: '',
    password: '',
    profile: {
      firstName: '',
      lastName: '',
      bio: '',
    },
  },
})
```

```vue
<template>
  <form @submit.prevent="handleSubmit(onSubmit)">
    <input v-bind="register('username')" placeholder="Username" />
    <input v-bind="register('email')" type="email" placeholder="Email" />
    <input v-bind="register('password')" type="password" placeholder="Password" />

    <!-- Nested object fields use dot notation -->
    <input v-bind="register('profile.firstName')" placeholder="First Name" />
    <input v-bind="register('profile.lastName')" placeholder="Last Name" />
    <textarea v-bind="register('profile.bio')" placeholder="Bio (optional)" />

    <button type="submit">Register</button>
  </form>
</template>
```

---

## Field Registration

### Uncontrolled (Default)

Best for native HTML inputs. Values sync on blur.

```vue
<template>
  <input v-bind="register('email')" type="email" />
</template>
```

### Controlled Mode

Required for Vue components with v-model or when you need reactive values.

```typescript
const { value, ...bindings } = register('country', { controlled: true })
```

```vue
<template>
  <!-- For custom Vue components -->
  <CustomSelect v-model="value" v-bind="bindings" :options="countries" />

  <!-- Or for native inputs when you need reactive access -->
  <input v-model="value" v-bind="bindings" type="text" />
</template>
```

### Disabled Field

```typescript
register('readOnlyField', { disabled: true })
```

### Per-Field Unregister

```typescript
// Field value removed when component unmounts
register('temporaryField', { shouldUnregister: true })
```

---

## Validation Modes

### On Submit (Default)

Validates only when form is submitted.

```typescript
const { register, handleSubmit } = useForm({
  schema,
  defaultValues,
  mode: 'onSubmit', // default
})
```

### On Blur

Validates when field loses focus. Good balance of feedback and performance.

```typescript
const { register, handleSubmit } = useForm({
  schema,
  defaultValues,
  mode: 'onBlur',
})
```

### On Change

Validates on every input. Real-time feedback but more resource intensive.

```typescript
const { register, handleSubmit } = useForm({
  schema,
  defaultValues,
  mode: 'onChange',
})
```

### On Touched

Validates after field has been touched (blur), then on every change.

```typescript
const { register, handleSubmit } = useForm({
  schema,
  defaultValues,
  mode: 'onTouched',
})
```

### Submit First, Then Real-Time

Common pattern: validate on submit first, then show real-time feedback.

```typescript
const { register, handleSubmit } = useForm({
  schema,
  defaultValues,
  mode: 'onSubmit',
  reValidateMode: 'onChange',
})
```

---

## Error Handling

### Display Field Errors

```vue
<template>
  <div>
    <input v-bind="register('email')" />
    <span v-if="formState.value.errors.email" class="error">
      {{ formState.value.errors.email }}
    </span>
  </div>
</template>
```

### Display Nested Field Errors

```vue
<template>
  <div>
    <input v-bind="register('address.city')" />
    <span v-if="formState.value.errors['address.city']" class="error">
      {{ formState.value.errors['address.city'] }}
    </span>
  </div>
</template>
```

### Set Manual Errors

```typescript
const { setError, setErrors, clearErrors } = useForm({ schema, defaultValues })

// Single field
setError('email', { message: 'Email already registered' })

// Multiple fields
setErrors({
  email: 'Email already registered',
  username: 'Username taken',
})

// Clear all errors
clearErrors()

// Clear specific field
clearErrors('email')

// Clear multiple fields
clearErrors(['email', 'username'])
```

### Server-Side Validation Errors

```typescript
const serverErrors = ref<Record<string, string>>({})

const { handleSubmit } = useForm({
  schema,
  defaultValues,
  errors: serverErrors, // Sync external errors
})

const onSubmit = async (data) => {
  try {
    await api.submit(data)
  } catch (err) {
    if (err.fieldErrors) {
      serverErrors.value = err.fieldErrors
    }
  }
}
```

### Collect All Errors (Not Just First)

```typescript
const { formState } = useForm({
  schema,
  defaultValues,
  criteriaMode: 'all',
})

// Access all errors for a field
// formState.value.errors.email.types = { email: 'Invalid email', min: 'Too short' }
```

### Delayed Error Display

```typescript
const { register, formState } = useForm({
  schema,
  defaultValues,
  mode: 'onChange',
  delayError: 500, // Show errors after 500ms of no typing
})
```

---

## Field Arrays

### Basic Field Array

```typescript
const schema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1, 'Name required'),
      quantity: z.number().min(1, 'Min 1'),
    }),
  ),
})

const { fields, register, formState } = useForm({
  schema,
  defaultValues: {
    items: [{ name: '', quantity: 1 }], // REQUIRED: Initialize array
  },
})

// Get field array manager
const itemFields = fields('items')
```

```vue
<template>
  <div v-for="field in itemFields.value" :key="field.key">
    <!-- CRITICAL: Use field.key for :key, NOT index -->
    <input v-bind="register(`items.${field.index}.name`)" />
    <input v-bind="register(`items.${field.index}.quantity`)" type="number" />
    <button @click="field.remove()">Remove</button>
  </div>

  <button @click="itemFields.append({ name: '', quantity: 1 })">Add Item</button>
</template>
```

### Field Array Operations

```typescript
const items = fields('items')

// Add items
items.append({ name: '', quantity: 1 }) // Add to end
items.append([{ name: 'A' }, { name: 'B' }]) // Add multiple
items.prepend({ name: '', quantity: 1 }) // Add to start
items.insert(2, { name: '', quantity: 1 }) // Insert at index

// Remove items
items.remove(0) // Remove at index
items.removeMany([0, 2, 4]) // Remove multiple
items.removeAll() // Clear all

// Reorder items
items.swap(0, 2) // Swap positions
items.move(0, 3) // Move item

// Update items
items.update(0, { name: 'Updated', quantity: 5 }) // Replace item
items.replace([{ name: 'New' }]) // Replace all
```

### Handle Failed Operations

All operations return `boolean` - `false` if rejected due to rules.

```typescript
const items = fields('items', {
  rules: { minLength: 1, maxLength: 5 },
})

const success = items.append({ name: 'test' })
if (!success) {
  console.log('Cannot add: max items reached')
}

const removed = items.remove(0)
if (!removed) {
  console.log('Cannot remove: minimum items required')
}
```

### Nested Field Arrays

```typescript
const schema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
        }),
      ),
    }),
  ),
})

const { fields, register } = useForm({
  schema,
  defaultValues: {
    sections: [{ title: '', items: [{ name: '' }] }],
  },
})

const sections = fields('sections')
```

```vue
<template>
  <div v-for="section in sections.value" :key="section.key">
    <input v-bind="register(`sections.${section.index}.title`)" />

    <!-- Nested array: must call fields() for each section -->
    <div v-for="item in fields(`sections.${section.index}.items`).value" :key="item.key">
      <input v-bind="register(`sections.${section.index}.items.${item.index}.name`)" />
    </div>
  </div>
</template>
```

---

## Form State

### Available State Properties

```typescript
const { formState } = useForm({ schema, defaultValues })

// Access in template: formState.value.propertyName
formState.value.errors // Record<string, string>
formState.value.isDirty // boolean - any field changed
formState.value.isValid // boolean - no validation errors
formState.value.isSubmitting // boolean - submission in progress
formState.value.isLoading // boolean - async defaultValues loading
formState.value.isReady // boolean - form ready for interaction
formState.value.isValidating // boolean - validation in progress
formState.value.isSubmitted // boolean - form has been submitted
formState.value.isSubmitSuccessful // boolean - last submit succeeded
formState.value.submitCount // number - times submitted
formState.value.touchedFields // Record<string, boolean>
formState.value.dirtyFields // Record<string, boolean>
```

### Get Individual Field State

```typescript
const { getFieldState } = useForm({ schema, defaultValues })

const emailState = getFieldState('email')
// { isDirty: boolean, isTouched: boolean, invalid: boolean, error: string | undefined }
```

### Watch Values Reactively

```typescript
const { watch } = useForm({ schema, defaultValues })

// Watch all values
const allValues = watch()

// Watch single field
const email = watch('email')

// Watch multiple fields
const credentials = watch(['email', 'password'])

// Use in template or computed
```

```vue
<template>
  <p>Email: {{ watch('email').value }}</p>
  <p>Form data: {{ watch().value }}</p>
</template>
```

### Get Values Non-Reactively

```typescript
const { getValues } = useForm({ schema, defaultValues })

// In event handlers or one-time reads
const allData = getValues()
const email = getValues('email')
const subset = getValues(['email', 'password'])
```

---

## Async Operations

### Async Default Values

```typescript
const { formState } = useForm({
  schema,
  defaultValues: async () => {
    const user = await fetchUser()
    return {
      email: user.email,
      name: user.name,
    }
  },
  onDefaultValuesError: (err) => {
    console.error('Failed to load:', err)
  },
})
```

```vue
<template>
  <div v-if="formState.value.isLoading">Loading form data...</div>
  <form v-else @submit.prevent="handleSubmit(onSubmit)">
    <!-- Form fields -->
  </form>
</template>
```

### Async Custom Validation

```typescript
register('username', {
  validate: async (value) => {
    const exists = await api.checkUsername(value)
    return exists ? 'Username is taken' : undefined
  },
  validateDebounce: 300, // Debounce API calls
})
```

### Async Form Submission

```typescript
const { handleSubmit, formState } = useForm({ schema, defaultValues })

const onSubmit = async (data: z.infer<typeof schema>) => {
  // formState.value.isSubmitting is true during this
  await api.submit(data)
}

const onError = (errors: Record<string, string>) => {
  console.log('Validation failed:', errors)
}
```

```vue
<template>
  <form @submit.prevent="handleSubmit(onSubmit, onError)">
    <!-- fields -->
    <button type="submit" :disabled="formState.value.isSubmitting">
      {{ formState.value.isSubmitting ? 'Saving...' : 'Submit' }}
    </button>
  </form>
</template>
```

---

## Form Context

### Provide Form to Children

```typescript
// Parent.vue
import { useForm, provideForm } from 'vue-hook-form'

const form = useForm({ schema, defaultValues })
provideForm(form)
```

### Consume Form in Child Components

```typescript
// ChildField.vue
import { useFormContext } from 'vue-hook-form'

const { register, formState } = useFormContext()
```

```vue
<template>
  <input v-bind="register('email')" />
  <span v-if="formState.value.errors.email">
    {{ formState.value.errors.email }}
  </span>
</template>
```

### Watch Values in Child (Standalone)

```typescript
// DeepChild.vue
import { useWatch } from 'vue-hook-form'

const email = useWatch({ name: 'email' })
```

```vue
<template>
  <p>Current email: {{ email.value }}</p>
</template>
```

---

## Advanced Patterns

### Dependent Field Validation

```typescript
register('confirmPassword', {
  deps: ['password'], // Re-validate when password changes
  validate: (value) => {
    const password = getValues('password')
    return value !== password ? 'Passwords must match' : undefined
  },
})
```

### Multi-Step Form Validation

```typescript
const currentStep = ref(1)
const stepFields = {
  1: ['firstName', 'lastName'],
  2: ['email', 'phone'],
  3: ['address.street', 'address.city'],
}

async function nextStep() {
  const fieldsToValidate = stepFields[currentStep.value]
  const isValid = await trigger(fieldsToValidate)
  if (isValid) {
    currentStep.value++
  }
}

async function prevStep() {
  currentStep.value--
}
```

### External Values Sync

```typescript
const externalValues = ref({ email: '', name: '' })

const { formState } = useForm({
  schema,
  defaultValues: { email: '', name: '' },
  values: externalValues, // Form syncs when this changes
})

// Update from external source
externalValues.value = await fetchUserData()
```

### Programmatic Value Setting

```typescript
const { setValue, reset, resetField } = useForm({ schema, defaultValues })

// Set single value
setValue('email', 'new@example.com')

// Set with options
setValue('email', 'new@example.com', {
  shouldValidate: true, // Validate after setting
  shouldDirty: false, // Don't mark as dirty
  shouldTouch: true, // Mark as touched
})

// Set nested value
setValue('address.city', 'New York')

// Reset entire form
reset()
reset({ email: 'fresh@example.com' })
reset(undefined, { keepErrors: true })

// Reset single field
resetField('email')
resetField('email', { defaultValue: 'new@default.com' })
```

### Focus Management

```typescript
const { setFocus } = useForm({ schema, defaultValues })

// Focus a field programmatically
setFocus('email')

// Focus with options
setFocus('email', { shouldSelect: true }) // Select text too
```

### Conditional Fields

```typescript
const { register, watch, unregister } = useForm({ schema, defaultValues })

const hasAddress = watch('hasAddress')
```

```vue
<template>
  <label>
    <input type="checkbox" v-bind="register('hasAddress')" />
    Has shipping address
  </label>

  <div v-if="hasAddress.value">
    <input v-bind="register('address.street', { shouldUnregister: true })" />
    <input v-bind="register('address.city', { shouldUnregister: true })" />
  </div>
</template>
```

---

## Quick Reference: Path Syntax

```
CORRECT                          WRONG
─────────────────────────────────────────────────
'email'                          ''
'user.name'                      'user..name'
'addresses.0.street'             'addresses[0].street'
`items.${index}.name`            `items[${index}].name`
```

Always use **dot notation** for array indices, never bracket notation.
