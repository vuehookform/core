# useWatch

Watch form field values reactively.

## Import

```typescript
import { useWatch } from '@vuehookform/core'
```

## Usage

```typescript
// Watch single field
const email = useWatch({ control, name: 'email' })

// Watch multiple fields
const values = useWatch({ control, name: ['email', 'password'] })

// Watch all fields
const allValues = useWatch({ control })
```

## When to Use

Use `useWatch` when you need to:

- React to field value changes
- Compute derived values based on form data
- Conditionally render UI based on field values
- Sync form values with external state

## Options

### control

**Type:** `Control<T>`\
**Required:** Yes

The control object from `useForm`.

### name

**Type:** `Path<T> | Path<T>[]`\
**Optional**

The field(s) to watch. If omitted, watches all fields.

### defaultValue

**Type:** `any`\
**Optional**

Value to use before the field has a value.

## Return Value

Returns a reactive ref containing the watched value(s):

```typescript
// Single field
const email: Ref<string> = useWatch({ control, name: 'email' })

// Multiple fields
const values: Ref<[string, string]> = useWatch({
  control,
  name: ['email', 'password'],
})

// All fields
const all: Ref<FormValues> = useWatch({ control })
```

## Examples

### Watch Single Field

```vue
<script setup>
import { useForm, useWatch } from '@vuehookform/core'

const { control, register } = useForm({ schema })
const email = useWatch({ control, name: 'email' })
</script>

<template>
  <input v-bind="register('email')" />
  <p>Current email: {{ email }}</p>
</template>
```

### Conditional Rendering

```vue
<script setup>
import { useForm, useWatch } from '@vuehookform/core'

const { control, register } = useForm({ schema })
const accountType = useWatch({ control, name: 'accountType' })
</script>

<template>
  <select v-bind="register('accountType')">
    <option value="personal">Personal</option>
    <option value="business">Business</option>
  </select>

  <!-- Only show for business accounts -->
  <div v-if="accountType === 'business'">
    <input v-bind="register('companyName')" placeholder="Company Name" />
    <input v-bind="register('taxId')" placeholder="Tax ID" />
  </div>
</template>
```

### Computed Values

```vue
<script setup>
import { computed } from 'vue'
import { useForm, useWatch } from '@vuehookform/core'

const { control, register } = useForm({ schema })

const quantity = useWatch({ control, name: 'quantity' })
const unitPrice = useWatch({ control, name: 'unitPrice' })

const total = computed(() => {
  return (quantity.value || 0) * (unitPrice.value || 0)
})
</script>

<template>
  <input v-bind="register('quantity')" type="number" />
  <input v-bind="register('unitPrice')" type="number" />
  <p>Total: ${{ total.toFixed(2) }}</p>
</template>
```

### Form Preview

```vue
<script setup>
import { useForm, useWatch } from '@vuehookform/core'

const { control, register, handleSubmit } = useForm({ schema })
const formData = useWatch({ control })
</script>

<template>
  <div class="form-container">
    <form @submit="handleSubmit(onSubmit)">
      <input v-bind="register('title')" />
      <textarea v-bind="register('content')"></textarea>
    </form>

    <div class="preview">
      <h2>Preview</h2>
      <h3>{{ formData.title || 'Untitled' }}</h3>
      <p>{{ formData.content || 'No content yet...' }}</p>
    </div>
  </div>
</template>
```

### Multiple Fields

```vue
<script setup>
import { computed } from 'vue'
import { useForm, useWatch } from '@vuehookform/core'

const { control, register } = useForm({ schema })

const [firstName, lastName] = useWatch({
  control,
  name: ['firstName', 'lastName'],
})

const fullName = computed(() => {
  return `${firstName.value || ''} ${lastName.value || ''}`.trim()
})
</script>

<template>
  <input v-bind="register('firstName')" />
  <input v-bind="register('lastName')" />
  <p>Full name: {{ fullName || 'Enter your name' }}</p>
</template>
```

### Watch in Child Component

```vue
<!-- PasswordStrength.vue -->
<script setup>
import { computed } from 'vue'
import { useWatch } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

const props = defineProps<{
  control: Control<any>
}>()

const password = useWatch({
  control: props.control,
  name: 'password',
  defaultValue: '',
})

const strength = computed(() => {
  const p = password.value
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  return labels[strength.value - 1] || 'Too short'
})
</script>

<template>
  <div class="password-strength">
    <div class="strength-bar" :data-strength="strength" />
    <span>{{ strengthLabel }}</span>
  </div>
</template>
```

## Comparison with watch from useForm

| Method                 | Use Case                           |
| ---------------------- | ---------------------------------- |
| `watch` from `useForm` | Same component, quick access       |
| `useWatch` composable  | Child components, more flexibility |

Both return the same reactive values. Choose based on where you need the data.
