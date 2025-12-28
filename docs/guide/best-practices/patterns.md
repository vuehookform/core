# Patterns

Common patterns and best practices for building forms with Vue Hook Form.

## Form Organization

### Separate Schema Definition

Keep schemas in separate files for reusability:

```typescript
// schemas/user.ts
import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  role: z.enum(['admin', 'user', 'guest']),
})

export type UserFormData = z.infer<typeof userSchema>
```

```vue
<!-- UserForm.vue -->
<script setup>
import { useForm } from '@vuehookform/core'
import { userSchema, type UserFormData } from '@/schemas/user'

const form = useForm({ schema: userSchema })
</script>
```

### Composable Wrapper

Create a composable for forms you use multiple times:

```typescript
// composables/useUserForm.ts
import { useForm } from '@vuehookform/core'
import { userSchema } from '@/schemas/user'

export function useUserForm(defaultValues?: Partial<UserFormData>) {
  return useForm({
    schema: userSchema,
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
      ...defaultValues,
    },
  })
}
```

## Error Handling

### Centralized Error Display

Create a consistent error component:

```vue
<!-- FormError.vue -->
<script setup>
defineProps<{
  message?: string
  show?: boolean
}>()
</script>

<template>
  <Transition name="fade">
    <p v-if="message && show !== false" class="form-error" role="alert">
      {{ message }}
    </p>
  </Transition>
</template>
```

### Error Summary

Show all errors at once:

```vue
<script setup>
import { computed } from 'vue'

const { formState } = useForm({ schema })

const errorMessages = computed(() => {
  return Object.entries(formState.value.errors)
    .filter(([, msg]) => msg)
    .map(([field, msg]) => ({ field, message: msg }))
})
</script>

<template>
  <div v-if="errorMessages.length" class="error-summary">
    <h3>Please fix the following errors:</h3>
    <ul>
      <li v-for="err in errorMessages" :key="err.field">
        <strong>{{ err.field }}:</strong> {{ err.message }}
      </li>
    </ul>
  </div>
</template>
```

## Server Integration

For server error handling patterns, see [Async Patterns - Server Error Integration](/guide/advanced/async-patterns#server-error-integration).

### Optimistic Updates

Update UI before server confirms:

```typescript
const onSubmit = async (data) => {
  // Optimistically update UI
  showSuccessMessage()

  try {
    await api.submit(data)
  } catch (error) {
    // Revert on failure
    hideSuccessMessage()
    setError('root', 'Submission failed')
  }
}
```

## Form State Management

### Unsaved Changes Warning

```vue
<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

const { formState } = useForm({ schema })

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (formState.value.isDirty) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>
```

### Auto-Save

```typescript
import { watchDebounced } from '@vueuse/core'

const formData = watch()

watchDebounced(
  formData,
  async (values) => {
    if (formState.value.isDirty && formState.value.isValid) {
      await saveDraft(values)
    }
  },
  { debounce: 2000 },
)
```

## Multi-Step Forms

### Step Navigation

```vue
<script setup>
import { ref, computed } from 'vue'

const step = ref(1)
const totalSteps = 3

const stepFields = {
  1: ['email', 'password'],
  2: ['firstName', 'lastName'],
  3: ['address', 'city', 'zip'],
}

const canGoNext = async () => {
  const fields = stepFields[step.value]
  return await trigger(fields)
}

const nextStep = async () => {
  if (await canGoNext()) {
    step.value = Math.min(step.value + 1, totalSteps)
  }
}

const prevStep = () => {
  step.value = Math.max(step.value - 1, 1)
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <div class="progress">Step {{ step }} of {{ totalSteps }}</div>

    <div v-show="step === 1">
      <!-- Step 1 fields -->
    </div>
    <div v-show="step === 2">
      <!-- Step 2 fields -->
    </div>
    <div v-show="step === 3">
      <!-- Step 3 fields -->
    </div>

    <div class="actions">
      <button type="button" @click="prevStep" :disabled="step === 1">Back</button>
      <button v-if="step < totalSteps" type="button" @click="nextStep">Next</button>
      <button v-else type="submit">Submit</button>
    </div>
  </form>
</template>
```

## Reusable Field Components

### Field Wrapper

```vue
<!-- FormField.vue -->
<script setup>
import { useFormContext } from '@vuehookform/core'

const props = defineProps<{
  name: string
  label?: string
  type?: string
  required?: boolean
}>()

const { register, formState } = useFormContext()
const error = computed(() => formState.value.errors[props.name])
</script>

<template>
  <div class="form-field" :class="{ 'has-error': error }">
    <label v-if="label" :for="name">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <input :id="name" v-bind="register(name)" :type="type ?? 'text'" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>
```

## Testing

### Unit Testing Forms

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import LoginForm from './LoginForm.vue'

describe('LoginForm', () => {
  it('shows error for invalid email', async () => {
    const wrapper = mount(LoginForm)

    await wrapper.find('input[name="email"]').setValue('invalid')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Invalid email')
  })

  it('calls onSubmit with valid data', async () => {
    const onSubmit = vi.fn()
    const wrapper = mount(LoginForm, {
      props: { onSubmit },
    })

    await wrapper.find('input[name="email"]').setValue('test@example.com')
    await wrapper.find('input[name="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit')

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })
})
```

## Accessibility

### ARIA Attributes

```vue
<template>
  <div class="field">
    <label :for="name">{{ label }}</label>
    <input
      :id="name"
      v-bind="register(name)"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${name}-error` : undefined"
    />
    <p v-if="error" :id="`${name}-error`" role="alert" class="error">
      {{ error }}
    </p>
  </div>
</template>
```

### Focus Management

```typescript
const onSubmit = async (data) => {
  const firstError = Object.keys(formState.value.errors)[0]
  if (firstError) {
    const element = document.querySelector(`[name="${firstError}"]`)
    element?.focus()
  }
}
```

## Common Mistakes to Avoid

### Don't Mix v-model with register

```vue
<!-- Wrong -->
<input v-model="email" v-bind="register('email')" />

<!-- Right: uncontrolled -->
<input v-bind="register('email')" />

<!-- Right: controlled -->
<input v-model="emailValue" v-bind="emailBindings" />
```

### Don't Use Array Bracket Notation

```typescript
// Wrong
register('items[0].name')

// Right
register('items.0.name')
register(`items.${index}.name`)
```

### Don't Forget .value for Refs

```vue
<!-- Wrong -->
<span v-if="formState.errors.email"></span>
```

### Don't Use Index as Key in Field Arrays

```vue
<!-- Wrong -->
<div v-for="(field, index) in items.value" :key="index"></div>
```

## Summary

1. **Organize schemas** in separate files
2. **Create reusable** field components
3. **Handle errors** consistently
4. **Implement proper** server integration
5. **Add accessibility** attributes
6. **Test your forms** thoroughly
7. **Avoid common mistakes**
