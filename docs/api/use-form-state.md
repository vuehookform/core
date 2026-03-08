# useFormState

Subscribe to specific form state changes for optimized re-renders.

## Import

```typescript
import { useFormState } from '@vuehookform/core'
```

## Usage

```typescript
const { isDirty, errors } = useFormState({ control })
```

## When to Use

Use `useFormState` when you need to:

- Access form state in a child component
- Subscribe to specific state properties only
- Optimize re-renders by limiting subscriptions

For most cases, accessing `formState` directly from `useForm` is sufficient.

## Options

### control

**Type:** `Control<T>`\
**Required:** Yes

The control object from `useForm`.

```typescript
const { control } = useForm({ schema })
const state = useFormState({ control })
```

## Return Values

All properties are reactive refs:

### errors

```typescript
errors: Ref<FieldErrors<T>>
```

Current validation errors.

```typescript
const { errors } = useFormState({ control })

// In template
<span v-if="errors.email">{{ errors.email }}</span>
```

### isDirty

```typescript
isDirty: Ref<boolean>
```

True if any field has been modified from default values.

### isValid

```typescript
isValid: Ref<boolean>
```

True if the form has no validation errors.

### isSubmitting

```typescript
isSubmitting: Ref<boolean>
```

True while form submission is in progress.

### isSubmitted

```typescript
isSubmitted: Ref<boolean>
```

True after the form has been submitted at least once.

### isSubmitSuccessful

```typescript
isSubmitSuccessful: Ref<boolean>
```

True if the last submission completed without errors.

### submitCount

```typescript
submitCount: Ref<number>
```

Number of times the form has been submitted.

### touchedFields

```typescript
touchedFields: Ref<Set<string>>
```

Set of field names that have been touched (blurred).

### dirtyFields

```typescript
dirtyFields: Ref<Set<string>>
```

Set of field names with values different from defaults.

## Example: Submit Button Component

```vue
<!-- SubmitButton.vue -->
<script setup lang="ts">
import { useFormState } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

const props = defineProps<{
  control: Control<any>
}>()

const { isSubmitting, isDirty, isValid } = useFormState({
  control: props.control,
})
</script>

<template>
  <button type="submit" :disabled="isSubmitting || !isDirty" :class="{ loading: isSubmitting }">
    <span v-if="isSubmitting">Saving...</span>
    <span v-else>Save Changes</span>
  </button>
</template>
```

## Example: Error Summary Component

```vue
<!-- ErrorSummary.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useFormState } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

const props = defineProps<{
  control: Control<any>
}>()

const { errors, isSubmitted } = useFormState({
  control: props.control,
})

const errorList = computed(() => {
  return Object.entries(errors.value).map(([field, message]) => ({
    field,
    message,
  }))
})

const hasErrors = computed(() => errorList.value.length > 0)
</script>

<template>
  <div v-if="isSubmitted && hasErrors" class="error-summary" role="alert">
    <h3>Please fix the following errors:</h3>
    <ul>
      <li v-for="error in errorList" :key="error.field">
        <strong>{{ error.field }}:</strong> {{ error.message }}
      </li>
    </ul>
  </div>
</template>
```

## Example: Form Status Indicator

```vue
<!-- FormStatus.vue -->
<script setup lang="ts">
import { useFormState } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

const props = defineProps<{
  control: Control<any>
}>()

const { isDirty, isValid, isSubmitting } = useFormState({
  control: props.control,
})
</script>

<template>
  <div class="form-status">
    <span v-if="isSubmitting" class="status submitting"> Submitting... </span>
    <span v-else-if="isDirty && !isValid" class="status invalid"> Form has errors </span>
    <span v-else-if="isDirty" class="status dirty"> Unsaved changes </span>
    <span v-else class="status clean"> No changes </span>
  </div>
</template>
```

## Comparison with formState

| Approach                   | Use Case                                     |
| -------------------------- | -------------------------------------------- |
| `formState` from `useForm` | Most common, direct access in form component |
| `useFormState`             | Child components, selective subscriptions    |
