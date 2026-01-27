# Custom Components

Build reusable form field components that integrate with Vue Hook Form.

## Choosing the Right Approach

| Your Component                                    | Recommended Approach                  |
| ------------------------------------------------- | ------------------------------------- |
| Native HTML (`<input>`, `<select>`, `<textarea>`) | `register()` (uncontrolled)           |
| Vue component exposing input via `$el`            | `register()` (uncontrolled)           |
| Custom component with standard v-model            | `register(..., { controlled: true })` |
| Third-party with custom events (Calendar, etc.)   | `useController`                       |
| Building reusable form components                 | `useController`                       |
| Deeply nested components                          | Form Context                          |

::: tip Choosing Between Approaches for Third-Party Libraries
Many simple input components (like PrimeVue's `InputText` or Vuetify's `v-text-field`) now work with uncontrolled `register()` because they expose their input element via `$el`. For complex components with custom events (date pickers, rich selects, autocompletes), `useController` provides explicit `onChange(value)` and `onBlur()` methods that work regardless of the component's event model.
:::

::: danger Critical: Error Messages in Custom Components
**Problem:** Using `getFieldState()` in custom components causes error messages to **persist incorrectly** after fixing validation issues.

**Why?** `getFieldState()` returns a plain object snapshot, NOT reactive refs. If you call it once in setup, that snapshot never updates.

```vue
<!-- ❌ WRONG - Error persists even after valid input -->
<script setup>
const { getFieldState } = useFormContext()
const fieldState = getFieldState(props.name) // Snapshot!
</script>
<template>
  <span v-if="fieldState.error">{{ fieldState.error }}</span>
  <!-- This error will NOT clear when user fixes the input -->
</template>
```

**Solutions:**

1. **Use `useController` (RECOMMENDED)** - Provides reactive `fieldState`:

   ```vue
   <script setup>
   const { field, fieldState } = useController({ name: props.name, control })
   // fieldState is a ComputedRef - updates automatically ✅
   </script>
   <template>
     <span v-if="fieldState.error">{{ fieldState.error }}</span>
   </template>
   ```

2. **Use `formState.value.errors`** - Pass as prop from parent:

   ```vue
   <CustomInput :error="formState.value.errors.email" />
   ```

3. **Use Form Context with `formState`**:
   ```vue
   <script setup>
   const { formState } = useFormContext()
   </script>
   <template>
     <span v-if="formState.value.errors[props.name]">
       {{ formState.value.errors[props.name] }}
     </span>
   </template>
   ```

The examples below demonstrate the correct reactive patterns.
:::

::: warning computed() Does NOT Help
You might think wrapping `getFieldState()` in `computed()` would make it reactive:

```typescript
// ❌ Still NOT reactive - computed only runs once
const fieldState = computed(() => getFieldState(props.name))
```

This doesn't work because `getFieldState()` reads from plain objects, not reactive refs. The `computed` will only re-run when its reactive dependencies change, but `getFieldState()` has none.

**Always use `useController` for reactive field state in custom components.**
:::

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
import type { LooseControl } from '@vuehookform/core'

const props = defineProps<{
  name: string
  control: LooseControl
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

For deeply nested components, use provideForm and useFormContext:

```vue
<!-- Form wrapper -->
<script setup>
import { useForm, provideForm } from '@vuehookform/core'

const form = useForm({ schema })
provideForm(form) // Make form available to all descendants
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <slot />
  </form>
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

### Error Handling

If `useFormContext()` is called outside a `provideForm()` tree, it throws an error:

```
"useFormContext must be used within a component tree where provideForm() has been called."
```

Always ensure your form field components are descendants of a component that calls `provideForm()`.

## Select Component

```vue
<!-- FormSelect.vue -->
<script setup lang="ts">
import { useController } from '@vuehookform/core'
import type { LooseControl } from '@vuehookform/core'

interface Option {
  value: string
  label: string
}

const props = defineProps<{
  name: string
  control: LooseControl
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
import type { LooseControl } from '@vuehookform/core'

const props = defineProps<{
  name: string
  control: LooseControl
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
import type { LooseControl } from '@vuehookform/core'

interface Option {
  value: string
  label: string
}

const props = defineProps<{
  name: string
  control: LooseControl
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

### Reusable Components (Recommended)

For components that work with any form, use `LooseControl`:

```typescript
import type { LooseControl } from '@vuehookform/core'

// Reusable component props
interface FormFieldProps {
  name: string
  control: LooseControl
  label?: string
}

// Usage with defineProps
const props = defineProps<FormFieldProps>()
```

### Type-Safe Components

For components tied to a specific form schema:

```typescript
import type { UseFormReturn, Path } from '@vuehookform/core'

// Generic component props with full type safety
interface FormFieldProps<TSchema extends ZodType> {
  name: Path<InferSchema<TSchema>>
  control: UseFormReturn<TSchema>
  label?: string
}

// Usage with defineProps
const props = defineProps<FormFieldProps<typeof schema>>()
```

::: tip When to Use Each Approach

- **LooseControl**: Reusable components in component libraries, shared across projects
- **Typed Control**: Components specific to one form with full autocomplete for field names
  :::

## Re-render Behavior with Custom Components

Understanding when your custom components re-render helps optimize performance.

### When useController Components Re-render

Components using `useController` re-render when:

| Event                        | Causes Re-render?     | Why                            |
| ---------------------------- | --------------------- | ------------------------------ |
| User types in the field      | Yes                   | `field.value` is reactive      |
| Field validation runs        | Only if error changes | `fieldState.error` updates     |
| Other fields change          | No                    | Isolated field state           |
| Form submission starts/ends  | No                    | Unless watching `isSubmitting` |
| `setValue()` called on field | Yes                   | Value changed externally       |

### Optimizing Re-renders with Validation Modes

Choose the right validation mode to control re-render frequency:

```typescript
// Minimal re-renders: validate only on submit
useForm({ schema, mode: 'onSubmit' })
// Re-renders: only when user types (value change)

// Balanced: validate on blur
useForm({ schema, mode: 'onBlur' })
// Re-renders: typing + one validation per field blur

// Maximum feedback, more re-renders: validate on every change
useForm({ schema, mode: 'onChange' })
// Re-renders: typing + validation on each keystroke

// Smart progression: submit first, then real-time feedback
useForm({ schema, mode: 'onSubmit', reValidateMode: 'onChange' })
// Re-renders: typing only, then typing + validation after first submit
```

### Example: Custom Component with Render Tracking

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useController } from '@vuehookform/core'
import type { LooseControl } from '@vuehookform/core'

const props = defineProps<{
  name: string
  control: LooseControl
  label?: string
}>()

const { field, fieldState } = useController({
  name: props.name,
  control: props.control,
})

// Track renders for debugging
const renderCount = ref(0)
renderCount.value++
console.log(`${props.name} rendered: ${renderCount.value} times`)
</script>

<template>
  <div class="custom-input">
    <label v-if="label">{{ label }}</label>
    <input
      :value="field.value"
      @input="field.onChange(($event.target as HTMLInputElement).value)"
      @blur="field.onBlur"
    />
    <p v-if="fieldState.error" class="error">{{ fieldState.error }}</p>
    <small class="debug">Renders: {{ renderCount }}</small>
  </div>
</template>
```

### Comparing Approaches: Re-render Impact

| Approach                              | Re-renders on Typing | Re-renders on Blur | Best For                  |
| ------------------------------------- | -------------------- | ------------------ | ------------------------- |
| `register()` (uncontrolled)           | No                   | Only if error      | Native inputs, max perf   |
| `register(..., { controlled: true })` | Yes                  | Only if error      | Simple custom components  |
| `useController`                       | Yes                  | Only if error      | Third-party libs, complex |

### When to Use Each Approach

**Use uncontrolled `register()` when:**

- Using native HTML elements (`<input>`, `<select>`, `<textarea>`)
- Maximum performance is critical
- You don't need real-time value access

**Use controlled `register(..., { controlled: true })` when:**

- Your custom component accepts `v-model`
- You need the simplest integration
- The component follows standard Vue v-model conventions

**Use `useController` when:**

- Integrating third-party UI libraries (PrimeVue, Vuetify, Element Plus)
- You need explicit control over onChange/onBlur handlers
- Building reusable form field components
- The component has non-standard event patterns

## Next Steps

- Learn about [Field Arrays](/guide/dynamic/field-arrays) for dynamic lists
- Explore [Form Context](/guide/advanced/form-context) for component composition
- See [Performance](/guide/best-practices/performance) for optimization strategies
