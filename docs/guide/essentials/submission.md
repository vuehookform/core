# Submission

Handle form submission with validation, loading states, and error handling.

## Basic Submission

Use `handleSubmit` to wrap your submission handler:

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  email: z.email(),
  message: z.string().min(10),
})

const { register, handleSubmit } = useForm({ schema })

const onSubmit = (data: z.infer<typeof schema>) => {
  console.log('Valid data:', data)
  // data is fully typed: { email: string, message: string }
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <input v-bind="register('email')" type="email" />
    <textarea v-bind="register('message')"></textarea>
    <button type="submit">Send</button>
  </form>
</template>
```

## How handleSubmit Works

1. Prevents the default form submission
2. Syncs values from uncontrolled inputs
3. Validates all fields against the schema
4. If valid, calls your handler with typed data
5. If invalid, populates `formState.value.errors` and auto-focuses first error field
6. Manages `isSubmitting` state automatically
7. Sets `isSubmitSuccessful` after successful submission

### Auto-Focus on Error

By default, the first field with an error is focused after validation fails:

```typescript
const { handleSubmit } = useForm({
  schema,
  shouldFocusError: true, // Default: true
})
```

Disable this behavior:

```typescript
const { handleSubmit } = useForm({
  schema,
  shouldFocusError: false, // Don't auto-focus errors
})
```

## Async Submission

Handle async operations like API calls:

```typescript
const onSubmit = async (data: z.infer<typeof schema>) => {
  // formState.value.isSubmitting is true during this
  const response = await fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Submission failed')
  }

  // formState.value.isSubmitSuccessful is true after this
}
```

```vue
<template>
  <form @submit="handleSubmit(onSubmit)">
    <!-- fields -->
    <button type="submit" :disabled="formState.value.isSubmitting">
      {{ formState.value.isSubmitting ? 'Sending...' : 'Send' }}
    </button>
  </form>
</template>
```

## Error Handling

### Validation Errors

Validation errors are automatically populated:

```vue
<template>
  <form @submit="handleSubmit(onSubmit)">
    <input v-bind="register('email')" />
    <span v-if="formState.value.errors.email">
      {{ formState.value.errors.email }}
    </span>
    <button type="submit">Submit</button>
  </form>
</template>
```

### Server Errors

Handle server-side errors manually:

```vue
<script setup>
import { ref } from 'vue'

const serverError = (ref < string) | (null > null)

const onSubmit = async (data) => {
  serverError.value = null

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      serverError.value = error.message
      return
    }

    // Success handling
  } catch (error) {
    serverError.value = 'An unexpected error occurred'
  }
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <div v-if="serverError" class="error-banner">
      {{ serverError }}
    </div>
    <!-- fields -->
  </form>
</template>
```

### Server Validation Errors

Map server validation errors back to fields:

```typescript
const { setError } = useForm({ schema })

const onSubmit = async (data) => {
  const response = await fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errors = await response.json()

    // Set field-specific errors from server
    if (errors.email) {
      setError('email', errors.email)
    }
    if (errors.username) {
      setError('username', errors.username)
    }
    return
  }
}
```

## Invalid Submission Handler

Handle cases where validation fails:

```typescript
const onSubmit = (data) => {
  // Only called if valid
  console.log('Valid:', data)
}

const onInvalid = (errors) => {
  // Called when validation fails
  console.log('Errors:', errors)
}

// In template
handleSubmit(onSubmit, onInvalid)
```

```vue
<template>
  <form @submit="handleSubmit(onSubmit, onInvalid)">
    <!-- fields -->
  </form>
</template>
```

## Reset After Submission

Clear the form after successful submission:

```typescript
const { handleSubmit, reset } = useForm({ schema })

const onSubmit = async (data) => {
  await submitData(data)
  reset() // Clear form
}
```

Or reset with new values:

```typescript
const onSubmit = async (data) => {
  const result = await submitData(data)
  reset({
    id: result.id,
    // Pre-populate with server response
  })
}
```

## Preventing Double Submission

The `isSubmitting` state prevents accidental double submissions:

```vue
<template>
  <button
    type="submit"
    :disabled="formState.value.isSubmitting"
    :class="{ 'opacity-50': formState.value.isSubmitting }"
  >
    <span v-if="formState.value.isSubmitting">
      <LoadingSpinner />
      Processing...
    </span>
    <span v-else>Submit</span>
  </button>
</template>
```

## Complete Example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.email(),
  message: z.string().min(10),
})

const serverError = ref<string | null>(null)
const submitted = ref(false)

const { register, handleSubmit, formState, reset } = useForm({
  schema,
  mode: 'onBlur',
})

const onSubmit = async (data: z.infer<typeof schema>) => {
  serverError.value = null

  try {
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    submitted.value = true
    reset()
  } catch (error) {
    serverError.value = 'Failed to send message. Please try again.'
  }
}

const onInvalid = () => {
  // Scroll to first error
  const firstError = document.querySelector('.error')
  firstError?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div v-if="submitted" class="success">
    <h2>Thank you!</h2>
    <p>Your message has been sent.</p>
    <button @click="submitted = false">Send another</button>
  </div>

  <form v-else @submit="handleSubmit(onSubmit, onInvalid)">
    <div v-if="serverError" class="error-banner">
      {{ serverError }}
    </div>

    <div class="field">
      <label for="name">Name</label>
      <input id="name" v-bind="register('name')" />
      <span v-if="formState.value.errors.name" class="error">
        {{ formState.value.errors.name }}
      </span>
    </div>

    <div class="field">
      <label for="email">Email</label>
      <input id="email" v-bind="register('email')" type="email" />
      <span v-if="formState.value.errors.email" class="error">
        {{ formState.value.errors.email }}
      </span>
    </div>

    <div class="field">
      <label for="message">Message</label>
      <textarea id="message" v-bind="register('message')" rows="4"></textarea>
      <span v-if="formState.value.errors.message" class="error">
        {{ formState.value.errors.message }}
      </span>
    </div>

    <button type="submit" :disabled="formState.value.isSubmitting">
      {{ formState.value.isSubmitting ? 'Sending...' : 'Send Message' }}
    </button>
  </form>
</template>
```

## Next Steps

- Learn about [Controlled Inputs](/guide/components/controlled-inputs) for custom components
- Explore [Field Arrays](/guide/dynamic/field-arrays) for dynamic forms
