# Vue Hook Form - Troubleshooting Guide

Common issues and their solutions.

---

## Path Errors

### "Path does not exist in schema"

**Problem:** Warning in console about path not existing in schema.

**Cause:** The field path doesn't match your Zod schema structure.

**Solution:**

```typescript
// Check your schema structure
const schema = z.object({
  user: z.object({
    name: z.string(), // Path: 'user.name'
  }),
  items: z.array(
    z.object({
      id: z.number(), // Path: 'items.0.id'
    }),
  ),
})

// Common mistakes:
register('User.name') // WRONG: case-sensitive, should be 'user.name'
register('user.Name') // WRONG: 'Name' vs 'name'
register('username') // WRONG: it's 'user.name', not 'username'
```

---

### "Invalid path: use dot notation instead of bracket notation"

**Problem:** Warning about bracket notation in paths.

**Cause:** Using JavaScript-style bracket notation for arrays.

**Solution:**

```typescript
// WRONG
register('items[0].name')
register(`items[${index}].name`)

// CORRECT
register('items.0.name')
register(`items.${index}.name`)
```

---

### "Invalid path: contains empty segments"

**Problem:** Warning about empty segments in path.

**Cause:** Double dots, leading dots, or trailing dots in path.

**Solution:**

```typescript
// WRONG
register('user..name') // double dots
register('.email') // leading dot
register('email.') // trailing dot

// CORRECT
register('user.name')
register('email')
```

---

## Field Array Issues

### Array Items Jump Around on Add/Remove

**Problem:** Items in a v-for loop reorder unexpectedly when adding or removing.

**Cause:** Using array index as the `:key` instead of the stable `field.key`.

**Solution:**

```vue
<!-- WRONG -->
<div v-for="(item, index) in items.value" :key="index">

<!-- CORRECT -->
<div v-for="field in items.value" :key="field.key">
  <input v-bind="register(`items.${field.index}.name`)" />
</div>
```

---

### "Expected an array field, but this path does not point to an array"

**Problem:** Warning when calling `fields()` on a non-array path.

**Cause:** Using `fields()` on a path that isn't a `z.array()` in your schema.

**Solution:**

```typescript
const schema = z.object({
  email: z.string(), // NOT an array
  items: z.array(z.object({})), // IS an array
})

// WRONG
const emailFields = fields('email') // email is not an array

// CORRECT
const itemFields = fields('items') // items IS an array
register('email') // use register for non-arrays
```

---

### Field Array Operations Do Nothing

**Problem:** `append()`, `remove()`, etc. don't seem to work.

**Cause:** Operation was rejected due to `minLength` or `maxLength` rules.

**Solution:**

```typescript
const items = fields('items', {
  rules: { minLength: 1, maxLength: 5 },
})

// Check return value
const success = items.append({ name: '' })
if (!success) {
  console.log('Cannot add: maxLength reached')
}

const removed = items.remove(0)
if (!removed) {
  console.log('Cannot remove: would violate minLength')
}
```

---

### Field Array Not Initialized

**Problem:** `fields('items').value` is undefined or empty unexpectedly.

**Cause:** Missing `defaultValues` for the array field.

**Solution:**

```typescript
// WRONG - no defaultValues for array
useForm({
  schema,
  // missing defaultValues
})

// CORRECT - always initialize arrays
useForm({
  schema,
  defaultValues: {
    items: [], // or with initial item: [{ name: '' }]
  },
})
```

---

## Validation Issues

### Validation Not Running

**Problem:** Form submits without validating, or fields don't show errors.

**Cause:** Validation mode doesn't match your expectation.

**Solution:**

```typescript
// Default mode only validates on submit
useForm({ schema, defaultValues, mode: 'onSubmit' })

// For validation on blur:
useForm({ schema, defaultValues, mode: 'onBlur' })

// For real-time validation:
useForm({ schema, defaultValues, mode: 'onChange' })

// To manually trigger validation:
const isValid = await trigger() // all fields
const isFieldValid = await trigger('email') // single field
```

---

### Errors Not Showing in Template

**Problem:** `formState.errors.email` is always undefined.

**Cause:** Forgetting `.value` when accessing reactive refs.

**Solution:**

```vue
<!-- WRONG -->
<span v-if="formState.errors.email">

<!-- CORRECT -->
<span v-if="formState.value.errors.email">
  {{ formState.value.errors.email }}
</span>
```

---

### Only First Error Shows for Field

**Problem:** Field has multiple validation rules but only shows first error.

**Cause:** Default `criteriaMode` is `'firstError'`.

**Solution:**

```typescript
const { formState } = useForm({
  schema,
  defaultValues,
  criteriaMode: 'all', // Collect all errors
})

// Access all errors via .types
// formState.value.errors.email.types = {
//   email: 'Invalid email',
//   min: 'Too short'
// }
```

---

### Async Validation Fires Too Often

**Problem:** Custom async validation makes too many API calls.

**Cause:** No debounce on async validation.

**Solution:**

```typescript
register('username', {
  validate: async (value) => {
    const taken = await api.checkUsername(value)
    return taken ? 'Username taken' : undefined
  },
  validateDebounce: 300, // Wait 300ms after typing stops
})
```

---

## Value & State Issues

### Field Value Not Updating Immediately

**Problem:** Input value doesn't reflect in `getValues()` until blur.

**Cause:** Uncontrolled mode syncs on blur, not on every keystroke.

**Solution:**

```typescript
// For immediate sync, use controlled mode:
const { value, ...bindings } = register('email', { controlled: true })
```

```vue
<input v-model="value" v-bind="bindings" />
```

---

### Using v-model with Uncontrolled Register

**Problem:** Field behaves unexpectedly or values don't sync.

**Cause:** Mixing v-model with uncontrolled `register()`.

**Solution:**

```vue
<!-- WRONG - don't mix v-model with uncontrolled register -->
<input v-model="email" v-bind="register('email')" />

<!-- CORRECT Option 1: Uncontrolled (no v-model) -->
<input v-bind="register('email')" />

<!-- CORRECT Option 2: Controlled (with v-model) -->
<script setup>
const { value, ...bindings } = register('email', { controlled: true })
</script>
<input v-model="value" v-bind="bindings" />
```

---

### Form Not Resetting Properly

**Problem:** `reset()` doesn't clear all fields or errors.

**Cause:** Various reset behaviors controlled by options.

**Solution:**

```typescript
// Reset to original defaultValues
reset()

// Reset with new values
reset({ email: 'new@example.com', name: '' })

// Keep certain state
reset(undefined, {
  keepErrors: true, // Don't clear errors
  keepDirty: true, // Keep dirty state
  keepTouched: true, // Keep touched state
  keepIsSubmitted: true, // Keep submitted flag
})
```

---

## Context Issues

### useFormContext Returns Undefined

**Problem:** `useFormContext()` returns undefined in child component.

**Cause:** Parent didn't call `provideForm()`.

**Solution:**

```typescript
// Parent.vue - MUST call provideForm
import { useForm, provideForm } from 'vue-hook-form'

const form = useForm({ schema, defaultValues })
provideForm(form) // <-- Don't forget this!
```

```typescript
// Child.vue
import { useFormContext } from 'vue-hook-form'

const { register } = useFormContext() // Now works
```

---

## Async Default Values

### Form Shows Empty While Loading

**Problem:** Form renders with empty fields before async defaults load.

**Cause:** Not handling the loading state.

**Solution:**

```typescript
const { formState } = useForm({
  schema,
  defaultValues: async () => {
    return await fetchUserData()
  },
})
```

```vue
<template>
  <div v-if="formState.value.isLoading">Loading...</div>
  <form v-else @submit.prevent="handleSubmit(onSubmit)">
    <!-- Fields render after data loads -->
  </form>
</template>
```

---

### Default Values Fetch Failed

**Problem:** Form loads with empty values after fetch error.

**Cause:** Async defaultValues threw an error.

**Solution:**

```typescript
const { formState } = useForm({
  schema,
  defaultValues: async () => {
    const data = await fetchUser()
    return data
  },
  onDefaultValuesError: (error) => {
    console.error('Failed to load defaults:', error)
    // Show error UI, retry, etc.
  },
})
```

```vue
<template>
  <div v-if="formState.value.defaultValuesError">
    Failed to load form data.
    <button @click="retry">Retry</button>
  </div>
</template>
```

---

## TypeScript Issues

### Path Type Errors

**Problem:** TypeScript complains about string paths.

**Cause:** Path doesn't match the inferred schema type.

**Solution:**

```typescript
// Ensure schema and defaultValues match
const schema = z.object({
  user: z.object({
    email: z.string(),
  }),
})

// TypeScript knows valid paths:
register('user.email') // OK
register('user.phone') // ERROR: 'phone' doesn't exist

// If you need dynamic paths, use type assertion carefully:
const fieldName = 'user.email' as const
register(fieldName)
```

---

### Type Inference Not Working

**Problem:** `z.infer<typeof schema>` isn't inferring correctly.

**Cause:** Schema defined inline or type not exported.

**Solution:**

```typescript
// Define schema as const
const schema = z.object({
  email: z.string(),
}) as const // <-- helps with inference

// Or define type explicitly
type FormData = z.infer<typeof schema>

const onSubmit = (data: FormData) => {
  // data is properly typed
}
```

---

## Quick Diagnostic Checklist

If something isn't working:

1. **Check `.value`** - Are you accessing `formState.value.errors` not `formState.errors`?
2. **Check path syntax** - Using dots not brackets? (`items.0.name` not `items[0].name`)
3. **Check defaultValues** - Are arrays initialized? (`items: []`)
4. **Check mode** - Is validation mode what you expect?
5. **Check field.key** - Using `field.key` not index in v-for?
6. **Check provideForm** - Called in parent before useFormContext in child?
7. **Check controlled mode** - Need v-model? Using `{ controlled: true }`?
