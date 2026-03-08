# Error Handling

Learn how to display and manage validation errors effectively.

## Accessing Errors

Errors are available through `formState.value.errors`:

```vue
<script setup lang="ts">
const { register, formState } = useForm({ schema })
</script>

<template>
  <div>
    <input v-bind="register('email')" type="email" />
    <span v-if="formState.value.errors.email" class="error">
      {{ formState.value.errors.email }}
    </span>
  </div>
</template>
```

## Error Structure

Errors mirror your schema structure:

```typescript
const schema = z.object({
  email: z.email(),
  profile: z.object({
    name: z.string(),
    bio: z.string(),
  }),
  items: z.array(
    z.object({
      title: z.string(),
    }),
  ),
})

// Accessing errors
formState.value.errors.email // string | undefined
formState.value.errors.profile?.name // string | undefined
formState.value.errors.items?.[0]?.title // string | undefined
```

## Error Display Patterns

### Inline Errors

Show errors next to each field:

```vue
<template>
  <div class="field">
    <label for="email">Email</label>
    <input
      id="email"
      v-bind="register('email')"
      :class="{ 'input-error': formState.value.errors.email }"
    />
    <p v-if="formState.value.errors.email" class="error-message">
      {{ formState.value.errors.email }}
    </p>
  </div>
</template>

<style>
.input-error {
  border-color: red;
}
.error-message {
  color: red;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>
```

### Error Summary

Show all errors at the top of the form:

```vue
<template>
  <form @submit="handleSubmit(onSubmit)">
    <div v-if="Object.keys(formState.value.errors).length" class="error-summary">
      <h3>Please fix the following errors:</h3>
      <ul>
        <li v-for="(error, field) in formState.value.errors" :key="field">
          {{ field }}: {{ error }}
        </li>
      </ul>
    </div>

    <!-- Form fields -->
  </form>
</template>
```

### Reusable Error Component

Create a reusable component for consistent error display:

```vue
<!-- FormError.vue -->
<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <p v-if="message" class="form-error" role="alert">
    {{ message }}
  </p>
</template>

<style scoped>
.form-error {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>
```

Usage:

```vue
<template>
  <input v-bind="register('email')" />
  <FormError :message="formState.value.errors.email" />
</template>
```

## Field-Level Error State

Track if a field has been touched before showing errors:

```vue
<template>
  <input v-bind="register('email')" />
  <!-- Only show error after user has interacted with field -->
  <span v-if="formState.value.touchedFields.has('email') && formState.value.errors.email">
    {{ formState.value.errors.email }}
  </span>
</template>
```

## Clearing Errors

### Clear Specific Fields

Use `clearErrors` to remove errors programmatically:

```typescript
const { clearErrors } = useForm({ schema })

// Clear single field
clearErrors('email')

// Clear multiple fields
clearErrors(['email', 'password'])

// Clear root-level error
clearErrors('root')

// Clear all errors
clearErrors()
```

### Reset Entire Form

```typescript
const { reset } = useForm({ schema })

// Clear all errors and values
reset()

// Reset with new values
reset({
  email: 'new@example.com',
})
```

## Setting Errors Programmatically

### Single Error

```typescript
const { setError } = useForm({ schema })

// Set field error
setError('email', { message: 'Email already exists' })

// Set with type
setError('email', { type: 'server', message: 'Email already exists' })

// Set root-level error (form-wide)
setError('root', { message: 'Submission failed. Please try again.' })
```

### Multiple Errors

Use `setErrors` to set multiple field errors at once:

```typescript
const { setErrors } = useForm({ schema })

// Set multiple errors (merged with existing)
setErrors({
  email: 'Email already exists',
  username: { type: 'server', message: 'Username is taken' },
})

// Replace all errors
setErrors(
  {
    email: 'Invalid email',
  },
  { shouldReplace: true },
)
```

### Server Error Integration

For complete server error handling patterns including the `errors` option and `setErrors`, see [Async Patterns - Server Error Integration](/guide/advanced/async-patterns#server-error-integration).

## Persistent Errors

By default, errors set via `setError` are cleared when validation runs. Use `persistent: true` to create errors that survive validation - useful for server-side validation errors that should remain visible until explicitly cleared.

### Setting Persistent Errors

```typescript
const { setError, clearErrors } = useForm({ schema })

// Set a persistent server-side error
setError('email', { message: 'Email already exists', persistent: true })

// Even if the user changes the email and triggers validation,
// this error stays until explicitly cleared
```

### When to Use Persistent Errors

Persistent errors are ideal for:

- **Server-side validation**: Errors returned from your API that shouldn't disappear on client-side re-validation
- **Async uniqueness checks**: "Username is taken" should persist until the user tries a different value
- **Form-wide submission errors**: Root-level errors that should stay visible

### Example: Server Validation

```typescript
const onSubmit = async (data) => {
  try {
    await api.register(data)
  } catch (error) {
    if (error.response?.status === 400) {
      const serverErrors = error.response.data.errors

      // Set server errors as persistent
      for (const [field, message] of Object.entries(serverErrors)) {
        setError(field, { message, persistent: true })
      }
    }
  }
}

// Later, when user retries after fixing the issue:
const retrySubmit = () => {
  // Clear persistent errors before new submission attempt
  clearErrors()
  handleSubmit(onSubmit)
}
```

### Clearing Persistent Errors

Persistent errors are cleared by:

- Calling `clearErrors()` (clears all)
- Calling `clearErrors('fieldName')` (clears specific field)
- Calling `reset()` (resets entire form)

```typescript
// Clear specific persistent error
clearErrors('email')

// Clear all errors including persistent ones
clearErrors()
```

::: warning
Persistent errors will NOT be cleared by:

- Schema validation (trigger, handleSubmit)
- User input changes triggering re-validation
- setValue with shouldValidate: true
  :::

### Clearing Persistent Errors on User Correction

For a better user experience, you may want to clear a persistent server error when the user changes the field value. Use `watch()` to monitor field changes:

```typescript
const { setError, clearErrors, watch, handleSubmit } = useForm({ schema })

// Watch the email field and clear its persistent error when it changes
watch('email', () => {
  clearErrors('email')
})

const onSubmit = async (data) => {
  try {
    await api.register(data)
  } catch (error) {
    if (error.response?.data?.field === 'email') {
      setError('email', {
        message: error.response.data.message,
        persistent: true,
      })
    }
  }
}
```

This pattern ensures server-side errors persist until the user actively tries to correct them.

## Checking for Errors

### hasErrors

Check if specific fields or the entire form has errors:

```typescript
const { hasErrors } = useForm({ schema })

// Check if form has any errors
if (hasErrors()) {
  console.log('Form has errors')
}

// Check specific field
if (hasErrors('email')) {
  console.log('Email field has an error')
}

// Check root errors
if (hasErrors('root')) {
  console.log('Form has a root-level error')
}
```

### getErrors

Retrieve errors programmatically:

```typescript
const { getErrors } = useForm({ schema })

// Get all errors
const allErrors = getErrors()

// Get specific field error
const emailError = getErrors('email')
```

## Criteria Mode: All Errors

By default, only the first error per field is shown. Use `criteriaMode: 'all'` to collect all validation errors:

```typescript
import { useForm, isFieldError } from '@vuehookform/core'

const { register, formState } = useForm({
  schema,
  criteriaMode: 'all', // Collect all errors
})
```

When `criteriaMode: 'all'` is set, errors are `FieldError` objects with a `types` property:

```vue
<template>
  <div>
    <input v-bind="register('password')" type="password" />

    <!-- Display all password requirements -->
    <ul v-if="isFieldError(formState.value.errors.password)">
      <li v-for="(messages, type) in formState.value.errors.password.types" :key="type">
        {{ Array.isArray(messages) ? messages.join(', ') : messages }}
      </li>
    </ul>
  </div>
</template>
```

This is useful for password requirements or complex validation where users need to see all issues at once.

### isFieldError Type Guard

Use `isFieldError` to safely check if an error is a structured `FieldError`:

```typescript
import { isFieldError } from '@vuehookform/core'

const error = formState.value.errors.email

if (isFieldError(error)) {
  // Structured error with type, message, and optional types
  console.log(error.type, error.message, error.types)
} else if (typeof error === 'string') {
  // Simple string error
  console.log(error)
}
```

## Nested Object Errors

For nested fields, access errors through the nested path:

```vue
<script setup>
const schema = z.object({
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
  }),
})

const { register, formState } = useForm({ schema })
</script>

<template>
  <div>
    <input v-bind="register('address.street')" />
    <span v-if="formState.value.errors.address?.street">
      {{ formState.value.errors.address.street }}
    </span>
  </div>

  <div>
    <input v-bind="register('address.city')" />
    <span v-if="formState.value.errors.address?.city">
      {{ formState.value.errors.address.city }}
    </span>
  </div>
</template>
```

## Array Field Errors

For field arrays, use the index to access errors:

```vue
<script setup>
const schema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1, 'Name required'),
    }),
  ),
})

const { register, formState, fields } = useForm({ schema })
const items = fields('items')
</script>

<template>
  <div v-for="field in items.value" :key="field.key">
    <input v-bind="register(`items.${field.index}.name`)" />
    <span v-if="formState.value.errors.items?.[field.index]?.name">
      {{ formState.value.errors.items[field.index].name }}
    </span>
  </div>
</template>
```

## Accessibility

Make errors accessible to screen readers:

```vue
<template>
  <div>
    <label for="email">Email</label>
    <input
      id="email"
      v-bind="register('email')"
      :aria-invalid="!!formState.value.errors.email"
      :aria-describedby="formState.value.errors.email ? 'email-error' : undefined"
    />
    <p v-if="formState.value.errors.email" id="email-error" role="alert" class="error">
      {{ formState.value.errors.email }}
    </p>
  </div>
</template>
```

## Next Steps

- Learn about [Form State](/guide/essentials/form-state) for additional form status tracking
- Explore [Validation](/guide/essentials/validation) strategies
