# Troubleshooting

Common issues and their solutions when working with Vue Hook Form.

## Common Mistakes

### Path Syntax Errors

**Always use dot notation** for all paths, including array indices:

| Correct                               | Incorrect                              |
| ------------------------------------- | -------------------------------------- |
| `register('user.name')`               | `register('user[name]')`               |
| `register('items.0.name')`            | `register('items[0].name')`            |
| ``register(`items.${index}.name`)``   | ``register(`items[${index}].name`)``   |
| `setValue('addresses.0.city', 'NYC')` | `setValue('addresses[0].city', 'NYC')` |

### Field Array Keys

**Always use `field.key` for v-for**, never the index:

```vue
<!-- CORRECT -->
<div v-for="field in items.value" :key="field.key">
  <input v-bind="register(`items.${field.index}.name`)" />
</div>

<!-- WRONG - causes issues when reordering/removing -->
<div v-for="(field, index) in items.value" :key="index">
  <input v-bind="register(`items.${index}.name`)" />
</div>
```

Why? When you remove or reorder items, using `index` as the key causes Vue to reuse DOM elements incorrectly, leading to stale data and focus issues.

### Forgetting .value on Refs

Form state and watched values are Vue refs - access them with `.value`:

```vue
<!-- CORRECT -->
<span v-if="formState.value.errors.email">
  {{ formState.value.errors.email }}
</span>

<!-- WRONG - this won't work -->
<span v-if="formState.errors.email">
  {{ formState.errors.email }}
</span>
```

### Mixing v-model with Uncontrolled Register

Don't use `v-model` with the default uncontrolled mode:

```vue
<!-- CORRECT - uncontrolled mode -->
<input v-bind="register('email')" />

<!-- CORRECT - controlled mode with v-model -->
<script setup>
const { value: email, ...bindings } = register('email', { controlled: true })
</script>
<input v-model="email" v-bind="bindings" />

<!-- WRONG - v-model with uncontrolled register -->
<input v-model="email" v-bind="register('email')" />
```

### Not Initializing Array Fields

Always provide initial values for array fields:

```typescript
// CORRECT
const { fields } = useForm({
  schema,
  defaultValues: {
    items: [], // Initialize the array
  },
})

// WRONG - will cause errors
const { fields } = useForm({
  schema,
  // items not initialized
})
```

### Calling fields() in Template

Call `fields()` in setup, not in the template:

```vue
<script setup>
// CORRECT - call in setup
const itemFields = fields('items')
</script>

<template>
  <div v-for="field in itemFields.value" :key="field.key">...</div>
</template>

<!-- WRONG - calling in template causes re-creation on every render -->
<template>
  <div v-for="field in fields('items').value" :key="field.key">...</div>
</template>
```

## Frequently Asked Questions

### Why isn't my field updating?

**Possible causes:**

1. **Using uncontrolled mode with reactive data**: Uncontrolled inputs read from/write to the DOM directly. If you need reactive updates, use controlled mode:

   ```typescript
   const { value, ...bindings } = register('field', { controlled: true })
   ```

2. **Not calling getValues() before accessing values**: For uncontrolled inputs, use `getValues()` to sync DOM state:

   ```typescript
   const currentValues = getValues() // Syncs from DOM
   ```

3. **Missing ref on custom component**: Ensure your component forwards the ref:
   ```vue
   <!-- CustomInput.vue -->
   <template>
     <input ref="inputRef" v-bind="$attrs" />
   </template>
   <script setup>
   import { ref } from 'vue'
   const inputRef = ref()
   defineExpose({ focus: () => inputRef.value?.focus() })
   </script>
   ```

### Why do I get validation errors immediately?

**Check your validation mode:**

```typescript
const { register } = useForm({
  schema,
  mode: 'onSubmit', // Only validate on submit (default)
  // mode: 'onChange', // Validates on every change - may feel aggressive
  // mode: 'onBlur', // Validates when field loses focus
  // mode: 'onTouched', // Validates after first touch, then on change
})
```

**Using onChange?** Consider using `delayError` to prevent error flash during typing:

```typescript
const { register } = useForm({
  schema,
  mode: 'onChange',
  delayError: 500, // Wait 500ms before showing errors
})
```

### Why is my form slow?

**Common performance issues:**

1. **Watching all fields unnecessarily**:

   ```typescript
   // SLOW - re-renders on every field change
   const allValues = watch()

   // FAST - only watch what you need
   const email = watch('email')
   ```

2. **Using controlled mode everywhere**: Controlled mode uses Vue reactivity which has overhead. Use uncontrolled (default) for simple inputs.

3. **Large field arrays without virtualization**: For 100+ items, consider virtual scrolling:

   ```vue
   <VirtualList :items="items.value" :item-height="50">
     <template #default="{ item }">
       <input v-bind="register(`items.${item.index}.name`)" />
     </template>
   </VirtualList>
   ```

4. **Complex schemas validated on every change**: Use `mode: 'onBlur'` or `mode: 'onSubmit'` for complex forms.

### How do I handle server errors?

**Option 1: Using setError after submission**

```typescript
async function onSubmit(data) {
  try {
    await api.save(data)
  } catch (error) {
    if (error.field) {
      setError(error.field, { message: error.message })
    } else {
      setError('root', { message: 'Submission failed' })
    }
  }
}
```

**Option 2: Using the errors option**

```typescript
const serverErrors = ref({})

const { register } = useForm({
  schema,
  errors: serverErrors, // Merged with validation errors
})

// After API call fails:
serverErrors.value = { email: 'Email already exists' }
```

### How do I reset to different values?

```typescript
// Reset to original defaults
reset()

// Reset to new values
reset({
  name: 'New Name',
  email: 'new@email.com',
})

// Reset but keep some state
reset(undefined, {
  keepErrors: true,
  keepDirty: true,
})
```

### How do I validate a single field manually?

```typescript
// Validate single field
const isValid = await trigger('email')

// Validate multiple fields
const areValid = await trigger(['email', 'password'])

// Validate entire form
const formValid = await trigger()
```

### How do I access the current value of a field?

```typescript
// Option 1: getValues (syncs from DOM for uncontrolled)
const email = getValues('email')

// Option 2: watch (reactive, for use in template/computed)
const email = watch('email')
console.log(email.value)

// Option 3: Controlled mode (reactive binding)
const { value: email } = register('email', { controlled: true })
```

### Why aren't my array operations working?

Array methods return `false` if the operation was rejected:

```typescript
const items = fields('items', {
  rules: { maxLength: { value: 5, message: 'Max 5 items' } },
})

const success = items.append({ name: '' })
if (!success) {
  console.log('Could not add item - max length reached')
}
```

Check return values and ensure you're within min/max constraints.

## Debugging Tips

### Enable Vue DevTools

Vue DevTools shows reactive state. Look for:

- `formState` ref values
- `watch()` computed values
- Component re-renders

### Log Form State

```typescript
import { watchEffect } from 'vue'

// Log all state changes
watchEffect(() => {
  console.log('Form state:', {
    errors: formState.value.errors,
    isDirty: formState.value.isDirty,
    isValid: formState.value.isValid,
  })
})
```

### Check Field Registration

```typescript
// After registering, verify the field is tracked
const bindings = register('email')
console.log('Registered field:', bindings)
```

### Inspect Zod Schema

```typescript
// Validate data manually to see all errors
const result = schema.safeParse(formData)
if (!result.success) {
  console.log('Validation errors:', result.error.format())
}
```

## TypeScript Issues

### Path Autocomplete Not Working

Ensure your schema type is inferred correctly:

```typescript
// CORRECT - type is inferred
const schema = z.object({
  email: z.string().email(),
})
const { register } = useForm({ schema })
register('email') // Autocomplete works

// ISSUE - schema as const may lose type info
const schema = { ... } as const // May not work as expected
```

### Type Error on Dynamic Paths

For dynamic paths (like array indices), you may need type assertions:

```typescript
// If TypeScript complains about dynamic paths:
register(`items.${index}.name` as `items.${number}.name`)

// Or use a typed helper
function itemPath(index: number, field: string) {
  return `items.${index}.${field}` as const
}
register(itemPath(0, 'name'))
```

### Generic Component Types

For reusable components, use generics:

```typescript
import type { ZodType } from 'zod'
import type { Control, FormPath } from '@vuehookform/core'

const props = defineProps<{
  control: Control<ZodType>
  name: FormPath<typeof props.control>
}>()
```

## Getting Help

If you're still stuck:

1. Check the [API Reference](/api/) for detailed method signatures
2. Look at [Examples](/examples/) for working code
3. Search or open an issue on [GitHub](https://github.com/your-repo/vuehookform)

## Next Steps

- Review [Best Practices](/guide/best-practices/performance) for optimization tips
- Explore [Patterns](/guide/best-practices/patterns) for common form architectures
