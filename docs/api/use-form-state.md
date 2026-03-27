# useFormState

Subscribe to specific form state changes for optimized re-renders.

## Import

```typescript
import { useFormState } from '@vuehookform/core'
```

## Usage

```typescript
const state = useFormState({ control })
// Access: state.value.isDirty, state.value.errors
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

## Return Value

Returns a single `ComputedRef<Partial<FormState<T>>>` containing the requested state properties. Access properties via `.value`:

```typescript
const state = useFormState({ control })

// In template
<span v-if="state.value.errors.email">{{ state.value.errors.email }}</span>
<button :disabled="state.value.isSubmitting">Submit</button>
```

### Available Properties

| Property             | Type             | Description                      |
| -------------------- | ---------------- | -------------------------------- |
| `errors`             | `FieldErrors<T>` | Current validation errors        |
| `isDirty`            | `boolean`        | Any field modified from defaults |
| `isValid`            | `boolean`        | No validation errors             |
| `isSubmitting`       | `boolean`        | Submission in progress           |
| `isSubmitted`        | `boolean`        | Submitted at least once          |
| `isSubmitSuccessful` | `boolean`        | Last submission succeeded        |
| `submitCount`        | `number`         | Number of submissions            |
| `touchedFields`      | `Set<string>`    | Fields that have been blurred    |
| `dirtyFields`        | `Set<string>`    | Fields different from defaults   |

## Example: Submit Button Component

```vue
<!-- SubmitButton.vue -->
<script setup lang="ts">
import { useFormState } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

const props = defineProps<{
  control: Control<any>
}>()

const state = useFormState({
  control: props.control,
})
</script>

<template>
  <button
    type="submit"
    :disabled="state.value.isSubmitting || !state.value.isDirty"
    :class="{ loading: state.value.isSubmitting }"
  >
    <span v-if="state.value.isSubmitting">Saving...</span>
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

const state = useFormState({
  control: props.control,
})

const errorList = computed(() => {
  const errors = state.value.errors ?? {}
  return Object.entries(errors).map(([field, message]) => ({
    field,
    message,
  }))
})

const hasErrors = computed(() => errorList.value.length > 0)
</script>

<template>
  <div v-if="state.value.isSubmitted && hasErrors" class="error-summary" role="alert">
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

const state = useFormState({
  control: props.control,
})
</script>

<template>
  <div class="form-status">
    <span v-if="state.value.isSubmitting" class="status submitting"> Submitting... </span>
    <span v-else-if="state.value.isDirty && !state.value.isValid" class="status invalid">
      Form has errors
    </span>
    <span v-else-if="state.value.isDirty" class="status dirty"> Unsaved changes </span>
    <span v-else class="status clean"> No changes </span>
  </div>
</template>
```

## Comparison with formState

| Approach                   | Use Case                                     |
| -------------------------- | -------------------------------------------- |
| `formState` from `useForm` | Most common, direct access in form component |
| `useFormState`             | Child components, selective subscriptions    |
