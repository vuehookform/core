# Reactivity Integration

Vue Hook Form is designed to work alongside Vue's reactivity system. This guide covers advanced patterns, limitations, and solutions for integrating with external reactive state.

## How Vue Hook Form Uses Reactivity

Vue Hook Form uses Vue's reactivity selectively:

| State             | Reactive? | Why                                            |
| ----------------- | --------- | ---------------------------------------------- |
| `formState`       | Yes       | Components need to react to errors, dirty, etc |
| `watch()` values  | Yes       | Enables computed properties and watchers       |
| Field values      | Partial   | Only reactive when using controlled mode       |
| Internal tracking | No        | Maps and Sets for O(1) performance             |

This hybrid approach provides the best of both worlds: reactive UI updates without the overhead of tracking every keystroke.

## External State Integration

### The `values` Prop

Sync external state into the form without triggering dirty state:

```typescript
import { ref } from 'vue'
import { useForm } from '@vuehookform/core'

const externalData = ref({ name: 'John', email: 'john@example.com' })

const { register, formState } = useForm({
  schema,
  values: externalData, // Automatically syncs when externalData changes
})

// Later, when external data updates:
externalData.value = { name: 'Jane', email: 'jane@example.com' }
// Form fields update but isDirty remains false
```

### The `errors` Prop

Inject external errors (typically from a server):

```typescript
const serverErrors = ref<Record<string, string>>({})

const { register, formState } = useForm({
  schema,
  errors: serverErrors, // Merged with validation errors
})

// After API call fails:
serverErrors.value = { email: 'Email already registered' }
// formState.errors.email now shows the server error
```

## Limitations and Edge Cases

Understanding these limitations helps you avoid common pitfalls when integrating Vue Hook Form with Vue's reactivity system.

### Limitation 1: Uncontrolled Fields Don't Trigger Watchers

Uncontrolled inputs write directly to the DOM. Vue watchers on form values won't fire during typing:

```typescript
// This WON'T work with uncontrolled inputs:
const emailRef = ref('')

watch(emailRef, (newEmail) => {
  console.log('Email changed:', newEmail) // Never called during typing!
})
```

**Solutions:**

```typescript
// Option A: Use the form's watch() method
const { watch: formWatch } = useForm({ schema })
const email = formWatch('email')

watchEffect(() => {
  console.log('Email changed:', email.value) // Works!
})

// Option B: Use controlled mode for that field
const { value: emailValue } = register('email', { controlled: true })

watch(emailValue, (newEmail) => {
  console.log('Email changed:', newEmail) // Works!
})
```

### Limitation 2: External Updates Don't Trigger Validation

When you update `values` externally, validation doesn't automatically run:

```typescript
const externalData = ref({ email: 'invalid' })

const { formState, trigger } = useForm({
  schema: z.object({ email: z.email() }),
  values: externalData,
  mode: 'onChange',
})

// Update external data
externalData.value = { email: 'still-invalid' }
// formState.errors.email is EMPTY until user interacts or you call trigger()
```

**Solution:** Manually trigger validation after external updates:

```typescript
const { trigger } = useForm({ schema, values: externalData })

watch(
  externalData,
  async () => {
    await trigger() // Validate after external update
  },
  { deep: true },
)
```

### Limitation 3: Controlled Mode Value Sync Timing

With controlled mode, the `value` ref updates synchronously, but validation is async:

```typescript
const { value: email, ...bindings } = register('email', { controlled: true })
const { trigger, formState } = useForm({ schema })

email.value = 'test@example.com'
console.log(email.value) // 'test@example.com' (immediate)
console.log(formState.value.errors.email) // May still show old error (async validation pending)
```

**Solution:** Await validation before checking errors:

```typescript
email.value = 'test@example.com'
await trigger('email')
console.log(formState.value.errors.email) // Now accurate
```

### Limitation 4: Deep Reactivity and Object References

When using `values` with nested objects, Vue's deep reactivity can cause unexpected updates:

```typescript
import { reactive, computed } from 'vue'

const userData = reactive({
  profile: { name: 'John', address: { city: 'NYC' } },
})

const { formState } = useForm({
  schema,
  values: computed(() => userData.profile),
})

// This triggers a form update even though the form doesn't use address.city:
userData.profile.address.city = 'LA'
```

**Solutions:**

```typescript
import { shallowRef, computed } from 'vue'

// Option A: Shallow reactivity
const userData = shallowRef({ name: 'John', email: 'john@example.com' })

// Option B: Computed with specific properties only
const formValues = computed(() => ({
  name: userData.profile.name,
  email: userData.profile.email,
  // Omit nested objects you don't want to sync
}))

const { register } = useForm({ schema, values: formValues })
```

### Limitation 5: Bidirectional Sync Creates Loops

Trying to keep external state and form state perfectly synchronized can create infinite loops:

```typescript
// DANGER: This creates an infinite loop!
const externalState = ref({ name: '' })

const { watch: formWatch } = useForm({
  schema,
  values: externalState,
})

const nameValue = formWatch('name')

// Form updates external -> triggers values sync -> triggers watch -> ...
watch(nameValue, (newName) => {
  externalState.value.name = newName // LOOP!
})
```

**Solutions:**

```typescript
import { ref, watch, nextTick } from 'vue'

// Option A: One-way sync (external -> form)
const { reset } = useForm({ schema, defaultValues: externalState.value })

watch(
  externalState,
  (newValues) => {
    reset(newValues, { keepDirty: true, keepErrors: true })
  },
  { deep: true },
)

// Option B: Break the cycle with a flag
const isSyncing = ref(false)

watch(externalState, (newValues) => {
  isSyncing.value = true
  // Update form...
  nextTick(() => {
    isSyncing.value = false
  })
})

watch(nameValue, (newName) => {
  if (!isSyncing.value) {
    externalState.value.name = newName
  }
})
```

## Cross-Field Re-Validation Patterns

When external state changes should trigger re-validation of dependent fields.

### Scenario: Country Changes Should Re-Validate Phone Number

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

// External state (e.g., from a parent component or store)
const selectedCountry = ref('US')

// Validation depends on external state
const validatePhoneForCountry = (phone: string, country: string) => {
  const patterns: Record<string, RegExp> = {
    US: /^\d{10}$/,
    UK: /^\d{11}$/,
    DE: /^\d{11,12}$/,
  }
  return patterns[country]?.test(phone) ?? true
}

const schema = z.object({
  phone: z
    .string()
    .refine((phone) => validatePhoneForCountry(phone, selectedCountry.value), {
      message: 'Invalid phone number for selected country',
    }),
  email: z.email(),
})

const { register, trigger, formState } = useForm({
  schema,
  mode: 'onBlur',
})

// Re-validate phone when country changes externally
watch(selectedCountry, async () => {
  // Only re-validate if the field has been touched
  if (formState.value.touchedFields.phone) {
    await trigger('phone')
  }
})
</script>

<template>
  <div>
    <select v-model="selectedCountry">
      <option value="US">United States</option>
      <option value="UK">United Kingdom</option>
      <option value="DE">Germany</option>
    </select>

    <input v-bind="register('phone')" placeholder="Phone number" />
    <span v-if="formState.value.errors.phone" class="error">
      {{ formState.value.errors.phone }}
    </span>
  </div>
</template>
```

### Scenario: Store State Triggers Multiple Field Re-Validation

```typescript
import { watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { useForm } from '@vuehookform/core'

const userStore = useUserStore()
const { permissions, region } = storeToRefs(userStore)

const { trigger, formState } = useForm({
  schema,
  mode: 'onChange',
})

// Track previous values for comparison
let prevPermissions = permissions.value
let prevRegion = region.value

// Watch store state and trigger targeted re-validation
watch([permissions, region], async ([newPermissions, newRegion]) => {
  // Determine which fields are affected
  const fieldsToRevalidate: string[] = []

  if (newPermissions !== prevPermissions) {
    fieldsToRevalidate.push('accessLevel', 'department')
    prevPermissions = newPermissions
  }
  if (newRegion !== prevRegion) {
    fieldsToRevalidate.push('currency', 'taxId', 'phone')
    prevRegion = newRegion
  }

  // Only re-validate fields that have been touched
  const touchedAffectedFields = fieldsToRevalidate.filter(
    (field) => formState.value.touchedFields[field],
  )

  if (touchedAffectedFields.length > 0) {
    await trigger(touchedAffectedFields)
  }
})
```

## Complete Bidirectional Sync Pattern

For scenarios requiring true bidirectional synchronization between form and external state:

```vue
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useForm } from '@vuehookform/core'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  email: z.email(),
  settings: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
  }),
})

type FormData = z.infer<typeof schema>

// External state source (could be from props, store, etc.)
const externalState = ref<FormData>({
  name: '',
  email: '',
  settings: { theme: 'light', notifications: true },
})

const {
  register,
  watch: formWatch,
  setValue,
  trigger,
  formState,
  getValues,
} = useForm({
  schema,
  defaultValues: externalState.value,
  mode: 'onBlur',
})

// Sync flag to prevent infinite loops
const isSyncing = ref(false)

// External -> Form sync
watch(
  externalState,
  async (newState) => {
    if (isSyncing.value) return

    isSyncing.value = true
    try {
      // Update each field that changed
      const currentValues = getValues()

      for (const [key, value] of Object.entries(newState)) {
        if (JSON.stringify(currentValues[key as keyof FormData]) !== JSON.stringify(value)) {
          setValue(key as keyof FormData, value, {
            shouldDirty: false, // External updates shouldn't mark as dirty
            shouldValidate: formState.value.touchedFields[key as keyof FormData] ?? false,
          })
        }
      }
    } finally {
      await nextTick()
      isSyncing.value = false
    }
  },
  { deep: true },
)

// Form -> External sync (only for user-initiated changes)
const allValues = formWatch()

watch(
  allValues,
  (newValues) => {
    if (isSyncing.value) return

    // Only sync if form is dirty (user made changes)
    if (formState.value.isDirty) {
      isSyncing.value = true
      externalState.value = { ...newValues } as FormData
      nextTick(() => {
        isSyncing.value = false
      })
    }
  },
  { deep: true },
)
</script>

<template>
  <form>
    <div class="field">
      <label>Name</label>
      <input v-bind="register('name')" />
      <span v-if="formState.value.errors.name" class="error">
        {{ formState.value.errors.name }}
      </span>
    </div>

    <div class="field">
      <label>Email</label>
      <input v-bind="register('email')" type="email" />
      <span v-if="formState.value.errors.email" class="error">
        {{ formState.value.errors.email }}
      </span>
    </div>

    <div class="debug">
      <h4>External State:</h4>
      <pre>{{ JSON.stringify(externalState, null, 2) }}</pre>
    </div>
  </form>
</template>
```

## Summary: When to Use Each Pattern

| Scenario                                           | Pattern                               |
| -------------------------------------------------- | ------------------------------------- |
| External data populates form (read-only sync)      | `values` prop                         |
| Server errors displayed in form                    | `errors` prop                         |
| External change should re-validate one field       | `watch()` + `trigger(fieldName)`      |
| External change should re-validate multiple fields | `watch()` + `trigger([fields])`       |
| Two-way sync between form and store                | Custom sync with `isSyncing` flag     |
| Real-time preview of form values                   | `watch()` from useForm                |
| Form values affect other components                | `watch()` + controlled mode if needed |

## Next Steps

- Review [Performance](/guide/best-practices/performance) for optimization when using watchers
- See [Async Patterns](/guide/advanced/async-patterns) for server integration
- Explore [TypeScript](/guide/advanced/typescript) for type-safe external state
