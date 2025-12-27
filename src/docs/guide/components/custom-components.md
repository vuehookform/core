# Custom Components

Build reusable form field components that integrate with Vue Hook Form.

## Approaches

There are several ways to integrate custom components:

1. **Controlled mode with register** - Quick integration
2. **useController** - Full control over field behavior
3. **Form Context** - Deeply nested components

## Quick Integration with Controlled Mode

For simple custom components, use controlled mode:

```vue
<!-- Parent form -->
<script setup>
import { useForm } from '@vuehookform/core'
import TextInput from './TextInput.vue'

const { register, handleSubmit, formState } = useForm({ schema })

const { value: emailValue, ...emailBindings } = register('email', { controlled: true })
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <TextInput
      v-model="emailValue"
      v-bind="emailBindings"
      label="Email"
      :error="formState.value.errors.email"
    />
  </form>
</template>
```

```vue
<!-- TextInput.vue -->
<script setup>
defineProps<{
  modelValue: string
  label?: string
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="field">
    <label v-if="label">{{ label }}</label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="error">{{ error }}</span>
  </div>
</template>
```

## Building with useController

For more control, use `useController`:

```vue
<!-- FormInput.vue -->
<script setup lang="ts">
import { useController } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

const props = defineProps<{
  name: string
  control: Control<any>
  label?: string
  type?: string
  placeholder?: string
}>()

const { field, fieldState } = useController({
  name: props.name,
  control: props.control,
})
</script>

<template>
  <div class="form-input">
    <label v-if="label" :for="name" class="label">
      {{ label }}
    </label>

    <input
      :id="name"
      :name="field.name"
      :type="type ?? 'text'"
      :value="field.value"
      :placeholder="placeholder"
      :class="{ 'has-error': fieldState.error }"
      @input="field.onChange(($event.target as HTMLInputElement).value)"
      @blur="field.onBlur"
    />

    <p v-if="fieldState.error" class="error-message" role="alert">
      {{ fieldState.error }}
    </p>

    <p v-if="fieldState.isTouched && !fieldState.error" class="success-message"></p>
  </div>
</template>

<style scoped>
.form-input {
  margin-bottom: 1rem;
}
.label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}
input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
input.has-error {
  border-color: #dc2626;
}
.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
.success-message {
  color: #16a34a;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>
```

Usage:

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import FormInput from './FormInput.vue'

const { control, handleSubmit } = useForm({ schema })
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <FormInput name="email" :control="control" label="Email" type="email" />
    <FormInput name="password" :control="control" label="Password" type="password" />
    <button type="submit">Submit</button>
  </form>
</template>
```

## Using Form Context

For deeply nested components, use FormProvider and useFormContext:

```vue
<!-- Form wrapper -->
<script setup>
import { useForm, FormProvider } from '@vuehookform/core'

const form = useForm({ schema })
</script>

<template>
  <FormProvider :form="form">
    <form @submit="form.handleSubmit(onSubmit)">
      <slot />
    </form>
  </FormProvider>
</template>
```

```vue
<!-- Deeply nested component -->
<script setup>
import { useFormContext } from '@vuehookform/core'

const props = defineProps<{
  name: string
  label?: string
}>()

const { register, formState } = useFormContext()
</script>

<template>
  <div class="field">
    <label v-if="label">{{ label }}</label>
    <input v-bind="register(name)" />
    <span v-if="formState.value.errors[name]" class="error">
      {{ formState.value.errors[name] }}
    </span>
  </div>
</template>
```

## Select Component

```vue
<!-- FormSelect.vue -->
<script setup lang="ts">
import { useController } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

interface Option {
  value: string
  label: string
}

const props = defineProps<{
  name: string
  control: Control<any>
  options: Option[]
  label?: string
  placeholder?: string
}>()

const { field, fieldState } = useController({
  name: props.name,
  control: props.control,
})
</script>

<template>
  <div class="form-select">
    <label v-if="label" :for="name">{{ label }}</label>

    <select
      :id="name"
      :name="field.name"
      :value="field.value"
      :class="{ 'has-error': fieldState.error }"
      @change="field.onChange(($event.target as HTMLSelectElement).value)"
      @blur="field.onBlur"
    >
      <option v-if="placeholder" value="" disabled>
        {{ placeholder }}
      </option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <p v-if="fieldState.error" class="error-message">
      {{ fieldState.error }}
    </p>
  </div>
</template>
```

## Checkbox Component

```vue
<!-- FormCheckbox.vue -->
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
  <div class="form-checkbox">
    <label class="checkbox-label">
      <input
        type="checkbox"
        :name="field.name"
        :checked="field.value"
        @change="field.onChange(($event.target as HTMLInputElement).checked)"
        @blur="field.onBlur"
      />
      <span class="checkbox-text">{{ label }}</span>
    </label>

    <p v-if="fieldState.error" class="error-message">
      {{ fieldState.error }}
    </p>
  </div>
</template>
```

## Radio Group Component

```vue
<!-- FormRadioGroup.vue -->
<script setup lang="ts">
import { useController } from '@vuehookform/core'
import type { Control } from '@vuehookform/core'

interface Option {
  value: string
  label: string
}

const props = defineProps<{
  name: string
  control: Control<any>
  options: Option[]
  label?: string
}>()

const { field, fieldState } = useController({
  name: props.name,
  control: props.control,
})
</script>

<template>
  <fieldset class="form-radio-group">
    <legend v-if="label">{{ label }}</legend>

    <label v-for="option in options" :key="option.value" class="radio-option">
      <input
        type="radio"
        :name="field.name"
        :value="option.value"
        :checked="field.value === option.value"
        @change="field.onChange(option.value)"
        @blur="field.onBlur"
      />
      <span>{{ option.label }}</span>
    </label>

    <p v-if="fieldState.error" class="error-message">
      {{ fieldState.error }}
    </p>
  </fieldset>
</template>
```

## TypeScript Support

Add proper typing to your custom components:

```typescript
import type { Control, Path } from '@vuehookform/core'

// Generic component props
interface FormFieldProps<T> {
  name: Path<T>
  control: Control<T>
  label?: string
}

// Usage with defineProps
const props = defineProps<FormFieldProps<YourFormType>>()
```

## Next Steps

- Learn about [Field Arrays](/guide/dynamic/field-arrays) for dynamic lists
- Explore [Form Context](/guide/advanced/form-context) for component composition
