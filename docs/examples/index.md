# Examples

Interactive examples demonstrating Vue Hook Form capabilities. Try out the forms below to see how Vue Hook Form works.

## Interactive Demos

### Basic Form

A simple form with email, name, and password validation. Uses `onBlur` validation mode.

<ClientOnly>
  <BasicFormDemo />
</ClientOnly>

::: details View Code

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
  defaultValues: { email: '', name: '', password: '' },
})

const submittedData = ref<FormValues | null>(null)

const onSubmit = (data: FormValues) => {
  submittedData.value = data
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <div class="field">
      <label for="email">Email</label>
      <input
        id="email"
        type="email"
        v-bind="register('email')"
        :class="{ 'has-error': formState.value.errors.email }"
      />
      <span v-if="formState.value.errors.email" class="error">
        {{ formState.value.errors.email }}
      </span>
    </div>
    <!-- Similar for name and password fields -->
    <button type="submit">Submit</button>
  </form>
</template>
```

:::

---

### Controlled Inputs

Use controlled mode for select, number inputs, and textareas. Controlled mode is required when using `v-model`.

<ClientOnly>
  <ControlledInputDemo />
</ClientOnly>

::: details View Code

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  country: z.string().min(1, 'Please select a country'),
  age: z.coerce.number().min(18, 'Must be at least 18'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
})

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
})

// Controlled inputs - destructure value for v-model
const { value: countryValue, ...countryBindings } = register('country', { controlled: true })
const { value: ageValue, ...ageBindings } = register('age', { controlled: true })
const { value: bioValue, ...bioBindings } = register('bio', { controlled: true })
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <select v-model="countryValue.value" v-bind="countryBindings">
      <option value="">Select a country</option>
      <option value="US">United States</option>
    </select>

    <input type="number" v-model="ageValue.value" v-bind="ageBindings" />

    <textarea v-model="bioValue.value" v-bind="bioBindings" />
  </form>
</template>
```

:::

---

### Validation Modes

Switch between different validation modes to see how they affect when validation runs.

<ClientOnly>
  <ValidationModesDemo />
</ClientOnly>

::: details View Code

```vue
<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { useForm, type ValidationMode } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
})

const selectedMode = ref<ValidationMode>('onSubmit')
const formKey = ref(0)

const createForm = (mode: ValidationMode) => {
  return useForm({
    schema,
    mode,
    defaultValues: { email: '', username: '' },
  })
}

const form = shallowRef(createForm(selectedMode.value))

const onModeChange = () => {
  form.value = createForm(selectedMode.value)
  formKey.value++
}
</script>

<template>
  <select v-model="selectedMode" @change="onModeChange">
    <option value="onSubmit">onSubmit</option>
    <option value="onBlur">onBlur</option>
    <option value="onChange">onChange</option>
    <option value="onTouched">onTouched</option>
  </select>

  <form :key="formKey" @submit.prevent="form.value.handleSubmit(onSubmit)($event)">
    <input v-bind="form.value.register('email')" />
    <input v-bind="form.value.register('username')" />
  </form>
</template>
```

:::

---

### Field Arrays

Dynamic arrays with add, remove, and validation support. Always use `field.key` for `:key` binding.

<ClientOnly>
  <FieldArrayDemo />
</ClientOnly>

::: details View Code

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  addresses: z
    .array(
      z.object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
      }),
    )
    .min(1),
})

const { register, handleSubmit, fields, getErrors } = useForm({
  schema,
  defaultValues: {
    name: '',
    addresses: [{ street: '', city: '' }],
  },
})

// Call fields() in setup, not in template
const addressFields = fields('addresses', {
  rules: { minLength: { value: 1, message: 'At least one address required' } },
})
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <input v-bind="register('name')" />

    <!-- Always use field.key for :key -->
    <div v-for="field in addressFields.value" :key="field.key">
      <h4>Address {{ field.index + 1 }}</h4>
      <input v-bind="register(`addresses.${field.index}.street`)" />
      <input v-bind="register(`addresses.${field.index}.city`)" />
      <button type="button" @click="addressFields.remove(field.index)">Remove</button>
    </div>

    <button type="button" @click="addressFields.append({ street: '', city: '' })">
      Add Address
    </button>
  </form>
</template>
```

:::

---

### useController

For full control over field state, use `useController`. It provides reactive `fieldState` with error, dirty, and touched states.

<ClientOnly>
  <UseControllerDemo />
</ClientOnly>

::: details View Code

```vue
<script setup lang="ts">
import { useForm, useController } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
})

const form = useForm({
  schema,
  mode: 'onBlur',
})

// useController provides reactive fieldState
const firstNameController = useController({
  name: 'firstName',
  control: form,
})
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <input
      :value="firstNameController.field.value.value"
      @input="firstNameController.field.onChange(($event.target as HTMLInputElement).value)"
      @blur="firstNameController.field.onBlur"
    />

    <!-- fieldState is reactive - updates automatically -->
    <span v-if="firstNameController.fieldState.value.error">
      {{ firstNameController.fieldState.value.error }}
    </span>

    <span>isDirty: {{ firstNameController.fieldState.value.isDirty }}</span>
    <span>isTouched: {{ firstNameController.fieldState.value.isTouched }}</span>
  </form>
</template>
```

:::

---

### Form Context

Share form across deeply nested components without prop drilling using `provideForm` and `useFormContext`.

<ClientOnly>
  <FormContextDemo />
</ClientOnly>

::: details View Code

```vue
<!-- Parent Form -->
<script setup lang="ts">
import { useForm, provideForm } from '@vuehookform/core'
import { z } from 'zod'
import ChildField from './ChildField.vue'

const schema = z.object({
  parentField: z.string().min(2),
  childField: z.string().min(2),
})

const form = useForm({ schema })

// Make form available to ALL descendants
provideForm(form)
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <input v-bind="form.register('parentField')" />

    <!-- Child component accesses form via context -->
    <ChildField />
  </form>
</template>
```

```vue
<!-- ChildField.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useFormContext } from '@vuehookform/core'

const { register, formState } = useFormContext()

// Use computed for reactive error access
const error = computed(() => formState.value.errors.childField)
</script>

<template>
  <input v-bind="register('childField')" />
  <span v-if="error">{{ error }}</span>
</template>
```

:::

---

## Code Examples

### Simple Login Form

### Simple Login Form

A minimal login form with email and password validation.

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
})

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
})

const onSubmit = (data) => console.log(data)
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <input v-bind="register('email')" type="email" placeholder="Email" />
    <input v-bind="register('password')" type="password" placeholder="Password" />
    <button type="submit">Login</button>
  </form>
</template>
```

### Registration Form

User registration with password confirmation.

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z
  .object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

const { register, handleSubmit, formState } = useForm({ schema })
</script>
```

## Dynamic Forms

### Shopping Cart

Dynamic item list with quantity controls.

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  items: z
    .array(
      z.object({
        product: z.string(),
        quantity: z.number().min(1),
      }),
    )
    .min(1),
})

const { register, handleSubmit, fields } = useForm({
  schema,
  defaultValues: { items: [{ product: '', quantity: 1 }] },
})

const items = fields('items')
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <div v-for="field in items.value" :key="field.key">
      <input v-bind="register(`items.${field.index}.product`)" />
      <input v-bind="register(`items.${field.index}.quantity`)" type="number" />
      <button type="button" @click="field.remove()">Remove</button>
    </div>
    <button type="button" @click="items.append({ product: '', quantity: 1 })">Add Item</button>
    <button type="submit">Checkout</button>
  </form>
</template>
```

### Survey Builder

Create dynamic surveys with multiple question types.

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const questionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    question: z.string(),
    answer: z.string(),
  }),
  z.object({
    type: z.literal('rating'),
    question: z.string(),
    rating: z.number().min(1).max(5),
  }),
])

const schema = z.object({
  title: z.string(),
  questions: z.array(questionSchema),
})
</script>
```

## Advanced Patterns

### Multi-Step Wizard

Form split into multiple steps with validation per step.

```vue
<script setup>
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'

const step = ref(1)
const { register, handleSubmit, trigger } = useForm({ schema })

const nextStep = async () => {
  const valid = await trigger(stepFields[step.value])
  if (valid) step.value++
}
</script>
```

### Nested Form Context

Share form across deeply nested components.

```vue
<script setup>
import { useForm, provideForm } from '@vuehookform/core'

const form = useForm({ schema })
provideForm(form) // Make form available to all descendants
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)">
    <PersonalInfoSection />
    <AddressSection />
    <PreferencesSection />
    <SubmitButton />
  </form>
</template>
```

## Reactive Error Display Patterns

::: danger Important
`getFieldState()` returns **snapshots**, not reactive refs. Using it incorrectly causes error messages to persist even after fixing validation issues.
:::

### ❌ Wrong: Non-Reactive Error Display

This is a common mistake that causes errors to persist:

```vue
<script setup lang="ts">
import { useFormContext } from '@vuehookform/core'

const props = defineProps<{ name: string }>()

// ❌ WRONG: Snapshot never updates!
const fieldState = useFormContext().getFieldState(props.name)
</script>

<template>
  <div>
    <input v-bind="register(name)" />
    <!-- This error will NEVER clear, even after fixing the input -->
    <span v-if="fieldState.error" class="error">{{ fieldState.error }}</span>
  </div>
</template>
```

### ✅ Pattern 1: Pass Errors as Props (Simple Components)

Best for simple wrapper components where the parent manages the form:

```vue
<!-- Parent Form -->
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'
import CustomInput from './CustomInput.vue'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'At least 3 characters'),
})

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
})

const { value: emailValue, ...emailBindings } = register('email', { controlled: true })
const { value: usernameValue, ...usernameBindings } = register('username', { controlled: true })

const onSubmit = (data) => {
  console.log('Valid data:', data)
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)" class="form">
    <CustomInput
      v-model="emailValue"
      v-bind="emailBindings"
      label="Email"
      type="email"
      :error="formState.value.errors.email"
    />

    <CustomInput
      v-model="usernameValue"
      v-bind="usernameBindings"
      label="Username"
      :error="formState.value.errors.username"
    />

    <button type="submit" :disabled="formState.value.isSubmitting">Submit</button>
  </form>
</template>
```

```vue
<!-- CustomInput.vue -->
<script setup lang="ts">
defineProps<{
  modelValue: string
  label?: string
  type?: string
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="input-wrapper">
    <label v-if="label" class="label">{{ label }}</label>
    <input
      :value="modelValue"
      :type="type ?? 'text'"
      :class="{ 'input-error': error }"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <!-- Error is passed as prop - fully reactive ✅ -->
    <span v-if="error" class="error-message">{{ error }}</span>
  </div>
</template>

<style scoped>
.input-wrapper {
  margin-bottom: 1rem;
}
.label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}
input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.input-error {
  border-color: #ef4444;
}
.error-message {
  display: block;
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>
```

**Pros:**

- Simple and explicit
- Parent controls error display logic
- Easy to understand data flow

**Cons:**

- Requires passing errors as props
- Verbose when used with many fields

---

### ✅ Pattern 2: useController (Recommended for Reusable Components)

Best for reusable field components and third-party UI libraries:

```vue
<!-- FormField.vue - Fully encapsulated reusable component -->
<script setup lang="ts">
import { useController, type Control } from '@vuehookform/core'

const props = defineProps<{
  name: string
  control: Control<any>
  label?: string
  type?: string
  placeholder?: string
}>()

// useController provides reactive fieldState ✅
const { field, fieldState } = useController({
  name: props.name,
  control: props.control,
})
</script>

<template>
  <div class="form-field">
    <label v-if="label" :for="name" class="label">{{ label }}</label>

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

    <!-- fieldState is a ComputedRef - updates automatically! ✅ -->
    <p v-if="fieldState.error" class="error-message" role="alert">
      {{ fieldState.error }}
    </p>

    <!-- You can also access other reactive state -->
    <p v-if="fieldState.isDirty" class="hint">Modified</p>
  </div>
</template>

<style scoped>
.form-field {
  margin-bottom: 1rem;
}
.label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}
input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.has-error {
  border-color: #ef4444;
}
.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
.hint {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
</style>
```

**Usage:**

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'
import FormField from './FormField.vue'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  age: z.coerce.number().min(18, 'Must be 18 or older'),
})

const { control, handleSubmit } = useForm({
  schema,
  mode: 'onBlur',
})

const onSubmit = (data) => {
  console.log('Form data:', data)
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <!-- Clean, no error prop drilling needed -->
    <FormField name="email" :control="control" label="Email" type="email" />
    <FormField name="password" :control="control" label="Password" type="password" />
    <FormField name="age" :control="control" label="Age" type="number" />
    <button type="submit">Submit</button>
  </form>
</template>
```

**Pros:**

- Component owns its error display (encapsulated)
- Fully reactive via `fieldState` ComputedRef
- Perfect for building component libraries
- Works great with third-party UI components

**Cons:**

- Must pass `control` prop
- Slightly more boilerplate than Pattern 1

---

### ✅ Pattern 3: Form Context (Deeply Nested Components)

Best for deeply nested component trees to avoid prop drilling:

```vue
<!-- FormWrapper.vue -->
<script setup lang="ts">
import { useForm, provideForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  firstName: z.string().min(2, 'At least 2 characters'),
  lastName: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone number'),
})

const form = useForm({
  schema,
  mode: 'onBlur',
})

// Make form available to ALL descendants ✅
provideForm(form)

const onSubmit = (data) => {
  console.log('Form submitted:', data)
}
</script>

<template>
  <form @submit="form.handleSubmit(onSubmit)" class="form-wrapper">
    <h2>Contact Information</h2>
    <PersonalInfoSection />
    <ContactSection />
    <button type="submit" :disabled="form.formState.value.isSubmitting">Submit</button>
  </form>
</template>
```

```vue
<!-- PersonalInfoSection.vue (nested component) -->
<script setup lang="ts">
import { useFormContext } from '@vuehookform/core'
import FormInput from './FormInput.vue'

// Access form from any depth in the component tree ✅
const { register, formState } = useFormContext()
</script>

<template>
  <section>
    <h3>Personal Info</h3>
    <FormInput name="firstName" label="First Name" />
    <FormInput name="lastName" label="Last Name" />
  </section>
</template>
```

```vue
<!-- FormInput.vue (deeply nested) -->
<script setup lang="ts">
import { computed } from 'vue'
import { useFormContext } from '@vuehookform/core'

const props = defineProps<{
  name: string
  label?: string
  type?: string
}>()

const { register, formState } = useFormContext()

// Use computed to reactively access errors ✅
const error = computed(() => formState.value.errors[props.name])
const isTouched = computed(() => formState.value.touchedFields[props.name])
</script>

<template>
  <div class="form-input">
    <label v-if="label" :for="name">{{ label }}</label>
    <input
      :id="name"
      v-bind="register(name)"
      :type="type ?? 'text'"
      :class="{ 'has-error': error }"
    />
    <!-- Error updates reactively via computed ✅ -->
    <span v-if="error" class="error">{{ error }}</span>
    <span v-if="isTouched && !error" class="success">✓</span>
  </div>
</template>

<style scoped>
.form-input {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.25rem;
}
input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.has-error {
  border-color: #ef4444;
}
.error {
  color: #ef4444;
  font-size: 0.875rem;
}
.success {
  color: #10b981;
  font-size: 0.875rem;
}
</style>
```

**Pros:**

- No prop drilling through component hierarchy
- Clean component APIs
- Perfect for large, deeply nested forms

**Cons:**

- Implicit dependency on form context
- Harder to trace data flow in large apps

---

### Summary: When to Use Each Pattern

| Pattern                      | Use Case                          | Reactivity             | Complexity |
| ---------------------------- | --------------------------------- | ---------------------- | ---------- |
| **Pattern 1: Props**         | Simple wrappers, few fields       | ✅ Reactive            | Low        |
| **Pattern 2: useController** | Reusable components, UI libraries | ✅ Reactive (built-in) | Medium     |
| **Pattern 3: Form Context**  | Deeply nested forms               | ✅ Reactive (computed) | Medium     |

**Key Takeaway:** All three patterns are reactive because they use:

- **Pattern 1:** `formState.value.errors` (computed property)
- **Pattern 2:** `useController` (provides `fieldState` ComputedRef)
- **Pattern 3:** `formState.value.errors` via `computed()` or direct access

Never store `getFieldState()` result in a variable - it returns snapshots, not reactive refs!
