# Uncontrolled Inputs

Uncontrolled inputs are the default mode in Vue Hook Form, offering maximum performance by bypassing Vue's reactivity system during typing.

## How It Works

In uncontrolled mode:

1. Vue Hook Form stores a ref to the DOM element
2. Values are read directly from the DOM when needed
3. Vue's reactivity is only triggered on validation/submission
4. No re-renders during typing

```vue
<script setup>
import { useForm } from '@vuehookform/core'

const { register, handleSubmit } = useForm({ schema })
</script>

<template>
  <!-- Uncontrolled by default -->
  <input v-bind="register('email')" type="email" />
</template>
```

## What register() Returns

```typescript
const bindings = register('email')
// {
//   name: 'email',
//   ref: (el) => void,  // Stores DOM reference
//   onChange: (e) => void,
//   onBlur: (e) => void,
// }
```

Using `v-bind` spreads all these onto your input.

## Supported Input Types

### Text Inputs

```vue
<input v-bind="register('name')" type="text" />
<input v-bind="register('email')" type="email" />
<input v-bind="register('password')" type="password" />
<input v-bind="register('phone')" type="tel" />
<input v-bind="register('website')" type="url" />
```

### Number Inputs

```vue
<input v-bind="register('age')" type="number" />
<input v-bind="register('quantity')" type="number" min="0" max="100" />
```

### Textarea

```vue
<textarea v-bind="register('message')" rows="4"></textarea>
```

### Select

```vue
<select v-bind="register('country')">
  <option value="">Select a country</option>
  <option value="us">United States</option>
  <option value="uk">United Kingdom</option>
  <option value="ca">Canada</option>
</select>
```

### Checkbox

```vue
<!-- Single checkbox (boolean) -->
<input v-bind="register('acceptTerms')" type="checkbox" />

<!-- Multiple checkboxes (array) -->
<label>
  <input v-bind="register('interests')" type="checkbox" value="sports" />
  Sports
</label>
<label>
  <input v-bind="register('interests')" type="checkbox" value="music" />
  Music
</label>
```

### Radio Buttons

```vue
<label>
  <input v-bind="register('gender')" type="radio" value="male" />
  Male
</label>
<label>
  <input v-bind="register('gender')" type="radio" value="female" />
  Female
</label>
<label>
  <input v-bind="register('gender')" type="radio" value="other" />
  Other
</label>
```

## Complete Example

```vue
<script setup lang="ts">
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.email('Invalid email'),
  age: z.coerce.number().min(18, 'Must be 18+'),
  country: z.string().min(1, 'Select a country'),
  bio: z.string().max(500, 'Too long'),
  newsletter: z.boolean(),
  contactMethod: z.enum(['email', 'phone', 'mail']),
})

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur',
})

const onSubmit = (data: z.infer<typeof schema>) => {
  console.log(data)
}
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <div class="field">
      <label for="name">Name</label>
      <input id="name" v-bind="register('name')" />
      <span v-if="formState.value.errors.name" class="error">
        {{ formState.value.errors.name }}
      </span>
    </div>

    <div class="field">
      <label for="email">Email</label>
      <input id="email" v-bind="register('email')" type="email" />
      <span v-if="formState.value.errors.email" class="error">
        {{ formState.value.errors.email }}
      </span>
    </div>

    <div class="field">
      <label for="age">Age</label>
      <input id="age" v-bind="register('age')" type="number" />
      <span v-if="formState.value.errors.age" class="error">
        {{ formState.value.errors.age }}
      </span>
    </div>

    <div class="field">
      <label for="country">Country</label>
      <select id="country" v-bind="register('country')">
        <option value="">Select...</option>
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="ca">Canada</option>
      </select>
      <span v-if="formState.value.errors.country" class="error">
        {{ formState.value.errors.country }}
      </span>
    </div>

    <div class="field">
      <label for="bio">Bio</label>
      <textarea id="bio" v-bind="register('bio')" rows="4"></textarea>
      <span v-if="formState.value.errors.bio" class="error">
        {{ formState.value.errors.bio }}
      </span>
    </div>

    <div class="field">
      <label>
        <input v-bind="register('newsletter')" type="checkbox" />
        Subscribe to newsletter
      </label>
    </div>

    <div class="field">
      <span>Preferred contact method:</span>
      <label>
        <input v-bind="register('contactMethod')" type="radio" value="email" />
        Email
      </label>
      <label>
        <input v-bind="register('contactMethod')" type="radio" value="phone" />
        Phone
      </label>
      <label>
        <input v-bind="register('contactMethod')" type="radio" value="mail" />
        Mail
      </label>
      <span v-if="formState.value.errors.contactMethod" class="error">
        {{ formState.value.errors.contactMethod }}
      </span>
    </div>

    <button type="submit" :disabled="formState.value.isSubmitting">Submit</button>
  </form>
</template>
```

## Performance Benefits

Uncontrolled inputs avoid these on every keystroke:

- Vue reactivity tracking
- Component re-renders
- Computed property recalculations

This is especially important for:

- Large forms with many fields
- Forms in frequently re-rendered components
- Mobile devices with limited processing power

## When to Use Controlled Mode Instead

Switch to controlled mode when you need:

- v-model binding
- Custom components that don't accept refs
- Real-time value access (like live preview)
- Third-party UI libraries

See [Controlled Inputs](/guide/components/controlled-inputs) for details.

## Next Steps

- Learn about [Custom Components](/guide/components/custom-components)
- Explore [Validation](/guide/essentials/validation) strategies
