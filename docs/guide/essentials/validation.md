# Validation

Vue Hook Form uses Zod for validation, giving you TypeScript types and runtime validation from a single schema.

## Zod Basics

### Simple Fields

```typescript
const schema = z.object({
  // String validations
  name: z.string().min(2, 'Too short'),
  email: z.email('Invalid email'),
  url: z.url('Invalid URL'),

  // Number validations
  age: z.number().min(18, 'Must be 18+').max(100),
  price: z.number().positive('Must be positive'),

  // Boolean
  terms: z.literal(true, 'Must accept terms'),

  // Enum
  role: z.enum(['admin', 'user', 'guest']),
})
```

### Optional Fields

```typescript
const schema = z.object({
  // Optional (can be undefined)
  nickname: z.string().optional(),

  // Nullable (can be null)
  middleName: z.string().nullable(),

  // Default value
  country: z.string().default('US'),
})
```

### Nested Objects

```typescript
const schema = z.object({
  user: z.object({
    name: z.string(),
    email: z.email(),
  }),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zip: z.string().length(5),
  }),
})

// Access nested fields with dot notation
register('user.name')
register('address.city')
```

### Arrays

```typescript
const schema = z.object({
  tags: z.array(z.string()).min(1, 'Add at least one tag'),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().min(1),
    }),
  ),
})

// Access array items with index notation
register('tags.0')
register('items.0.name')
register(`items.${index}.quantity`)
```

## Validation Modes

### onSubmit (Default)

Validation only runs when the form is submitted:

```typescript
const form = useForm({
  schema,
  mode: 'onSubmit',
})
```

Best for: Simple forms, reducing validation noise.

### onBlur

Validation runs when a field loses focus:

```typescript
const form = useForm({
  schema,
  mode: 'onBlur',
})
```

Best for: User-friendly feedback without being intrusive.

### onChange

Validation runs on every input change:

```typescript
const form = useForm({
  schema,
  mode: 'onChange',
})
```

Best for: Real-time feedback, password strength indicators.

### onTouched

Validation runs on blur first, then on every change:

```typescript
const form = useForm({
  schema,
  mode: 'onTouched',
})
```

Best for: Balance between UX and immediate feedback.

### Re-validation Mode

After the first form submission, you may want validation to behave differently. Use `reValidateMode`:

```typescript
const form = useForm({
  schema,
  mode: 'onSubmit', // Initial validation only on submit
  reValidateMode: 'onChange', // After first submit, validate on every change
})
```

This is useful for:

- Keeping the initial experience clean (validate on submit)
- Providing immediate feedback after the user knows there are errors (validate on change)

| Property         | When it applies         |
| ---------------- | ----------------------- |
| `mode`           | Before first submission |
| `reValidateMode` | After first submission  |

### Delay Error Display

Prevent error "flash" during typing with `delayError`:

```typescript
const form = useForm({
  schema,
  mode: 'onChange',
  delayError: 500, // Wait 500ms before showing errors
})
```

How it works:

- When validation fails, errors are held for the specified delay
- If the field becomes valid within the delay window, the error is never shown
- Reduces visual noise during active typing

### Validation Debouncing

For performance-critical forms with `onChange` mode, use `validationDebounce` to reduce validation overhead:

```typescript
const form = useForm({
  schema,
  mode: 'onChange',
  validationDebounce: 150, // Debounce schema validation by 150ms
})
```

**Key differences from `delayError`:**

| Feature     | `validationDebounce`    | `delayError`           |
| ----------- | ----------------------- | ---------------------- |
| Purpose     | Reduce validation calls | Delay error display    |
| Performance | Prevents input lag      | No performance benefit |
| When to use | Large/complex schemas   | Smooth UX              |

**Best practice:** Use both for optimal UX on complex forms:

```typescript
const form = useForm({
  schema,
  mode: 'onChange',
  validationDebounce: 150, // Reduces Zod parse calls
  delayError: 300, // Smooth error appearance
})
```

::: tip Validation Caching
Vue Hook Form automatically caches validation results. If you blur a field without changing its value, or trigger validation on an unchanged field, the cached result is returned immediately without re-running the schema validation.
:::

## Cross-Field Validation

Use Zod's `refine` or `superRefine` for validations that depend on multiple fields:

```typescript
const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'], // Error shows on this field
  })
```

### Complex Cross-Field Logic

```typescript
const schema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
    isRecurring: z.boolean(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  })
  .superRefine((data, ctx) => {
    // End date must be after start date
    if (data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date',
        path: ['endDate'],
      })
    }

    // Frequency required if recurring
    if (data.isRecurring && !data.frequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Frequency is required for recurring events',
        path: ['frequency'],
      })
    }
  })
```

## Manual Validation

Trigger validation programmatically:

```typescript
const { trigger, formState } = useForm({ schema })

// Validate specific field
await trigger('email')

// Validate multiple fields
await trigger(['email', 'password'])

// Validate entire form
await trigger()

// Check if valid
if (formState.value.isValid) {
  // Proceed
}
```

## Custom Error Messages

### Per-Field Messages

```typescript
const schema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address'),
  age: z
    .number({ invalid_type_error: 'Age must be a number' })
    .min(18, 'You must be at least 18 years old'),
})
```

### Dynamic Messages

```typescript
const schema = z.object({
  username: z.string().min(3, ({ minimum }) => `Username must be at least ${minimum} characters`),
})
```

## Async Validation

For server-side validation (like checking if a username exists):

```typescript
const schema = z.object({
  username: z
    .string()
    .min(3)
    .refine(
      async (username) => {
        const exists = await checkUsernameExists(username)
        return !exists
      },
      { message: 'Username already taken' },
    ),
})
```

::: warning
Async validation runs on every validation trigger. Consider debouncing for onChange mode.
:::

For more advanced patterns including debouncing, external values sync, and server error handling, see [Async Patterns](/guide/advanced/async-patterns).

## Custom Field Validation

Add custom validation logic per-field using the `validate` option in `register()`:

### Basic Custom Validation

```typescript
const emailBindings = register('email', {
  validate: (value) => {
    if (value.endsWith('@competitor.com')) {
      return 'Please use a different email provider'
    }
    return undefined // No error
  },
})
```

### Async Custom Validation

```typescript
const usernameBindings = register('username', {
  validate: async (value) => {
    const response = await fetch(`/api/check-username?name=${value}`)
    const { available } = await response.json()
    return available ? undefined : 'Username is already taken'
  },
})
```

### Debouncing Async Validation

Prevent excessive API calls with `validateDebounce`:

```typescript
const usernameBindings = register('username', {
  validate: async (value) => {
    const response = await fetch(`/api/check-username?name=${value}`)
    const { available } = await response.json()
    return available ? undefined : 'Username is already taken'
  },
  validateDebounce: 500, // Wait 500ms after typing stops
})
```

### Dependent Field Validation

Re-validate related fields when a field changes using `deps`:

```typescript
// When password changes, confirmPassword is re-validated
const passwordBindings = register('password', {
  deps: ['confirmPassword'],
})

const confirmBindings = register('confirmPassword', {
  validate: (value, formValues) => {
    if (value !== formValues.password) {
      return 'Passwords do not match'
    }
    return undefined
  },
})
```

The `deps` option accepts an array of field names. When the current field changes, all dependent fields are re-validated.

### Validation Loading States

Track which fields are validating:

```vue
<template>
  <input v-bind="usernameBindings" />
  <span v-if="formState.value.validatingFields.has('username')"> Checking... </span>
  <span v-else-if="formState.value.errors.username">
    {{ formState.value.errors.username }}
  </span>
</template>
```

See [Async Patterns](/guide/advanced/async-patterns) for more examples.

## Type Coercion

Handle HTML form inputs that return strings:

```typescript
const schema = z.object({
  // Coerce string to number
  age: z.coerce.number().min(18),

  // Coerce string to date
  birthDate: z.coerce.date(),

  // Coerce string to boolean
  active: z.coerce.boolean(),
})
```

## Next Steps

- Learn about [Error Handling](/guide/essentials/error-handling) to display validation errors
- Understand [Form State](/guide/essentials/form-state) for tracking validation status
