# Watch

React to form field value changes in real-time.

## Basic Usage

Use `watch` from `useForm` to observe field values:

```vue
<script setup>
import { useForm } from '@vuehookform/core'

const { register, watch } = useForm({ schema })

// Watch single field
const email = watch('email')

// Watch multiple fields
const credentials = watch(['email', 'password'])

// Watch all fields
const allValues = watch()
</script>

<template>
  <input v-bind="register('email')" />
  <p>Current email: {{ email }}</p>
</template>
```

## Watch Modes

### Single Field

```typescript
const email = watch('email')
// Returns: ComputedRef<string>

// Use in template or computed
console.log(email.value)
```

### Multiple Fields

```typescript
const credentials = watch(['email', 'password'])
// Returns: ComputedRef<{ email?: string, password?: string }>

// Access individual values via the object
console.log(credentials.value.email, credentials.value.password)
```

### All Fields

```typescript
const allValues = watch()
// Returns: ComputedRef<FormValues>

// Access any field
console.log(allValues.value.email)
```

## Common Use Cases

### Live Preview

```vue
<script setup>
import { useForm } from '@vuehookform/core'

const { register, handleSubmit, watch } = useForm({ schema })
const formData = watch()
</script>

<template>
  <div class="editor">
    <form @submit="handleSubmit(onSubmit)">
      <input v-bind="register('title')" placeholder="Title" />
      <textarea v-bind="register('content')" placeholder="Content"></textarea>
    </form>

    <div class="preview">
      <h1>{{ formData.title || 'Untitled' }}</h1>
      <p>{{ formData.content || 'Start writing...' }}</p>
    </div>
  </div>
</template>
```

### Computed Values

```vue
<script setup>
import { computed } from 'vue'
import { useForm } from '@vuehookform/core'

const { register, watch } = useForm({ schema })

const quantity = watch('quantity')
const price = watch('price')

const total = computed(() => {
  return (quantity.value || 0) * (price.value || 0)
})

const formattedTotal = computed(() => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total.value)
})
</script>

<template>
  <input v-bind="register('quantity')" type="number" />
  <input v-bind="register('price')" type="number" step="0.01" />
  <p>Total: {{ formattedTotal }}</p>
</template>
```

### Conditional Logic

```vue
<script setup>
import { useForm } from '@vuehookform/core'

const { register, watch } = useForm({ schema })
const shippingMethod = watch('shippingMethod')
</script>

<template>
  <select v-bind="register('shippingMethod')">
    <option value="standard">Standard</option>
    <option value="express">Express</option>
    <option value="pickup">Store Pickup</option>
  </select>

  <!-- Show address fields only for delivery -->
  <div v-if="shippingMethod !== 'pickup'">
    <input v-bind="register('address')" placeholder="Address" />
    <input v-bind="register('city')" placeholder="City" />
  </div>

  <!-- Show store selection for pickup -->
  <div v-else>
    <select v-bind="register('storeId')">
      <option value="">Select a store</option>
      <!-- Store options -->
    </select>
  </div>
</template>
```

### Character Counter

```vue
<script setup>
import { computed } from 'vue'
import { useForm } from '@vuehookform/core'

const { register, watch } = useForm({ schema })
const bio = watch('bio')

const charCount = computed(() => bio.value?.length || 0)
const maxChars = 500
const remaining = computed(() => maxChars - charCount.value)
</script>

<template>
  <div class="bio-field">
    <label>Bio</label>
    <textarea v-bind="register('bio')" :maxlength="maxChars"></textarea>
    <span :class="{ warning: remaining < 50 }"> {{ remaining }} characters remaining </span>
  </div>
</template>
```

### Dependent Fields

```vue
<script setup>
import { watchEffect } from 'vue'
import { useForm } from '@vuehookform/core'

const { register, watch, setValue } = useForm({ schema })
const country = watch('country')

// Update available states when country changes
const availableStates = computed(() => {
  return getStatesForCountry(country.value)
})

// Clear state when country changes
watchEffect(() => {
  if (country.value) {
    setValue('state', '')
  }
})
</script>
```

### Form Dirty State Indicator

```vue
<script setup>
import { computed } from 'vue'
import { useForm } from '@vuehookform/core'

const { register, watch } = useForm({
  schema,
  defaultValues: {
    name: 'Original Name',
    email: 'original@email.com',
  },
})

const defaultValues = {
  name: 'Original Name',
  email: 'original@email.com',
}

const currentValues = watch()

const hasChanges = computed(() => {
  return JSON.stringify(currentValues.value) !== JSON.stringify(defaultValues)
})
</script>

<template>
  <div>
    <span v-if="hasChanges" class="unsaved-indicator"> Unsaved changes </span>
    <form>
      <!-- fields -->
    </form>
  </div>
</template>
```

## useWatch Composable

For child components, use the `useWatch` composable:

```vue
<!-- PasswordStrength.vue -->
<script setup>
import { computed } from 'vue'
import { useWatch } from '@vuehookform/core'

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
  if (!p) return { level: 0, label: 'None' }
  if (p.length < 8) return { level: 1, label: 'Weak' }
  if (/[A-Z]/.test(p) && /[0-9]/.test(p)) return { level: 3, label: 'Strong' }
  return { level: 2, label: 'Medium' }
})
</script>

<template>
  <div class="password-strength">
    <div class="strength-bar" :data-level="strength.level" />
    <span>{{ strength.label }}</span>
  </div>
</template>
```

Usage:

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import PasswordStrength from './PasswordStrength.vue'

const { control, register } = useForm({ schema })
</script>

<template>
  <input v-bind="register('password')" type="password" />
  <PasswordStrength :control="control" />
</template>
```

## Performance Tips

1. **Watch specific fields** instead of all values when possible
2. **Use computed properties** for derived values to leverage Vue's caching
3. **Avoid expensive operations** in watch callbacks
4. **Consider debouncing** for real-time features like auto-save

```typescript
import { watchDebounced } from '@vueuse/core'

const formData = watch()

watchDebounced(
  formData,
  (values) => {
    autoSave(values)
  },
  { debounce: 1000 },
)
```

## Next Steps

- Learn about [Programmatic Control](/guide/advanced/programmatic-control)
- Explore [TypeScript](/guide/advanced/typescript) integration
