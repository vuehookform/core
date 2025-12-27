# Error Handling

Learn how to display and manage validation errors effectively.

## Accessing Errors

Errors are available through `formState.value.errors`:

```vue
<script setup lang="ts">
const { register, formState } = useForm({ schema })
</script>

<template>
  <div>
    <input v-bind="register('email')" type="email" />
    <span v-if="formState.value.errors.email" class="error">
      {{ formState.value.errors.email }}
    </span>
  </div>
</template>
```

## Error Structure

Errors mirror your schema structure:

```typescript
const schema = z.object({
  email: z.email(),
  profile: z.object({
    name: z.string(),
    bio: z.string(),
  }),
  items: z.array(
    z.object({
      title: z.string(),
    }),
  ),
})

// Accessing errors
formState.value.errors.email // string | undefined
formState.value.errors.profile?.name // string | undefined
formState.value.errors.items?.[0]?.title // string | undefined
```

## Error Display Patterns

### Inline Errors

Show errors next to each field:

```vue
<template>
  <div class="field">
    <label for="email">Email</label>
    <input
      id="email"
      v-bind="register('email')"
      :class="{ 'input-error': formState.value.errors.email }"
    />
    <p v-if="formState.value.errors.email" class="error-message">
      {{ formState.value.errors.email }}
    </p>
  </div>
</template>

<style>
.input-error {
  border-color: red;
}
.error-message {
  color: red;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>
```

### Error Summary

Show all errors at the top of the form:

```vue
<template>
  <form @submit="handleSubmit(onSubmit)">
    <div v-if="Object.keys(formState.value.errors).length" class="error-summary">
      <h3>Please fix the following errors:</h3>
      <ul>
        <li v-for="(error, field) in formState.value.errors" :key="field">
          {{ field }}: {{ error }}
        </li>
      </ul>
    </div>

    <!-- Form fields -->
  </form>
</template>
```

### Reusable Error Component

Create a reusable component for consistent error display:

```vue
<!-- FormError.vue -->
<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <p v-if="message" class="form-error" role="alert">
    {{ message }}
  </p>
</template>

<style scoped>
.form-error {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>
```

Usage:

```vue
<template>
  <input v-bind="register('email')" />
  <FormError :message="formState.value.errors.email" />
</template>
```

## Field-Level Error State

Track if a field has been touched before showing errors:

```vue
<template>
  <input v-bind="register('email')" />
  <!-- Only show error after user has interacted with field -->
  <span v-if="formState.value.touchedFields.has('email') && formState.value.errors.email">
    {{ formState.value.errors.email }}
  </span>
</template>
```

## Clearing Errors

### Reset Entire Form

```typescript
const { reset } = useForm({ schema })

// Clear all errors and values
reset()

// Reset with new values
reset({
  email: 'new@example.com',
})
```

### Clear Specific Field

When a field value changes, its error is automatically cleared on the next validation (depending on your validation mode).

## Nested Object Errors

For nested fields, access errors through the nested path:

```vue
<script setup>
const schema = z.object({
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
  }),
})

const { register, formState } = useForm({ schema })
</script>

<template>
  <div>
    <input v-bind="register('address.street')" />
    <span v-if="formState.value.errors.address?.street">
      {{ formState.value.errors.address.street }}
    </span>
  </div>

  <div>
    <input v-bind="register('address.city')" />
    <span v-if="formState.value.errors.address?.city">
      {{ formState.value.errors.address.city }}
    </span>
  </div>
</template>
```

## Array Field Errors

For field arrays, use the index to access errors:

```vue
<script setup>
const schema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1, 'Name required'),
    }),
  ),
})

const { register, formState, fields } = useForm({ schema })
const items = fields('items')
</script>

<template>
  <div v-for="field in items.value" :key="field.key">
    <input v-bind="register(`items.${field.index}.name`)" />
    <span v-if="formState.value.errors.items?.[field.index]?.name">
      {{ formState.value.errors.items[field.index].name }}
    </span>
  </div>
</template>
```

## Accessibility

Make errors accessible to screen readers:

```vue
<template>
  <div>
    <label for="email">Email</label>
    <input
      id="email"
      v-bind="register('email')"
      :aria-invalid="!!formState.value.errors.email"
      :aria-describedby="formState.value.errors.email ? 'email-error' : undefined"
    />
    <p v-if="formState.value.errors.email" id="email-error" role="alert" class="error">
      {{ formState.value.errors.email }}
    </p>
  </div>
</template>
```

## Next Steps

- Learn about [Form State](/guide/essentials/form-state) for additional form status tracking
- Explore [Validation](/guide/essentials/validation) strategies
