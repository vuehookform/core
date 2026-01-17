# Uncontrolled Inputs

Uncontrolled inputs are the default mode in Vue Hook Form, offering maximum performance by bypassing Vue's reactivity system during typing.

::: tip Vue Component Library Support
Uncontrolled mode works best with native HTML elements, but also supports Vue components that expose their input element. If your component's `$el` is the input itself (like PrimeVue's `InputText`) or contains an input element, uncontrolled mode will work automatically. For components with complex structures or non-standard events, see [Controlled Inputs](/guide/components/controlled-inputs).
:::

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
  age: z.number().min(18, 'Must be 18+'),
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

## Why Uncontrolled Inputs Are Faster

Understanding Vue's reactivity system explains why uncontrolled inputs provide significant performance benefits.

### Vue Reactivity Overhead

When you use `v-model` (controlled mode), Vue's reactivity system performs these operations on **every keystroke**:

1. **Proxy Trap Invocation**: Vue 3 uses JavaScript Proxies. Each value change triggers the proxy's `set` trap
2. **Dependency Tracking**: Vue records which components depend on this value
3. **Effect Scheduling**: Vue schedules all dependent effects (watchers, computed properties, render functions) for re-execution
4. **Virtual DOM Diffing**: If the component re-renders, Vue diffs the new virtual DOM against the old
5. **DOM Patching**: Vue applies any changes to the actual DOM

```typescript
// What happens with v-model on each keystroke:
// 1. input.value = 'a'
// 2. Reactive proxy set() trap fires
// 3. Vue traverses dependency graph
// 4. All watchers/computed using this value are marked stale
// 5. Component's render function is queued
// 6. Virtual DOM diff runs
// 7. DOM patches (often a no-op for inputs)
```

### Uncontrolled Mode Bypasses All of This

With uncontrolled inputs, Vue Hook Form stores a ref to the DOM element and reads/writes directly:

```typescript
// What happens with uncontrolled on each keystroke:
// 1. Native DOM event fires
// 2. Browser updates input.value directly
// 3. Nothing else - Vue never knows about it
```

Vue's reactivity is only triggered when:

- Form is submitted (values are read from DOM)
- `getValues()` is called (syncs DOM to reactive state)
- Validation runs (on blur/submit depending on mode)

### Reactivity Cost Per Field

The overhead scales with form complexity:

| Fields | Controlled Keystroke | Uncontrolled Keystroke |
| ------ | -------------------- | ---------------------- |
| 5      | ~1-2ms               | <0.1ms                 |
| 20     | ~3-5ms               | <0.1ms                 |
| 50     | ~8-15ms              | <0.1ms                 |
| 100    | ~20-40ms             | <0.1ms                 |

These measurements represent worst-case scenarios where all fields are watched. In practice, controlled overhead depends on how many computed properties and watchers depend on the form state.

### Memory and Garbage Collection

Uncontrolled inputs also reduce memory pressure:

- **No reactive wrappers**: Each controlled field creates Proxy objects and effect objects
- **No closure captures**: Uncontrolled handlers don't need to capture reactive values
- **Fewer allocations**: String values aren't wrapped in reactive containers

For a 100-field form, controlled mode may allocate 2-3x more objects that require eventual garbage collection.

## Re-render Behavior

Understanding when your form component re-renders helps optimize performance.

### When Re-renders Occur

| Event                           | Causes Re-render?        | Why                              |
| ------------------------------- | ------------------------ | -------------------------------- |
| Typing in uncontrolled input    | No                       | Values read from DOM             |
| Typing in controlled input      | Yes                      | `v-model` triggers reactivity    |
| Field blur (with `onBlur` mode) | Only if error changes    | Error state is reactive          |
| Form submission                 | Yes                      | `isSubmitting`, `errors` update  |
| Calling `setValue()`            | Only if field is watched | Only watched values are reactive |
| Validation error appears/clears | Yes                      | `formState.errors` is reactive   |

### Complete Example with Render Tracking

```vue
<script setup lang="ts">
import { ref, onRenderTracked, onRenderTriggered } from 'vue'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
})

const { register, handleSubmit, formState } = useForm({
  schema,
  mode: 'onBlur', // Validate only on blur, not every keystroke
})

const onSubmit = (data: z.infer<typeof schema>) => {
  console.log('Submitted:', data)
}

// Track render count to demonstrate no re-renders during typing
const renderCount = ref(0)

onRenderTriggered((event) => {
  renderCount.value++
  console.log(`Render #${renderCount.value}:`, event.key)
})
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <p class="debug">Render count: {{ renderCount }}</p>

    <!-- These inputs do NOT cause re-renders during typing -->
    <div class="field">
      <label>First Name</label>
      <input v-bind="register('firstName')" />
      <span v-if="formState.value.errors.firstName" class="error">
        {{ formState.value.errors.firstName }}
      </span>
    </div>

    <div class="field">
      <label>Last Name</label>
      <input v-bind="register('lastName')" />
      <span v-if="formState.value.errors.lastName" class="error">
        {{ formState.value.errors.lastName }}
      </span>
    </div>

    <div class="field">
      <label>Email</label>
      <input v-bind="register('email')" type="email" />
      <span v-if="formState.value.errors.email" class="error">
        {{ formState.value.errors.email }}
      </span>
    </div>

    <button type="submit" :disabled="formState.value.isSubmitting">Submit</button>
  </form>
</template>
```

Try typing in the fields - the render count stays the same until you blur (triggering validation) or submit.

## When to Use Controlled Mode Instead

Switch to controlled mode when you need:

- v-model binding
- Custom components that don't accept refs
- Real-time value access (like live preview)
- Complex third-party components with custom events

See [Controlled Inputs](/guide/components/controlled-inputs) for details.

## Vue Component Library Support

Vue Hook Form can detect input elements inside Vue components, enabling uncontrolled mode for many third-party libraries.

### Compatible Patterns

| Pattern                           | Example              | Uncontrolled Works? |
| --------------------------------- | -------------------- | ------------------- |
| Component `$el` is the input      | PrimeVue `InputText` | ✅ Yes              |
| Component `$el` contains input    | Wrapper components   | ✅ Yes              |
| Component with custom events only | Complex date pickers | ❌ Use controlled   |

### Example: PrimeVue InputText (Uncontrolled)

```vue
<script setup>
import { useForm } from '@vuehookform/core'
import InputText from 'primevue/inputtext'

const { register, handleSubmit, formState } = useForm({ schema })
</script>

<template>
  <form @submit="handleSubmit(onSubmit)">
    <!-- Works because InputText.$el is the actual <input> element -->
    <InputText v-bind="register('username')" />
    <small v-if="formState.value.errors.username" class="p-error">
      {{ formState.value.errors.username }}
    </small>
  </form>
</template>
```

### How It Works

Vue Hook Form automatically detects the underlying input element:

1. **Direct input**: If the component's `$el` is an `<input>`, `<select>`, or `<textarea>`, it uses that directly
2. **Wrapped input**: If `$el` is a container element, it queries for the first input inside
3. **Fallback**: If no input is found, the field won't sync with the DOM (use controlled mode instead)

This means many simple Vue component library inputs work out of the box with uncontrolled mode.

### When to Use Controlled Mode Instead

Use controlled mode for Vue components when:

- The component doesn't expose its input via `$el`
- The component uses custom update events (not standard `input` events)
- You need access to the reactive value during typing
- The component renders multiple inputs or has complex internal structure

## Next Steps

- Learn about [Custom Components](/guide/components/custom-components)
- Explore [Validation](/guide/essentials/validation) strategies
