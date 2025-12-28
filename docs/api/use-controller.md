# useController

A composable for building controlled input components that integrate with Vue Hook Form.

## Import

```typescript
import { useController } from '@vuehookform/core'
```

## Usage

```typescript
const { field, fieldState } = useController({
  name: 'email',
  control,
})
```

## When to Use

Use `useController` when:

- Building reusable form input components
- Integrating with third-party UI libraries
- Need fine-grained control over input behavior

For simple cases, use `register` with `controlled: true` instead.

## Options

### name

**Type:** `Path<T>`\
**Required:** Yes

The field path to control.

```typescript
const controller = useController({
  name: 'user.email',
  control,
})
```

### control

**Type:** `Control<T>`\
**Required:** Yes

The control object from `useForm`.

```typescript
const { control } = useForm({ schema })

const controller = useController({
  name: 'email',
  control,
})
```

### defaultValue

**Type:** `any`\
**Default:** Value from form's defaultValues

Override the default value for this field.

```typescript
const controller = useController({
  name: 'country',
  control,
  defaultValue: 'US',
})
```

## Return Values

### field

Object containing field props and methods:

```typescript
{
  value: Ref<T>       // Current field value
  name: string        // Field name
  onChange: (value: T) => void  // Update value
  onBlur: () => void  // Mark as touched
}
```

### fieldState

Reactive field state:

```typescript
{
  error: string | undefined // Validation error
  isTouched: boolean // Has been blurred
  isDirty: boolean // Value differs from default
}
```

## Example: Custom Input Component

```vue
<!-- CustomInput.vue -->
<script setup lang="ts">
import { useController } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

const props = defineProps<{
  name: string
  control: Control<any>
  label?: string
  placeholder?: string
}>()

const { field, fieldState } = useController({
  name: props.name,
  control: props.control,
})
</script>

<template>
  <div class="form-field">
    <label v-if="label" :for="name">{{ label }}</label>
    <input
      :id="name"
      :name="field.name"
      :value="field.value"
      :placeholder="placeholder"
      :class="{ error: fieldState.error }"
      @input="field.onChange(($event.target as HTMLInputElement).value)"
      @blur="field.onBlur"
    />
    <span v-if="fieldState.error" class="error-message">
      {{ fieldState.error }}
    </span>
  </div>
</template>
```

Usage:

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import CustomInput from './CustomInput.vue'

const { control, handleSubmit } = useForm({ schema })
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <CustomInput
      name="email"
      :control="control"
      label="Email Address"
      placeholder="Enter your email"
    />
    <CustomInput name="password" :control="control" label="Password" />
  </form>
</template>
```

## Example: Select Component

```vue
<!-- CustomSelect.vue -->
<script setup lang="ts">
import { useController } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

const props = defineProps<{
  name: string
  control: Control<any>
  options: { value: string; label: string }[]
  label?: string
}>()

const { field, fieldState } = useController({
  name: props.name,
  control: props.control,
})
</script>

<template>
  <div class="form-field">
    <label v-if="label" :for="name">{{ label }}</label>
    <select
      :id="name"
      :name="field.name"
      :value="field.value"
      @change="field.onChange(($event.target as HTMLSelectElement).value)"
      @blur="field.onBlur"
    >
      <option value="" disabled>Select an option</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <span v-if="fieldState.error" class="error-message">
      {{ fieldState.error }}
    </span>
  </div>
</template>
```

## Example: Checkbox Component

```vue
<!-- CustomCheckbox.vue -->
<script setup lang="ts">
import { useController } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

const props = defineProps<{
  name: string
  control: Control<any>
  label: string
}>()

const { field, fieldState } = useController({
  name: props.name,
  control: props.control,
})
</script>

<template>
  <div class="checkbox-field">
    <label>
      <input
        type="checkbox"
        :name="field.name"
        :checked="field.value"
        @change="field.onChange(($event.target as HTMLInputElement).checked)"
        @blur="field.onBlur"
      />
      {{ label }}
    </label>
    <span v-if="fieldState.error" class="error-message">
      {{ fieldState.error }}
    </span>
  </div>
</template>
```

## Comparison with register

| Feature                 | register                | useController   |
| ----------------------- | ----------------------- | --------------- |
| Simple inputs           | Great                   | Overkill        |
| Custom components       | With `controlled: true` | Ideal           |
| Field state access      | Via formState           | Direct access   |
| Third-party integration | Possible                | Easier          |
| Bundle size impact      | Minimal                 | Slightly larger |
