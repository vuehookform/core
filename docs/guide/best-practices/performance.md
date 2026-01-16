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

## Large-Scale Field Arrays (100+ Items)

Managing hundreds or thousands of nested fields requires careful optimization. This section covers patterns for enterprise-scale dynamic forms.

### Performance Characteristics

Vue Hook Form's field array operations have these complexities:

| Operation   | Time Complexity | Description                          |
| ----------- | --------------- | ------------------------------------ |
| `append()`  | O(k)            | Only indexes new items               |
| `prepend()` | O(n)            | Shifts all existing indices          |
| `insert()`  | O(n)            | Shifts indices after insertion point |
| `remove()`  | O(n-k)          | Updates only remaining items         |
| `swap()`    | O(1)            | Updates exactly 2 cache entries      |
| `move()`    | O(range)        | Updates only affected range          |
| `replace()` | O(n)            | Full rebuild (necessary)             |

### Benchmark Data

Measured on a typical development machine (M1 MacBook Pro):

| Array Size | append() | remove() | swap() | Full validation |
| ---------- | -------- | -------- | ------ | --------------- |
| 100 items  | <1ms     | <1ms     | <0.1ms | ~5ms            |
| 500 items  | ~2ms     | ~3ms     | <0.1ms | ~25ms           |
| 1000 items | ~4ms     | ~6ms     | <0.1ms | ~50ms           |

Key insight: `swap()` remains O(1) regardless of array size, making it ideal for drag-and-drop reordering.

### Complete Virtual Scrolling Implementation

For arrays with 50+ visible items, use virtual scrolling to render only visible rows:

```vue
<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useVirtualList } from '@vueuse/core'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  rows: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, 'Name is required'),
      quantity: z.coerce.number().min(0, 'Must be positive'),
      price: z.coerce.number().min(0, 'Must be positive'),
    }),
  ),
})

const { register, fields, formState, handleSubmit, getValues } = useForm({
  schema,
  defaultValues: {
    rows: Array.from({ length: 500 }, (_, i) => ({
      id: `row-${i}`,
      name: `Product ${i}`,
      quantity: 1,
      price: 9.99,
    })),
  },
})

const rowFields = fields('rows')

// Virtual list configuration
const { list, containerProps, wrapperProps, scrollTo } = useVirtualList(
  computed(() => rowFields.value),
  {
    itemHeight: 60, // Fixed row height for performance
    overscan: 5, // Render 5 extra items above/below viewport
  },
)

// Focus handling for virtual lists
const focusRow = async (index: number) => {
  // Scroll to make the row visible first
  scrollTo(index)
  // Wait for DOM update
  await nextTick()
  // Then focus the first input
  const input = document.querySelector(`[name="rows.${index}.name"]`) as HTMLInputElement
  input?.focus()
}

const onSubmit = (data: z.infer<typeof schema>) => {
  console.log(`Submitting ${data.rows.length} rows`)
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <!-- Fixed height container -->
    <div v-bind="containerProps" class="h-[400px] overflow-auto border rounded">
      <div v-bind="wrapperProps">
        <div
          v-for="{ data: field, index: virtualIndex } in list"
          :key="field.key"
          class="flex gap-2 p-2 border-b h-[60px] items-center"
        >
          <!-- Use field.index (actual array index), not virtualIndex -->
          <input
            v-bind="register(`rows.${field.index}.name`)"
            class="flex-1 px-2 py-1 border rounded"
            placeholder="Product name"
          />
          <input
            v-bind="register(`rows.${field.index}.quantity`)"
            type="number"
            class="w-20 px-2 py-1 border rounded"
          />
          <input
            v-bind="register(`rows.${field.index}.price`)"
            type="number"
            step="0.01"
            class="w-24 px-2 py-1 border rounded"
          />
          <button
            type="button"
            @click="field.remove()"
            class="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
          >
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- Controls outside scrollable area -->
    <div class="flex gap-2 mt-4 items-center">
      <button
        type="button"
        @click="rowFields.append({ id: crypto.randomUUID(), name: '', quantity: 1, price: 0 })"
        class="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Add Row
      </button>
      <span class="text-gray-500"> {{ rowFields.value.length }} rows total </span>
    </div>

    <button
      type="submit"
      :disabled="formState.value.isSubmitting"
      class="mt-4 px-4 py-2 bg-green-500 text-white rounded"
    >
      Submit All
    </button>
  </form>
</template>
```

### Critical Virtual Scrolling Rules

1. **Use `field.key` for `:key`** - The stable key ensures Vue correctly recycles DOM elements
2. **Use `field.index` for paths** - The actual array index, not the virtual list index
3. **Fixed row height** - Variable heights require more complex calculations and hurt performance
4. **Uncontrolled inputs only** - Virtual scrolling destroys/recreates DOM elements; controlled mode would lose focus state

### Optimizing Deeply Nested Field Arrays

For nested structures (e.g., sections with items), flatten the validation or use targeted triggers:

```typescript
const { trigger } = useForm({ schema })

// Instead of validating entire form (slow for large nested arrays)
await trigger() // O(n*m) for n sections with m items each

// Validate only the affected section
await trigger(`sections.${sectionIndex}`) // O(m) for m items

// Or validate only the specific field that changed
await trigger(`sections.${sectionIndex}.items.${itemIndex}.name`) // O(1)
```

### Memory Optimization for Large Arrays

For 1000+ items, consider these optimizations:

```typescript
// 1. Use onSubmit mode to avoid validation overhead during editing
const form = useForm({
  schema,
  mode: 'onSubmit', // No validation until submit
})

// 2. Batch operations when adding many items at once
const newItems = generateItems(100)
const currentValues = getValues('rows')
rowFields.replace([...currentValues, ...newItems])
// Better than 100 individual append() calls

// 3. For very long-running forms, the validation cache is
// automatically cleared on reset() if memory is a concern
```

### Performance Profiling

Use Vue DevTools and browser performance tools to identify bottlenecks:

```typescript
// Wrap operations for timing
const measureOperation = async (name: string, operation: () => void | Promise<void>) => {
  const start = performance.now()
  await operation()
  console.log(`${name} took ${(performance.now() - start).toFixed(2)}ms`)
}

// Usage
await measureOperation('append 10 items', () => {
  for (let i = 0; i < 10; i++) {
    rowFields.append({ id: crypto.randomUUID(), name: '', quantity: 1, price: 0 })
  }
})

// Check for excessive re-renders with Vue's debug hooks
import { onRenderTriggered } from 'vue'

onRenderTriggered((event) => {
  console.log('Render triggered by:', event.key, event.target)
})
```

### Prefer swap() for Reordering

For drag-and-drop reordering, always use `swap()` or `move()` instead of remove+insert:

```typescript
// SLOW: Remove and re-insert (O(n) twice)
const item = getValues(`items.${fromIndex}`)
itemFields.remove(fromIndex)
itemFields.insert(toIndex, item)

// FAST: Swap positions (O(1))
itemFields.swap(fromIndex, toIndex)

// FAST: Move to new position (O(range))
itemFields.move(fromIndex, toIndex)
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
