# Async Patterns

Handle asynchronous operations like loading form data from APIs, async validation, and server error integration.

## Async Default Values

Load initial form values from an API or database:

```vue
<script setup>
import { useForm } from '@vuehookform/core'

const { register, handleSubmit, formState } = useForm({
  schema,
  defaultValues: async () => {
    const response = await fetch('/api/user/profile')
    return response.json()
  },
})
</script>

<template>
  <!-- Show loading state while fetching -->
  <div v-if="formState.value.isLoading" class="loading">Loading form data...</div>

  <form v-else @submit="handleSubmit(onSubmit)">
    <input v-bind="register('name')" />
    <input v-bind="register('email')" />
    <button type="submit">Save</button>
  </form>
</template>
```

### Loading States

The form provides two properties to track async loading:

| Property    | Type      | Description                                                     |
| ----------- | --------- | --------------------------------------------------------------- |
| `isLoading` | `boolean` | `true` while fetching async default values                      |
| `isReady`   | `boolean` | `true` once initialization is complete (inverse of `isLoading`) |

```vue
<script setup>
const { formState } = useForm({
  schema,
  defaultValues: async () => fetchUserData(),
})

// Use either property based on your preference
const loading = computed(() => formState.value.isLoading)
const ready = computed(() => formState.value.isReady)
</script>

<template>
  <div v-if="!formState.value.isReady">
    <Spinner />
  </div>
  <form v-else>...</form>
</template>
```

### Error Handling

Handle errors that occur during async default value loading:

```typescript
const { formState } = useForm({
  schema,
  defaultValues: async () => {
    const response = await fetch('/api/user/profile')
    if (!response.ok) {
      throw new Error('Failed to load profile')
    }
    return response.json()
  },
  onDefaultValuesError: (error) => {
    console.error('Failed to load form data:', error)
    // Show notification, redirect, etc.
    toast.error('Could not load your profile data')
  },
})
```

Access the error in your template via `formState.value.defaultValuesError`:

```vue
<template>
  <div v-if="formState.value.isLoading">Loading...</div>

  <div v-else-if="formState.value.defaultValuesError" class="error">
    Failed to load form data.
    <button @click="retryLoad">Retry</button>
  </div>

  <form v-else @submit="handleSubmit(onSubmit)">
    <!-- form fields -->
  </form>
</template>
```

## Async Field Validation

Validate fields asynchronously (e.g., checking username availability):

```vue
<script setup>
import { useForm } from '@vuehookform/core'

const { register, formState } = useForm({ schema })

// Custom async validator
const usernameBindings = register('username', {
  validate: async (value) => {
    if (!value || value.length < 3) return undefined

    const response = await fetch(`/api/check-username?name=${value}`)
    const { available } = await response.json()

    return available ? undefined : 'Username is already taken'
  },
})
</script>

<template>
  <div>
    <input v-bind="usernameBindings" />
    <span v-if="formState.value.validatingFields.has('username')"> Checking availability... </span>
    <span v-else-if="formState.value.errors.username" class="error">
      {{ formState.value.errors.username }}
    </span>
  </div>
</template>
```

### Debouncing Async Validation

Prevent excessive API calls during typing with `validateDebounce`:

```typescript
const usernameBindings = register('username', {
  validate: async (value) => {
    const response = await fetch(`/api/check-username?name=${value}`)
    const { available } = await response.json()
    return available ? undefined : 'Username is already taken'
  },
  validateDebounce: 500, // Wait 500ms after user stops typing
})
```

### Validation Loading States

Track which fields are currently validating:

| Property           | Type          | Description                                 |
| ------------------ | ------------- | ------------------------------------------- |
| `isValidating`     | `boolean`     | `true` if any field is currently validating |
| `validatingFields` | `Set<string>` | Set of field names currently validating     |

```vue
<script setup>
const { register, formState } = useForm({ schema })
</script>

<template>
  <form>
    <div>
      <input v-bind="register('username', { validate: checkUsername, validateDebounce: 300 })" />
      <Spinner v-if="formState.value.validatingFields.has('username')" />
    </div>

    <div>
      <input v-bind="register('email', { validate: checkEmail, validateDebounce: 300 })" />
      <Spinner v-if="formState.value.validatingFields.has('email')" />
    </div>

    <!-- Disable submit while any validation is pending -->
    <button type="submit" :disabled="formState.value.isValidating">
      {{ formState.value.isValidating ? 'Validating...' : 'Submit' }}
    </button>
  </form>
</template>
```

### Dependent Field Validation

Re-validate related fields when a field changes using `deps`:

```typescript
const { register } = useForm({ schema })

// When password changes, re-validate confirmPassword
const passwordBindings = register('password', {
  deps: ['confirmPassword'],
})

const confirmBindings = register('confirmPassword', {
  validate: (value, formValues) => {
    if (value !== formValues.password) {
      return 'Passwords do not match'
    }
    return undefined
  },
})
```

## Server Error Integration

### External Errors Option

Pass server-side validation errors into the form:

```vue
<script setup>
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'

const serverErrors = ref({})

const { register, handleSubmit, formState } = useForm({
  schema,
  errors: serverErrors, // Merge with validation errors
})

async function onSubmit(data) {
  try {
    await api.saveUser(data)
  } catch (error) {
    if (error.validationErrors) {
      // Map server errors to form fields
      serverErrors.value = error.validationErrors
    }
  }
}
</script>
```

Server errors take precedence over client-side validation errors when both exist for the same field.

### Setting Errors After Submission

Alternatively, use `setError` or `setErrors` to add server errors:

```typescript
const { setError, setErrors } = useForm({ schema })

async function onSubmit(data) {
  try {
    await api.saveUser(data)
  } catch (error) {
    if (error.field) {
      // Single field error
      setError(error.field, { message: error.message })
    } else if (error.errors) {
      // Multiple field errors
      setErrors(error.errors)
    } else {
      // Form-level error
      setError('root', { message: 'Submission failed. Please try again.' })
    }
  }
}
```

## External Values Sync

Sync form values with external state (e.g., parent component, store, or URL params):

```vue
<script setup>
import { computed } from 'vue'
import { useForm } from '@vuehookform/core'
import { useRoute } from 'vue-router'

const route = useRoute()

// Sync form with URL query params
const externalValues = computed(() => ({
  search: route.query.q || '',
  category: route.query.cat || 'all',
}))

const { register } = useForm({
  schema,
  values: externalValues, // Form syncs when this changes
})
</script>
```

Key behaviors of `values`:

- Changes to `values` update form fields without marking them as dirty
- Useful for server-fetched data that shouldn't trigger "unsaved changes" warnings
- Can be a plain object or a reactive ref/computed

### values vs defaultValues

| Feature               | `defaultValues`          | `values`              |
| --------------------- | ------------------------ | --------------------- |
| Sets initial values   | Yes                      | Yes                   |
| Marks fields as dirty | No (they match defaults) | No                    |
| Async loading support | Yes (via async function) | No (use reactive ref) |
| Re-syncs on change    | No (only on reset)       | Yes (automatically)   |

Use `defaultValues` for initial form state. Use `values` when you need continuous sync with external state.

## Complete Example

A user profile form with async loading, async validation, and server error handling:

```vue
<script setup>
import { ref } from 'vue'
import { z } from 'zod'
import { useForm } from '@vuehookform/core'

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(500).optional(),
})

const serverErrors = ref({})

const { register, handleSubmit, formState, setError } = useForm({
  schema,
  defaultValues: async () => {
    const response = await fetch('/api/profile')
    if (!response.ok) throw new Error('Failed to load profile')
    return response.json()
  },
  onDefaultValuesError: (error) => {
    console.error('Load failed:', error)
  },
  errors: serverErrors,
  mode: 'onBlur',
})

const usernameBindings = register('username', {
  validate: async (value) => {
    if (!value || value.length < 3) return undefined
    const res = await fetch(`/api/check-username?name=${value}`)
    const { available } = await res.json()
    return available ? undefined : 'Username is taken'
  },
  validateDebounce: 500,
})

async function onSubmit(data) {
  try {
    await fetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  } catch (error) {
    setError('root', { message: 'Failed to save profile' })
  }
}
</script>

<template>
  <!-- Loading state -->
  <div v-if="formState.value.isLoading" class="loading"><Spinner /> Loading your profile...</div>

  <!-- Load error state -->
  <div v-else-if="formState.value.defaultValuesError" class="error">
    <p>Could not load your profile.</p>
    <button @click="() => location.reload()">Retry</button>
  </div>

  <!-- Form ready -->
  <form v-else @submit="handleSubmit(onSubmit)">
    <!-- Root-level error -->
    <div v-if="formState.value.errors.root" class="form-error">
      {{ formState.value.errors.root.message }}
    </div>

    <div class="field">
      <label>Username</label>
      <input v-bind="usernameBindings" />
      <span v-if="formState.value.validatingFields.has('username')" class="hint">
        Checking availability...
      </span>
      <span v-else-if="formState.value.errors.username" class="error">
        {{ formState.value.errors.username }}
      </span>
    </div>

    <div class="field">
      <label>Email</label>
      <input v-bind="register('email')" type="email" />
      <span v-if="formState.value.errors.email" class="error">
        {{ formState.value.errors.email }}
      </span>
    </div>

    <div class="field">
      <label>Bio</label>
      <textarea v-bind="register('bio')"></textarea>
    </div>

    <button type="submit" :disabled="formState.value.isSubmitting || formState.value.isValidating">
      {{ formState.value.isSubmitting ? 'Saving...' : 'Save Profile' }}
    </button>
  </form>
</template>
```

## Next Steps

- Learn about [Error Handling](/guide/essentials/error-handling) patterns
- Explore [Programmatic Control](/guide/advanced/programmatic-control) for manual validation
- See [TypeScript](/guide/advanced/typescript) for type-safe async patterns
