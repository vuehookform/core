# Controlled Inputs

Use controlled mode when you need v-model or are integrating with custom components.

## When to Use Controlled Mode

- Working with custom input components that require v-model
- Need to access the reactive value directly
- Integrating with third-party UI libraries
- Building complex input logic

## Basic Usage

Add `{ controlled: true }` to register:

```vue
<script setup>
import { useForm } from '@vuehookform/core'

const { register } = useForm({ schema })

// Destructure value separately
const { value: emailValue, ...emailBindings } = register('email', { controlled: true })
</script>

<template>
  <!-- Use v-model with the value ref -->
  <input v-model="emailValue" v-bind="emailBindings" />
</template>
```

## Return Value Difference

**Uncontrolled (default):**

```typescript
const bindings = register('email')
// { name, ref, onChange, onBlur }
```

**Controlled:**

```typescript
const { value, ...bindings } = register('email', { controlled: true })
// value: Ref<string>
// bindings: { name, onChange, onBlur }
```

## With Custom Components

Custom components typically require v-model:

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import CustomInput from './CustomInput.vue'
import DatePicker from 'some-date-library'

const { register, handleSubmit } = useForm({ schema })

const { value: nameValue, ...nameBindings } = register('name', { controlled: true })
const { value: dateValue, ...dateBindings } = register('birthDate', { controlled: true })
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <CustomInput v-model="nameValue" v-bind="nameBindings" label="Name" />

    <DatePicker v-model="dateValue" v-bind="dateBindings" />

    <button type="submit">Submit</button>
  </form>
</template>
```

## With UI Libraries

### Vuetify

```vue
<script setup>
import { useForm } from '@vuehookform/core'

const { register, formState, handleSubmit } = useForm({ schema })

const { value: emailValue, ...emailBindings } = register('email', { controlled: true })
</script>

<template>
  <v-form @submit.prevent="handleSubmit(onSubmit)">
    <v-text-field
      v-model="emailValue"
      v-bind="emailBindings"
      label="Email"
      :error-messages="formState.value.errors.email"
    />
  </v-form>
</template>
```

### PrimeVue

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import InputText from 'primevue/inputtext'

const { register, formState, handleSubmit } = useForm({ schema })

const { value: usernameValue, ...usernameBindings } = register('username', { controlled: true })
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <InputText
      v-model="usernameValue"
      v-bind="usernameBindings"
      :class="{ 'p-invalid': formState.value.errors.username }"
    />
    <small v-if="formState.value.errors.username" class="p-error">
      {{ formState.value.errors.username }}
    </small>
  </form>
</template>
```

::: tip When to use useController instead
For simple PrimeVue inputs like `InputText`, controlled mode with `register()` works well. For complex components with non-standard events (like `InputNumber`, `Calendar`, or `Dropdown`), consider [useController](/api/use-controller) for more reliable integration.
:::

### Element Plus

```vue
<script setup>
import { useForm } from '@vuehookform/core'

const { register, formState, handleSubmit } = useForm({ schema })

const { value: emailValue, ...emailBindings } = register('email', { controlled: true })
const { value: ageValue, ...ageBindings } = register('age', { controlled: true })
</script>

<template>
  <el-form @submit.prevent="handleSubmit(onSubmit)">
    <el-form-item label="Email" :error="formState.value.errors.email">
      <el-input v-model="emailValue" v-bind="emailBindings" />
    </el-form-item>

    <el-form-item label="Age" :error="formState.value.errors.age">
      <el-input-number v-model="ageValue" v-bind="ageBindings" />
    </el-form-item>
  </el-form>
</template>
```

## Reactive Value Access

With controlled mode, you can use the value reactively:

```vue
<script setup>
import { computed } from 'vue'
import { useForm } from '@vuehookform/core'

const { register, handleSubmit } = useForm({ schema })

const { value: passwordValue, ...passwordBindings } = register('password', { controlled: true })

// Compute based on current value
const passwordStrength = computed(() => {
  const p = passwordValue.value
  if (!p || p.length < 8) return 'weak'
  if (/[A-Z]/.test(p) && /[0-9]/.test(p)) return 'strong'
  return 'medium'
})
</script>

<template>
  <input v-model="passwordValue" v-bind="passwordBindings" type="password" />
  <div :class="`strength-${passwordStrength}`">Strength: {{ passwordStrength }}</div>
</template>
```

## Multiple Controlled Fields

```vue
<script setup>
import { useForm } from '@vuehookform/core'

const { register, handleSubmit, formState } = useForm({ schema })

// Register multiple controlled fields
const { value: firstName, ...firstNameBindings } = register('firstName', { controlled: true })
const { value: lastName, ...lastNameBindings } = register('lastName', { controlled: true })
const { value: email, ...emailBindings } = register('email', { controlled: true })
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <CustomInput
      v-model="firstName"
      v-bind="firstNameBindings"
      label="First Name"
      :error="formState.value.errors.firstName"
    />

    <CustomInput
      v-model="lastName"
      v-bind="lastNameBindings"
      label="Last Name"
      :error="formState.value.errors.lastName"
    />

    <CustomInput
      v-model="email"
      v-bind="emailBindings"
      label="Email"
      type="email"
      :error="formState.value.errors.email"
    />

    <button type="submit">Submit</button>
  </form>
</template>
```

## Performance Considerations

Controlled inputs trigger Vue's reactivity on every change. For better performance:

- Use uncontrolled inputs for simple native inputs
- Only use controlled mode when necessary
- Consider `onBlur` validation mode to reduce validation frequency

## Next Steps

- Learn about [Uncontrolled Inputs](/guide/components/uncontrolled-inputs) for native elements
- See [Custom Components](/guide/components/custom-components) for building reusable fields
