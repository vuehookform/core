# useForm

The main composable for managing form state, validation, and submission.

## Import

```typescript
import { useForm } from '@vuehookform/core'
```

## Usage

```typescript
const form = useForm({
  schema: z.object({
    email: z.email(),
    password: z.string().min(8),
  }),
})
```

## Options

### schema

**Type:** `ZodSchema`\
**Required:** Yes

The Zod schema that defines your form structure and validation rules.

```typescript
const schema = z.object({
  email: z.email('Invalid email'),
  age: z.number().min(18),
})

const form = useForm({ schema })
```

### defaultValues

**Type:** `Partial<z.infer<typeof schema>>`\
**Default:** `{}`

Initial values for form fields.

```typescript
const form = useForm({
  schema,
  defaultValues: {
    email: 'user@example.com',
    age: 25,
  },
})
```

### mode

**Type:** `'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'`\
**Default:** `'onSubmit'`

When to trigger validation. See [Validation Modes](/guide/essentials/validation#validation-modes) for detailed descriptions.

```typescript
const form = useForm({
  schema,
  mode: 'onBlur',
})
```

### reValidateMode

**Type:** `'onSubmit' | 'onBlur' | 'onChange'`\
**Default:** `'onChange'`

When to re-validate after the first submission. This allows different validation behavior before vs after the user submits.

```typescript
const form = useForm({
  schema,
  mode: 'onSubmit',
  reValidateMode: 'onChange', // After first submit, validate on every change
})
```

### disabled

**Type:** `Ref<boolean> | boolean`\
**Default:** `false`

Disable the entire form. When true:

- All registered inputs receive `disabled` attribute
- Form submission is blocked

```typescript
import { ref } from 'vue'

const isLoading = ref(false)

const form = useForm({
  schema,
  disabled: isLoading,
})
```

### shouldUseNativeValidation

**Type:** `boolean`\
**Default:** `false`

Enable browser's native validation UI and HTML5 validation attributes.

```typescript
const form = useForm({
  schema,
  shouldUseNativeValidation: true,
})
```

### shouldUnregister

**Type:** `boolean`\
**Default:** `false`

Remove field data when a field is unmounted.

```typescript
const form = useForm({
  schema,
  shouldUnregister: true,
})
```

### shouldFocusError

**Type:** `boolean`\
**Default:** `true`

Automatically focus the first field with an error after validation fails.

```typescript
const form = useForm({
  schema,
  shouldFocusError: false, // Disable auto-focus on errors
})
```

### criteriaMode

**Type:** `'firstError' | 'all'`\
**Default:** `'firstError'`

How to collect validation errors. When `'all'`, errors include a `types` property with all validation failures.

```typescript
const form = useForm({
  schema,
  criteriaMode: 'all', // Collect all validation errors per field
})
```

### delayError

**Type:** `number`\
**Default:** `undefined`

Delay in milliseconds before displaying validation errors. Prevents error flash during typing.

```typescript
const form = useForm({
  schema,
  mode: 'onChange',
  delayError: 500, // Wait 500ms before showing errors
})
```

### validationDebounce

**Type:** `number`\
**Default:** `undefined`

Debounce time in milliseconds for schema validation in `onChange` mode. Reduces validation calls during rapid typing, improving performance.

```typescript
const form = useForm({
  schema,
  mode: 'onChange',
  validationDebounce: 150, // Debounce validation by 150ms
})
```

**Comparison with `delayError`:**

| Feature             | `validationDebounce`     | `delayError`         |
| ------------------- | ------------------------ | -------------------- |
| What it delays      | Validation execution     | Error display        |
| Performance benefit | Reduces validation calls | None                 |
| UX benefit          | Prevents input lag       | Prevents error flash |

You can use both together for optimal UX:

```typescript
const form = useForm({
  schema,
  mode: 'onChange',
  validationDebounce: 150, // Reduce validation overhead
  delayError: 300, // Smooth error display
})
```

### values

**Type:** `MaybeRef<Partial<T>>`\
**Default:** `undefined`

External values to sync with the form. Changes don't mark fields as dirty.

```typescript
import { computed } from 'vue'

const externalValues = computed(() => ({ search: route.query.q }))

const form = useForm({
  schema,
  values: externalValues,
})
```

### errors

**Type:** `MaybeRef<Partial<FieldErrors<T>>>`\
**Default:** `undefined`

External errors to merge with validation errors (e.g., server-side errors).

```typescript
import { ref } from 'vue'

const serverErrors = ref({})

const form = useForm({
  schema,
  errors: serverErrors,
})
```

### onDefaultValuesError

**Type:** `(error: unknown) => void`\
**Default:** `undefined`

Callback when async default values fail to load.

```typescript
const form = useForm({
  schema,
  defaultValues: async () => fetch('/api/data').then((r) => r.json()),
  onDefaultValuesError: (error) => {
    console.error('Failed to load:', error)
  },
})
```

## Return Values

### register

```typescript
register(name: Path<T>, options?: RegisterOptions): RegisterReturn
```

Register an input field.

**Parameters:**

- `name` - Field path (e.g., `'email'`, `'address.city'`, `'items.0.name'`)
- `options.controlled` - Enable controlled mode for v-model

**Returns (Uncontrolled):**

```typescript
{
  name: string
  ref: (el: HTMLElement | null) => void
  onInput: (e: Event) => void
  onBlur: (e: Event) => void
  disabled?: boolean  // Present when form is disabled
}
```

**Returns (Controlled):**

```typescript
{
  value: Ref<T>
  name: string
  onInput: (e: Event) => void
  onBlur: (e: Event) => void
  disabled?: boolean  // Present when form is disabled
}
```

**Example:**

```vue
<!-- Uncontrolled -->
<input v-bind="register('email')" />

<!-- Controlled -->
<script setup>
const { value, ...bindings } = register('email', { controlled: true })
</script>
<CustomInput v-model="value" v-bind="bindings" />
```

### handleSubmit

```typescript
handleSubmit(
  onValid: (data: T) => void | Promise<void>,
  onInvalid?: (errors: FieldErrors<T>) => void
): (e: Event) => Promise<void>
```

Create a submit handler that validates before calling your callback.

**Parameters:**

- `onValid` - Called with validated data if validation passes
- `onInvalid` - Called with errors if validation fails

**Example:**

```vue
<form @submit="handleSubmit(onSubmit, onError)"></form>
```

### formState

```typescript
formState: Ref<FormState<T>>
```

Reactive form state object. See [FormState](/api/types#formstate).

### fields

```typescript
fields(name: ArrayPath<T>): FieldArrayReturn<T>
```

Get a field array manager for dynamic lists. See [FieldArray](/api/types#fieldarray).

**Example:**

```typescript
const items = fields('items')
items.append({ name: '' })
```

### setValue

```typescript
setValue(name: Path<T>, value: any, options?: SetValueOptions): void
```

Set a field value programmatically.

**Options:**

- `shouldValidate` - Trigger validation after setting (default: false)
- `shouldDirty` - Mark field as dirty (default: true)

**Example:**

```typescript
setValue('email', 'new@example.com')
setValue('age', 25, { shouldValidate: true })
```

### getValue

```typescript
getValue(name: Path<T>): any
```

Get the current value of a field.

```typescript
const email = getValue('email')
```

### getValues

```typescript
getValues(): T
getValues(names: Path<T>[]): Partial<T>
```

Get all form values or specific fields.

```typescript
const allValues = getValues()
const { email, name } = getValues(['email', 'name'])
```

### reset

```typescript
reset(values?: Partial<T>): void
```

Reset form to default values or provided values.

```typescript
reset() // Reset to defaultValues
reset({ email: 'new@example.com' }) // Reset with new values
```

### trigger

```typescript
trigger(name?: Path<T> | Path<T>[]): Promise<boolean>
```

Manually trigger validation.

```typescript
await trigger() // Validate all fields
await trigger('email') // Validate specific field
await trigger(['email', 'password']) // Validate multiple fields
```

### watch

```typescript
watch(): ComputedRef<T>
watch(name: Path<T>): ComputedRef<PathValue<T, Path>>
watch(names: Path<T>[]): ComputedRef<Partial<T>>
```

Watch field values reactively.

```typescript
const allValues = watch()
const email = watch('email')

// Multiple fields returns an object, not a tuple
const credentials = watch(['email', 'password'])
// Access: credentials.value.email, credentials.value.password
```

### setError

```typescript
setError(name: Path<T>, message: string): void
```

Set an error on a specific field.

```typescript
setError('email', 'This email is already taken')
```

### clearErrors

```typescript
clearErrors(name?: Path<T> | Path<T>[] | 'root'): void
```

Clear errors from fields.

```typescript
clearErrors() // Clear all errors
clearErrors('email') // Clear specific field
clearErrors(['email', 'password']) // Clear multiple fields
clearErrors('root') // Clear root-level error
```

### unregister

```typescript
unregister(name: Path<T>, options?: UnregisterOptions): void
```

Remove a field from form tracking.

**Options:**

- `keepValue` - Don't clear value (default: false)
- `keepError` - Keep validation error (default: false)
- `keepDirty` - Keep dirty state (default: false)
- `keepTouched` - Keep touched state (default: false)
- `keepDefaultValue` - Keep stored default (default: false)
- `keepIsValid` - Don't re-evaluate form validity (default: false)

```typescript
unregister('optionalField')
unregister('field', { keepValue: true })
```

### resetField

```typescript
resetField(name: Path<T>, options?: ResetFieldOptions): void
```

Reset a single field to its default value.

**Options:**

- `keepError` - Keep error (default: false)
- `keepDirty` - Keep dirty state (default: false)
- `keepTouched` - Keep touched state (default: false)
- `defaultValue` - New default value for this field

```typescript
resetField('email')
resetField('email', { defaultValue: 'new@example.com' })
```

### getFieldState

```typescript
getFieldState(name: Path<T>): FieldState
```

Get the state of a specific field.

**Returns:**

```typescript
{
  isDirty: boolean
  isTouched: boolean
  invalid: boolean
  error?: string | FieldError
}
```

```typescript
const emailState = getFieldState('email')
if (emailState.invalid) {
  console.log(emailState.error)
}
```

### setErrors

```typescript
setErrors(errors: Record<Path<T>, string | ErrorOption>, options?: SetErrorsOptions): void
```

Set multiple errors at once.

**Options:**

- `shouldReplace` - Replace all errors instead of merging (default: false)

```typescript
setErrors({
  email: 'Email already exists',
  username: 'Username is taken',
})
setErrors({ email: 'Error' }, { shouldReplace: true })
```

### hasErrors

```typescript
hasErrors(name?: Path<T> | 'root'): boolean
```

Check if the form or a specific field has errors.

```typescript
if (hasErrors()) {
  console.log('Form has errors')
}
if (hasErrors('email')) {
  console.log('Email has an error')
}
```

### getErrors

```typescript
getErrors(): FieldErrors<T>
getErrors(name: Path<T>): FieldErrorValue | undefined
```

Get all errors or a specific field error.

```typescript
const allErrors = getErrors()
const emailError = getErrors('email')
```

### setFocus

```typescript
setFocus(name: Path<T>, options?: SetFocusOptions): void
```

Programmatically focus a field.

**Options:**

- `shouldSelect` - Select text in the input (default: false)

```typescript
setFocus('email')
setFocus('email', { shouldSelect: true })
```

### control

```typescript
control: Control<T>
```

The form control object. Pass to child components for `useController`, `useWatch`, or `useFormState`.

```typescript
// Parent
const { control } = useForm({ schema })

// Child
<ChildComponent :control="control" />
```
