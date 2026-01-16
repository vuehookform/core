# Field Arrays

Build dynamic forms with repeatable field groups using the built-in field array API.

## Basic Usage

Use the `fields()` method to manage arrays:

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1, 'Name required'),
      quantity: z.number().min(1, 'Min 1'),
    }),
  ),
})

const { register, handleSubmit, fields, formState } = useForm({
  schema,
  defaultValues: {
    items: [{ name: '', quantity: 1 }],
  },
})

const items = fields('items')
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <div v-for="field in items.value" :key="field.key" class="item-row">
      <input v-bind="register(`items.${field.index}.name`)" placeholder="Item name" />
      <input v-bind="register(`items.${field.index}.quantity`)" type="number" />
      <button type="button" @click="field.remove()">Remove</button>
    </div>

    <button type="button" @click="items.append({ name: '', quantity: 1 })">Add Item</button>

    <button type="submit">Submit</button>
  </form>
</template>
```

## Critical Rules

::: danger Important
Always follow these rules to avoid bugs:
:::

### 1. Use Dot Notation for Paths

```typescript
// CORRECT
register(`items.${field.index}.name`)
register('items.0.name')

// WRONG - will fail
register(`items[${field.index}].name`)
register('items[0].name')
```

### 2. Use field.key for v-for

```vue
<!-- CORRECT - stable keys for proper reconciliation -->
<div v-for="field in items.value" :key="field.key"></div>
```

### 3. Initialize Arrays in defaultValues

```typescript
// CORRECT
useForm({
  schema,
  defaultValues: {
    items: [], // or with initial items
  },
})

// WRONG - may cause undefined errors
useForm({
  schema,
  // items not initialized
})
```

### 4. Call fields() in Setup

```typescript
// CORRECT - call once in setup
const items = fields('items')

// WRONG - don't call in template or computed
```

## Field Array Methods

### append

Add item to end of array:

```typescript
items.append({ name: '', quantity: 1 })

// Returns false if maxLength exceeded
const success = items.append({ name: '' })
if (!success) {
  alert('Maximum items reached')
}
```

### prepend

Add item to start of array:

```typescript
items.prepend({ name: 'First item', quantity: 1 })
```

### insert

Insert at specific index:

```typescript
items.insert(2, { name: 'Inserted item', quantity: 1 })
```

### remove

Remove item at index:

```typescript
items.remove(0) // Remove first item

// Or use the field's remove method
field.remove()

// Returns false if minLength would be violated
```

### removeAll

Remove all items from array:

```typescript
items.removeAll()

// Returns false if minLength would be violated
```

### removeMany

Remove multiple items by indices:

```typescript
items.removeMany([0, 2, 4]) // Remove items at indices 0, 2, and 4

// Returns false if minLength would be violated
```

### update

Update item at index while preserving its stable key:

```typescript
items.update(0, { name: 'Updated name', quantity: 5 })
```

### swap

Swap two items:

```typescript
items.swap(0, 1) // Swap first and second items
```

### move

Move item from one position to another:

```typescript
items.move(0, 2) // Move first item to third position
```

### replace

Replace entire array:

```typescript
items.replace([
  { name: 'New item 1', quantity: 1 },
  { name: 'New item 2', quantity: 2 },
])
```

## Validation Mode Behavior

Field array operations (`append`, `prepend`, `insert`, `update`, `remove`, `swap`, `move`, `replace`) respect the form's validation mode settings:

| Mode        | Validation on Operations            |
| ----------- | ----------------------------------- |
| `onSubmit`  | No validation                       |
| `onChange`  | Validates after each operation      |
| `onBlur`    | No validation (no blur event)       |
| `onTouched` | Validates if array field is touched |

### Example with Different Modes

```typescript
// Mode: onSubmit - operations don't trigger validation
const { fields } = useForm({
  schema,
  mode: 'onSubmit',
})
const items = fields('items')
items.append({ name: '' }) // No validation

// Mode: onChange - operations trigger validation
const { fields } = useForm({
  schema,
  mode: 'onChange',
})
const items = fields('items')
items.append({ name: '' }) // Validates the array
```

### reValidateMode After Submission

After form submission (`submitCount > 0`), the `reValidateMode` takes effect:

```typescript
const { fields, handleSubmit } = useForm({
  schema,
  mode: 'onSubmit',
  reValidateMode: 'onChange',
})

const items = fields('items')

// Before submit: items.append() does NOT validate
await handleSubmit(onSubmit)()
// After submit: items.append() DOES validate (reValidateMode: 'onChange')
```

::: tip Consistency
This behavior is consistent with `register()` and `useController()`, ensuring uniform validation across your entire form regardless of how fields are managed.
:::

## Field Object Properties

Each item in `items.value` has:

```typescript
{
  key: string,      // Stable unique key for v-for
  index: number,    // Current position in array
  remove: () => void // Remove this item
}
```

## Nested Arrays

Handle arrays within arrays:

```vue
<script setup>
const schema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
        })
      ),
    })
  ),
})

const { register, fields } = useForm({
  schema,
  defaultValues: {
    sections: [{ title: '', items: [] }],
  },
})

const sections = fields('sections')

// For nested arrays, create separate field managers
const getSectionItems = (sectionIndex: number) => {
  return fields(`sections.${sectionIndex}.items`)
}
</script>

<template>
  <div v-for="section in sections.value" :key="section.key">
    <input v-bind="register(`sections.${section.index}.title`)" />

    <div v-for="item in getSectionItems(section.index).value" :key="item.key">
      <input v-bind="register(`sections.${section.index}.items.${item.index}.name`)" />
      <button @click="item.remove()">Remove Item</button>
    </div>

    <button @click="getSectionItems(section.index).append({ name: '' })">Add Item</button>
  </div>
</template>
```

## Field Array Rules

Add length constraints and custom validation to field arrays:

### Min/Max Length

```typescript
const items = fields('items', {
  rules: {
    minLength: { value: 1, message: 'Add at least one item' },
    maxLength: { value: 10, message: 'Maximum 10 items allowed' },
  },
})

// Operations return false when constraints would be violated
const added = items.append({ name: '' })
if (!added) {
  console.log('Cannot add: max length reached')
}

const removed = items.remove(0)
if (!removed) {
  console.log('Cannot remove: min length reached')
}
```

### Custom Array Validation

```typescript
const items = fields('items', {
  rules: {
    validate: (items) => {
      const names = items.map((i) => i.name)
      const hasDuplicates = new Set(names).size !== names.length
      return hasDuplicates ? 'Duplicate names are not allowed' : true
    },
  },
})
```

Async validation is also supported:

```typescript
const items = fields('items', {
  rules: {
    validate: async (items) => {
      const isValid = await validateItemsOnServer(items)
      return isValid ? true : 'Invalid item combination'
    },
  },
})
```

## Focus Options

Control focus behavior when adding items. **Focus is opt-in by default** (`shouldFocus: false`):

```typescript
// Enable focus on the new item after appending
items.append({ name: '' }, { shouldFocus: true })

// Default behavior: no automatic focus
items.append({ name: '' }) // shouldFocus defaults to false

// When adding multiple items, focus a specific one
items.append([{ name: '' }, { name: '' }], { focusIndex: 1 })

// Focus a specific field within the item
items.append(
  { name: '', email: '' },
  { focusName: 'email' }, // Focuses the 'email' field of the new item
)
```

Focus options work with `append`, `prepend`, and `insert`:

```typescript
// Insert at index 2 and focus the 'quantity' field
items.insert(2, { name: '', quantity: 1 }, { focusName: 'quantity' })
```

## Schema Validation

Array-level and item-level validation work together:

```typescript
const schema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1, 'Name required'),
        email: z.email('Invalid email'),
      }),
    )
    .min(1, 'Add at least one item')
    .max(5, 'Maximum 5 items'),
})
```

Access errors:

```vue
<template>
  <!-- Array-level error -->
  <p v-if="formState.value.errors.items && typeof formState.value.errors.items === 'string'">
    {{ formState.value.errors.items }}
  </p>

  <div v-for="field in items.value" :key="field.key">
    <!-- Item-level errors -->
    <input v-bind="register(`items.${field.index}.name`)" />
    <span v-if="formState.value.errors.items?.[field.index]?.name">
      {{ formState.value.errors.items[field.index].name }}
    </span>
  </div>
</template>
```

## Complete Example

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  orderItems: z
    .array(
      z.object({
        product: z.string().min(1, 'Select a product'),
        quantity: z.number().min(1, 'Min 1').max(99, 'Max 99'),
        notes: z.string().optional(),
      }),
    )
    .min(1, 'Add at least one item')
    .max(10, 'Maximum 10 items'),
})

const products = [
  { id: 'widget', name: 'Widget', price: 9.99 },
  { id: 'gadget', name: 'Gadget', price: 19.99 },
  { id: 'gizmo', name: 'Gizmo', price: 29.99 },
]

const { register, handleSubmit, fields, formState, watch } = useForm({
  schema,
  defaultValues: {
    orderItems: [{ product: '', quantity: 1, notes: '' }],
  },
})

const orderItems = fields('orderItems')
const watchedItems = watch('orderItems')

const total = computed(() => {
  return (
    watchedItems.value?.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.product)
      return sum + (product?.price || 0) * (item.quantity || 0)
    }, 0) || 0
  )
})

const onSubmit = (data: z.infer<typeof schema>) => {
  console.log('Order:', data)
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <h2>Order Items</h2>

    <p
      v-if="
        formState.value.errors.orderItems && typeof formState.value.errors.orderItems === 'string'
      "
      class="error"
    >
      {{ formState.value.errors.orderItems }}
    </p>

    <div v-for="field in orderItems.value" :key="field.key" class="order-row">
      <div class="field">
        <select v-bind="register(`orderItems.${field.index}.product`)">
          <option value="">Select product</option>
          <option v-for="p in products" :key="p.id" :value="p.id">
            {{ p.name }} - ${{ p.price }}
          </option>
        </select>
        <span v-if="formState.value.errors.orderItems?.[field.index]?.product" class="error">
          {{ formState.value.errors.orderItems[field.index].product }}
        </span>
      </div>

      <div class="field">
        <input
          v-bind="register(`orderItems.${field.index}.quantity`)"
          type="number"
          min="1"
          max="99"
          style="width: 80px"
        />
        <span v-if="formState.value.errors.orderItems?.[field.index]?.quantity" class="error">
          {{ formState.value.errors.orderItems[field.index].quantity }}
        </span>
      </div>

      <div class="field">
        <input
          v-bind="register(`orderItems.${field.index}.notes`)"
          placeholder="Notes (optional)"
        />
      </div>

      <button type="button" @click="field.remove()" :disabled="orderItems.value.length <= 1">
        Remove
      </button>
    </div>

    <div class="actions">
      <button
        type="button"
        @click="orderItems.append({ product: '', quantity: 1, notes: '' })"
        :disabled="orderItems.value.length >= 10"
      >
        Add Item
      </button>
    </div>

    <div class="total">
      <strong>Total: ${{ total.toFixed(2) }}</strong>
    </div>

    <button type="submit" :disabled="formState.value.isSubmitting">Place Order</button>
  </form>
</template>
```

## Next Steps

- Learn about [Conditional Fields](/guide/dynamic/conditional-fields)
- Explore [Form Context](/guide/advanced/form-context) for complex forms
