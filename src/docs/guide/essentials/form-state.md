# Form State

Track the current state of your form with the reactive `formState` object.

## Accessing Form State

```typescript
const { formState } = useForm({ schema })

// Access with .value (it's a ref)
console.log(formState.value.isSubmitting)
console.log(formState.value.errors)
```

## Available Properties

### errors

Object containing validation errors for each field:

```typescript
formState.value.errors
// { email?: string, password?: string, ... }
```

```vue
<template>
  <span v-if="formState.value.errors.email">
    {{ formState.value.errors.email }}
  </span>
</template>
```

### isDirty

`true` if any field value differs from the default values:

```typescript
formState.value.isDirty // boolean
```

```vue
<template>
  <button type="submit" :disabled="!formState.value.isDirty">Save Changes</button>
</template>
```

### isValid

`true` if the form has no validation errors:

```typescript
formState.value.isValid // boolean
```

::: tip
This is updated after validation runs. With `mode: 'onSubmit'`, it may be `true` until the first submission attempt.
:::

### isSubmitting

`true` while the form is being submitted:

```typescript
formState.value.isSubmitting // boolean
```

```vue
<template>
  <button type="submit" :disabled="formState.value.isSubmitting">
    {{ formState.value.isSubmitting ? 'Submitting...' : 'Submit' }}
  </button>
</template>
```

### isSubmitted

`true` after the form has been submitted at least once:

```typescript
formState.value.isSubmitted // boolean
```

Useful for showing errors only after first submission attempt.

### isSubmitSuccessful

`true` if the last submission was successful (no errors):

```typescript
formState.value.isSubmitSuccessful // boolean
```

### submitCount

Number of times the form has been submitted:

```typescript
formState.value.submitCount // number
```

### touchedFields

Set of fields that have been interacted with (blurred):

```typescript
formState.value.touchedFields // Set<string>

// Check if specific field was touched
formState.value.touchedFields.has('email') // boolean
```

```vue
<template>
  <!-- Only show error after user interacts with field -->
  <span v-if="formState.value.touchedFields.has('email') && formState.value.errors.email">
    {{ formState.value.errors.email }}
  </span>
</template>
```

### dirtyFields

Set of fields that have been modified from their default values:

```typescript
formState.value.dirtyFields // Set<string>

// Check if specific field is dirty
formState.value.dirtyFields.has('email') // boolean
```

## Common Patterns

### Conditional Submit Button

```vue
<template>
  <button type="submit" :disabled="!formState.value.isDirty || formState.value.isSubmitting">
    {{ formState.value.isSubmitting ? 'Saving...' : 'Save' }}
  </button>
</template>
```

### Unsaved Changes Warning

```vue
<script setup>
import { onBeforeUnmount } from 'vue'

const { formState } = useForm({ schema })

// Warn before leaving with unsaved changes
const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  if (formState.value.isDirty) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnloadHandler)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})
</script>
```

### Show Errors After Submission

```vue
<template>
  <div>
    <input v-bind="register('email')" />
    <!-- Only show error after form has been submitted -->
    <span v-if="formState.value.isSubmitted && formState.value.errors.email">
      {{ formState.value.errors.email }}
    </span>
  </div>
</template>
```

### Success Message

```vue
<template>
  <div v-if="formState.value.isSubmitSuccessful" class="success">Form submitted successfully!</div>
  <form v-else @submit="handleSubmit(onSubmit)">
    <!-- Form fields -->
  </form>
</template>
```

### Progress Indicator

```vue
<template>
  <div class="form-wrapper">
    <div v-if="formState.value.isSubmitting" class="loading-overlay">
      <span class="spinner"></span>
      <p>Submitting...</p>
    </div>
    <form @submit="handleSubmit(onSubmit)">
      <!-- Form fields -->
    </form>
  </div>
</template>
```

## Resetting Form State

The `reset` function clears all form state:

```typescript
const { reset } = useForm({ schema })

// Reset to default values
reset()

// Reset to new values
reset({
  email: 'new@example.com',
  name: 'New Name',
})
```

After reset:

- All values return to defaults (or provided values)
- `errors` is cleared
- `isDirty` becomes `false`
- `touchedFields` is cleared
- `dirtyFields` is cleared
- `submitCount` remains unchanged

## Next Steps

- Learn about [Submission](/guide/essentials/submission) handling
- Explore [Error Handling](/guide/essentials/error-handling) patterns
