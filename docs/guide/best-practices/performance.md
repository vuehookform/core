# Performance

Optimize your forms for the best user experience.

## Uncontrolled by Default

Vue Hook Form uses uncontrolled inputs by default, which provides significant performance benefits:

```vue
<!-- Uncontrolled (default) - no re-renders during typing -->
<input v-bind="register('email')" />

<!-- Controlled - re-renders on every keystroke -->
<input v-model="emailValue" v-bind="emailBindings" />
```

**When to use controlled mode:**

- Custom components requiring v-model
- Real-time value display (live preview)
- Third-party UI libraries

**When to stick with uncontrolled:**

- Native HTML inputs
- Large forms
- Performance-critical applications

## Validation Modes

Choose the right validation mode for your use case:

| Mode        | Re-renders | Best For                               |
| ----------- | ---------- | -------------------------------------- |
| `onSubmit`  | Fewest     | Simple forms, less validation feedback |
| `onBlur`    | Moderate   | Balance of feedback and performance    |
| `onChange`  | Most       | Real-time feedback, password strength  |
| `onTouched` | Moderate   | Progressive feedback after interaction |

```typescript
// Recommended for most forms
useForm({
  schema,
  mode: 'onBlur',
})
```

## Avoid Watching All Fields

Watching all fields causes re-renders whenever any field changes:

```typescript
// Causes re-render on every field change
const allValues = watch()

// Better: watch specific fields you need
const email = watch('email')
const [firstName, lastName] = watch(['firstName', 'lastName'])
```

## Memoize Computed Values

Use `computed` for derived values to leverage Vue's caching:

```typescript
import { computed } from 'vue'

const quantity = watch('quantity')
const price = watch('price')

// Good: cached, only recalculates when dependencies change
const total = computed(() => quantity.value * price.value)

// Avoid: recalculates on every access
const getTotal = () => quantity.value * price.value
```

## Debounce Expensive Operations

For real-time features, debounce expensive operations:

```typescript
import { watchDebounced } from '@vueuse/core'

const formData = watch()

// Auto-save with debounce
watchDebounced(
  formData,
  async (values) => {
    await autoSave(values)
  },
  { debounce: 1000 },
)
```

## Lazy Validation for Complex Schemas

For complex async validation, consider debouncing:

```typescript
const schema = z.object({
  username: z
    .string()
    .min(3)
    .refine(
      async (username) => {
        // Debounce in implementation
        return await checkUsername(username)
      },
      { message: 'Username taken' },
    ),
})

// Or handle in onChange with debounce
const debouncedValidate = useDebounceFn(async (name) => {
  await trigger(name)
}, 500)
```

## Split Large Forms

For very large forms, consider splitting into sections:

```vue
<script setup>
// Instead of one massive form
const form = useForm({ schema: hugeSchema })

// Split into logical sections
const personalForm = useForm({ schema: personalSchema })
const addressForm = useForm({ schema: addressSchema })
const preferencesForm = useForm({ schema: preferencesSchema })
</script>
```

Or use multi-step patterns:

```vue
<script setup>
const step = ref(1)
const form = useForm({ schema })

// Only render current step
</script>

<template>
  <form>
    <Step1Fields v-if="step === 1" />
    <Step2Fields v-else-if="step === 2" />
    <Step3Fields v-else />
  </form>
</template>
```

## Use v-show for Conditional Fields

When toggling field visibility frequently, `v-show` is more performant than `v-if`:

```vue
<!-- v-show: keeps DOM, toggles display -->
<div v-show="showOptional">
  <input v-bind="register('optional')" />
</div>

<!-- v-if: recreates DOM each time -->
<div v-if="showOptional">
  <input v-bind="register('optional')" />
</div>
```

Use `v-if` when:

- Field should be unregistered when hidden
- Initial render performance matters more than toggle performance

## Optimize Field Arrays

For large arrays, implement virtual scrolling:

```vue
<script setup>
import { useVirtualList } from '@vueuse/core'

const items = fields('items')

const { list, containerProps, wrapperProps } = useVirtualList(items.value, { itemHeight: 50 })
</script>

<template>
  <div v-bind="containerProps" style="height: 400px; overflow: auto">
    <div v-bind="wrapperProps">
      <div v-for="{ data: field, index } in list" :key="field.key">
        <input v-bind="register(`items.${field.index}.name`)" />
      </div>
    </div>
  </div>
</template>
```

## Minimize Form State Subscriptions

In child components, only subscribe to needed state:

```typescript
// In child component - subscribes to all state
const { formState } = useFormContext()

// Better - only subscribes to specific properties
const { errors, isSubmitting } = useFormState({ control })
```

## Profile Your Forms

Use Vue DevTools to identify performance issues:

1. Open Vue DevTools
2. Go to Performance tab
3. Record while interacting with form
4. Look for excessive re-renders

## Built-in Optimizations

Vue Hook Form includes several automatic performance optimizations:

### Validation Caching

Validation results are automatically cached based on field values. Repeated validations of unchanged fields return instantly:

```typescript
// First validation - runs Zod schema
await trigger('email') // ~5ms

// Second validation (unchanged value) - cache hit
await trigger('email') // ~0ms
```

Cache is automatically invalidated when:

- Field value changes via `setValue()` or user input
- Form is reset with `reset()`

### Validation Debouncing

For `onChange` mode, debounce validation to reduce overhead:

```typescript
const form = useForm({
  schema,
  mode: 'onChange',
  validationDebounce: 150, // ms
})
```

### Partial Schema Validation

Single-field validation automatically extracts and validates only the relevant sub-schema when possible, avoiding full form validation:

```typescript
// With a 50-field schema, validating one field:
await trigger('email')
// Only validates the email sub-schema (O(1) vs O(n))
```

::: info
Partial validation automatically falls back to full validation when your schema has cross-field refinements (`.refine()` or `.superRefine()` at the root level).
:::

### O(1) State Checks

Form state properties like `isDirty` and `isTouched` use counter-based tracking for O(1) lookups instead of scanning all fields:

```typescript
// Instant regardless of form size
const isDirty = formState.value.isDirty
```

### Batch Error Updates

When validating multiple fields, errors are batched into a single reactive update rather than updating state for each field.

### Field Array Cache Optimization

Field array operations use incremental index cache updates instead of rebuilding the entire cache on every mutation:

| Operation   | Complexity | Description                          |
| ----------- | ---------- | ------------------------------------ |
| `append()`  | O(k)       | Only indexes new items               |
| `prepend()` | O(n)       | Shifts all existing indices          |
| `insert()`  | O(n)       | Shifts indices after insertion point |
| `remove()`  | O(n-k)     | Updates only remaining items         |
| `swap()`    | O(1)       | Updates exactly 2 entries            |
| `move()`    | O(range)   | Updates only affected range          |
| `replace()` | O(n)       | Full rebuild (necessary)             |

This means operations like `swap()` remain fast even with thousands of items:

```typescript
const items = fields('items') // 1000 items

// O(1) - instant regardless of array size
items.swap(0, 999)

// O(k) - only indexes the new item
items.append({ name: 'New item' })
```

## Benchmarks

Typical performance for a 20-field form:

| Operation  | Uncontrolled | Controlled |
| ---------- | ------------ | ---------- |
| Keystroke  | ~0ms         | ~2-5ms     |
| Field blur | ~1-3ms       | ~1-3ms     |
| Submit     | ~5-10ms      | ~5-10ms    |

## Summary

1. **Use uncontrolled inputs** when possible
2. **Choose appropriate validation mode** (onBlur recommended)
3. **Use `validationDebounce`** for onChange mode with complex schemas
4. **Watch specific fields**, not all
5. **Memoize computed values**
6. **Debounce expensive operations**
7. **Split large forms** into sections
8. **Use virtual scrolling** for large arrays
9. **Profile and measure** actual performance

Built-in optimizations (automatic):

- Validation caching
- Partial schema validation
- O(1) state checks (isDirty, isTouched)
- Batch error updates
- Field array incremental cache updates

## Next Steps

- Learn common [Patterns](/guide/best-practices/patterns)
- Explore [TypeScript](/guide/advanced/typescript) integration
