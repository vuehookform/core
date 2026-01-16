# Programmatic Control

Control form values, validation, and state programmatically.

## setValue

Set a field value:

```typescript
const { setValue } = useForm({ schema })

// Basic usage
setValue('email', 'user@example.com')

// With options
setValue('email', 'user@example.com', {
  shouldValidate: true, // Trigger validation
  shouldDirty: true, // Mark as dirty (default)
})
```

### Common Use Cases

```typescript
// Pre-fill from API
const loadUser = async (userId: string) => {
  const user = await fetchUser(userId)
  setValue('name', user.name)
  setValue('email', user.email)
  setValue('role', user.role)
}

// Copy value from another field
const copyBillingToShipping = () => {
  const billing = getValue('billingAddress')
  setValue('shippingAddress', billing)
}

// Transform input
const handlePhoneInput = (e: Event) => {
  const raw = (e.target as HTMLInputElement).value
  const formatted = formatPhoneNumber(raw)
  setValue('phone', formatted)
}
```

## getValue

Get a single field value:

```typescript
const { getValue } = useForm({ schema })

const email = getValue('email')
const city = getValue('address.city')
const firstItem = getValue('items.0.name')
```

## getValues

Get multiple or all values:

```typescript
const { getValues } = useForm({ schema })

// All values
const allData = getValues()

// Specific fields
const { email, name } = getValues(['email', 'name'])
```

### Use with API calls

```typescript
const saveAsDraft = async () => {
  const data = getValues()
  await saveDraft(data)
}

const validateBeforeSubmit = () => {
  const { email, password } = getValues(['email', 'password'])
  if (!email || !password) {
    alert('Please fill required fields')
    return false
  }
  return true
}
```

## reset

Reset form to initial or new values:

```typescript
const { reset } = useForm({
  schema,
  defaultValues: {
    name: '',
    email: '',
  },
})

// Reset to defaultValues
reset()

// Reset with new values
reset({
  name: 'John',
  email: 'john@example.com',
})

// Partial reset (keeps other values)
reset({
  name: 'New Name',
  // email keeps its current value
})
```

### Reset Options

The `reset()` method accepts an optional second parameter with fine-grained control over what gets reset:

```typescript
reset(values?, options?: ResetOptions)

interface ResetOptions {
  keepErrors?: boolean           // Preserve validation errors
  keepDirty?: boolean            // Preserve dirty field tracking
  keepTouched?: boolean          // Preserve touched field tracking
  keepSubmitCount?: boolean      // Preserve submission count
  keepDefaultValues?: boolean    // Don't update stored defaults
  keepIsSubmitting?: boolean     // Preserve submitting state
  keepIsSubmitSuccessful?: boolean // Preserve success state
}
```

### Understanding Reset Options

::: info Validation Configuration Always Preserved
The validation schema itself is never affected by `reset()`. Only the form's **state** (values, errors, dirty/touched tracking) can be reset. Your Zod schema and validation rules remain intact.
:::

### Resetting Values While Keeping Errors

**Use case:** User wants to "start over" but you want to keep showing validation errors from a failed submission until they fix them.

```typescript
const { reset, formState, setError } = useForm({ schema })

const resetButKeepErrors = () => {
  // Reset all values to defaults, but keep error messages visible
  reset(undefined, { keepErrors: true })

  // formState.value.errors still contains previous validation errors
  // User can see what was wrong and fix it with fresh input
}
```

**Practical example - Server validation errors:**

```typescript
const onSubmit = async (data) => {
  try {
    await submitToServer(data)
  } catch (error) {
    // Server returned validation errors
    if (error.validationErrors) {
      // Show server errors as persistent (won't be cleared by client validation)
      for (const [field, message] of Object.entries(error.validationErrors)) {
        setError(field, { message, persistent: true })
      }

      // Reset values to let user start fresh, but keep errors visible
      reset(undefined, { keepErrors: true })
    }
  }
}
```

### Resetting While Preserving Interaction State

**Use case:** Load new data from server without losing track of user interaction history.

```typescript
const loadNewUserData = async (userId: string) => {
  const userData = await fetchUser(userId)

  // Reset with new values, but preserve interaction tracking
  reset(userData, {
    keepDirty: true, // Remember which fields user modified before
    keepTouched: true, // Remember which fields user interacted with
    keepSubmitCount: true, // Remember how many times form was submitted
  })
}
```

### Reset After Successful Submission

**Use case:** Clear form completely after successful submission, ready for new entry.

```typescript
const onSubmit = async (data) => {
  await submitForm(data)

  // Complete reset - form is fresh for next entry
  reset()

  // Equivalent to:
  // reset(undefined, {
  //   keepErrors: false,
  //   keepDirty: false,
  //   keepTouched: false,
  //   keepSubmitCount: false,
  //   keepDefaultValues: false,
  //   keepIsSubmitting: false,
  //   keepIsSubmitSuccessful: false
  // })
}
```

### Partial Reset with New Default Values

**Use case:** Update some fields while keeping others, and control what becomes the new "default".

```typescript
const { reset, getValues } = useForm({
  schema,
  defaultValues: { name: '', email: '', role: 'user' },
})

// Later: reset only specific fields
const resetEmailOnly = () => {
  const current = getValues()
  reset({
    ...current, // Keep current values
    email: '', // Reset only email
  })
}

// Reset values but DON'T update stored defaults
const temporaryReset = () => {
  reset(
    { name: 'Guest', email: '', role: 'guest' },
    {
      keepDefaultValues: true, // Original defaults ('', '', 'user') preserved
    },
  )

  // Later calling reset() without values will restore original defaults
}
```

### Reset Options Summary

| Option                   | Default | When to Use                                     |
| ------------------------ | ------- | ----------------------------------------------- |
| `keepErrors`             | `false` | Server errors should persist while user retries |
| `keepDirty`              | `false` | Track cumulative changes across data loads      |
| `keepTouched`            | `false` | Maintain interaction history                    |
| `keepSubmitCount`        | `false` | Track total submissions across resets           |
| `keepDefaultValues`      | `false` | Temporary data changes, want original defaults  |
| `keepIsSubmitting`       | `false` | Rarely used - edge cases with async resets      |
| `keepIsSubmitSuccessful` | `false` | Maintain success state across data refreshes    |

### Reset After Submission

```typescript
const onSubmit = async (data) => {
  await submitForm(data)
  reset() // Clear form
}
```

### Reset with API Data

```typescript
const loadForm = async (id: string) => {
  const data = await fetchFormData(id)
  reset(data)
}
```

## resetField

Reset a single field to its default value:

```typescript
const { resetField } = useForm({ schema })

// Reset field to its default value
resetField('email')

// Reset with options
resetField('email', {
  keepError: true, // Keep error
  keepDirty: true, // Keep dirty state
  keepTouched: true, // Keep touched state
  defaultValue: 'new@example.com', // Set new default
})
```

### Use Cases

```typescript
// Clear a field on certain actions
const onClearEmail = () => {
  resetField('email')
}

// Reset to a new default
const loadUserEmail = (email: string) => {
  resetField('email', { defaultValue: email })
}
```

## unregister

Remove a field from form tracking:

```typescript
const { unregister } = useForm({ schema })

// Unregister field
unregister('optionalField')

// With options
unregister('optionalField', {
  keepValue: true, // Don't clear value
  keepError: true, // Keep validation error
  keepDirty: true, // Keep dirty state
  keepTouched: true, // Keep touched state
  keepDefaultValue: true, // Keep stored default
  keepIsValid: true, // Don't re-evaluate form validity
})
```

### Use Cases

```typescript
// Remove conditional fields
const removeOptionalSection = () => {
  unregister('additionalInfo')
  unregister('notes')
}

// Remove but keep the value
const hideFieldKeepValue = () => {
  unregister('secretField', { keepValue: true })
}
```

## trigger

Manually trigger validation:

```typescript
const { trigger } = useForm({ schema })

// Validate all fields
const isValid = await trigger()

// Validate specific field
const isEmailValid = await trigger('email')

// Validate multiple fields
const areCredentialsValid = await trigger(['email', 'password'])
```

### TriggerOptions

The `trigger` method accepts an optional second parameter with options:

```typescript
// markAsSubmitted: Increment submitCount to activate reValidateMode
await trigger('email', { markAsSubmitted: true })
```

When `markAsSubmitted: true`:

- Increments `formState.submitCount`
- Activates `reValidateMode` behavior for subsequent changes
- Useful for multi-step forms where each step should activate re-validation

### Use Cases

```typescript
// Validate before moving to next step
const nextStep = async () => {
  const stepFields = ['name', 'email', 'phone']
  const isValid = await trigger(stepFields)
  if (isValid) {
    currentStep.value++
  }
}

// Validate on custom event
const onCustomBlur = async (fieldName: string) => {
  await trigger(fieldName)
}

// Pre-submission check
const canSubmit = async () => {
  return await trigger()
}
```

### Multi-Step Form Validation

Use `markAsSubmitted` to activate re-validation mode between steps:

```typescript
const { trigger, formState } = useForm({
  schema,
  mode: 'onSubmit',
  reValidateMode: 'onChange',
})

// Step 1: Personal Info
const validateStep1 = async () => {
  const isValid = await trigger(['firstName', 'lastName', 'email'], {
    markAsSubmitted: true, // Activates reValidateMode for step 1 fields
  })
  if (isValid) {
    currentStep.value = 2
  }
}

// After step 1 validation passes, any changes to step 1 fields
// will trigger immediate re-validation (reValidateMode: 'onChange')
```

## setError

Set a custom error on a field:

```typescript
const { setError } = useForm({ schema })

// Simple string message
setError('email', { message: 'This email is already registered' })

// With error type (useful for categorizing errors)
setError('email', { type: 'server', message: 'Email already exists' })

// Root-level form error
setError('root', { message: 'Submission failed. Please try again.' })

// Namespaced root errors
setError('root.serverError', { message: 'Server unavailable' })
```

### Use Cases

```typescript
// Server validation errors
const onSubmit = async (data) => {
  try {
    await submitToServer(data)
  } catch (error) {
    if (error.field) {
      setError(error.field, { message: error.message })
    } else {
      setError('root', { message: 'Submission failed' })
    }
  }
}
```

## setErrors

Set multiple errors at once (useful for server-side validation):

```typescript
const { setErrors } = useForm({ schema })

// Set multiple errors
setErrors({
  email: 'Email already exists',
  'user.name': 'Name is too short',
})

// With ErrorOption format
setErrors({
  email: { type: 'server', message: 'Email already exists' },
  password: { type: 'validation', message: 'Password too weak' },
})

// Replace all existing errors (instead of merging)
setErrors({ email: 'New error' }, { shouldReplace: true })
```

## clearErrors

Clear validation errors:

```typescript
const { clearErrors } = useForm({ schema })

// Clear all errors
clearErrors()

// Clear specific field
clearErrors('email')

// Clear multiple fields
clearErrors(['email', 'password'])
```

### Use Cases

```typescript
// Clear errors before retry
const retrySubmission = () => {
  clearErrors()
  handleSubmit(onSubmit)()
}

// Clear error on focus
const onFieldFocus = (fieldName: string) => {
  clearErrors(fieldName)
}
```

## hasErrors

Check if the form or specific fields have errors:

```typescript
const { hasErrors } = useForm({ schema })

// Check if form has any errors
if (hasErrors()) {
  console.log('Form has validation errors')
}

// Check specific field
if (hasErrors('email')) {
  setFocus('email')
}

// Check root errors
if (hasErrors('root')) {
  console.log('Form-level error exists')
}
```

### Use Cases

```typescript
// Conditional submit button
const canSubmit = computed(() => !hasErrors() && formState.value.isDirty)

// Pre-submission validation
const beforeSubmit = async () => {
  await trigger()
  if (hasErrors()) {
    showErrorSummary()
    return false
  }
  return true
}
```

## getErrors

Get validation errors for the form or specific fields:

```typescript
const { getErrors } = useForm({ schema })

// Get all errors
const allErrors = getErrors()
// Returns: { email: 'Invalid email', password: 'Too short' }

// Get specific field error
const emailError = getErrors('email')
// Returns: 'Invalid email' or undefined

// Get root error
const rootError = getErrors('root')
```

### Use Cases

```typescript
// Build error summary
const errorSummary = computed(() => {
  const errors = getErrors()
  return Object.entries(errors).map(([field, message]) => ({
    field,
    message,
  }))
})

// Log errors for debugging
const logErrors = () => {
  const errors = getErrors()
  console.table(errors)
}
```

## setFocus

Programmatically focus a field:

```typescript
const { setFocus } = useForm({ schema })

// Focus a field
setFocus('email')

// Focus and select text
setFocus('email', { shouldSelect: true })
```

### Use Cases

```typescript
// Focus first field on mount
import { onMounted } from 'vue'

onMounted(() => {
  setFocus('name')
})

// Focus next field after completion
const onFieldComplete = (currentField: string, nextField: string) => {
  if (getValue(currentField)) {
    setFocus(nextField)
  }
}

// Focus first error field (alternative to shouldFocusError)
const focusFirstError = () => {
  const errors = formState.value.errors
  const firstErrorField = Object.keys(errors)[0]
  if (firstErrorField) {
    setFocus(firstErrorField)
  }
}

// Focus with text selection (useful for editing)
const editField = (fieldName: string) => {
  setFocus(fieldName, { shouldSelect: true })
}
```

## Complete Example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  email: z.email(),
  role: z.enum(['admin', 'user', 'guest']),
})

const {
  register,
  handleSubmit,
  formState,
  setValue,
  getValue,
  getValues,
  reset,
  trigger,
  setError,
  clearErrors,
} = useForm({
  schema,
  defaultValues: {
    name: '',
    email: '',
    role: 'user',
  },
})

const isEditing = ref(false)
const originalData = ref(null)

// Load existing data
const loadUser = async (userId: string) => {
  const user = await fetchUser(userId)
  reset(user)
  originalData.value = user
  isEditing.value = true
}

// Cancel editing
const cancelEdit = () => {
  if (originalData.value) {
    reset(originalData.value)
  } else {
    reset()
  }
}

// Validate specific section
const validatePersonalInfo = async () => {
  return await trigger(['name', 'email'])
}

// Copy from template
const useTemplate = (template: 'admin' | 'standard') => {
  if (template === 'admin') {
    setValue('role', 'admin')
    setValue('name', 'Admin User')
  } else {
    setValue('role', 'user')
    setValue('name', '')
  }
}

// Submit with server validation
const onSubmit = async (data) => {
  clearErrors()

  try {
    const result = await saveUser(data)
    if (result.success) {
      reset()
      isEditing.value = false
    }
  } catch (error) {
    if (error.validationErrors) {
      for (const [field, message] of Object.entries(error.validationErrors)) {
        setError(field, message)
      }
    }
  }
}

// Export current form data
const exportData = () => {
  const data = getValues()
  console.log(JSON.stringify(data, null, 2))
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <div class="toolbar">
      <button type="button" @click="useTemplate('standard')">Standard User</button>
      <button type="button" @click="useTemplate('admin')">Admin Template</button>
      <button type="button" @click="exportData">Export</button>
    </div>

    <div class="field">
      <label>Name</label>
      <input v-bind="register('name')" />
      <span v-if="formState.value.errors.name">
        {{ formState.value.errors.name }}
      </span>
    </div>

    <div class="field">
      <label>Email</label>
      <input v-bind="register('email')" type="email" />
      <span v-if="formState.value.errors.email">
        {{ formState.value.errors.email }}
      </span>
    </div>

    <div class="field">
      <label>Role</label>
      <select v-bind="register('role')">
        <option value="guest">Guest</option>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
    </div>

    <div class="actions">
      <button type="button" @click="cancelEdit">Cancel</button>
      <button type="submit" :disabled="formState.value.isSubmitting">
        {{ isEditing ? 'Update' : 'Create' }}
      </button>
    </div>
  </form>
</template>
```

## Next Steps

- Learn about [TypeScript](/guide/advanced/typescript) integration
- Explore [Best Practices](/guide/best-practices/patterns)
