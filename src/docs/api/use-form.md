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

When to trigger validation.

| Mode        | Description                               |
| ----------- | ----------------------------------------- |
| `onSubmit`  | Validate only when form is submitted      |
| `onBlur`    | Validate when field loses focus           |
| `onChange`  | Validate on every input change            |
| `onTouched` | Validate after blur, then on every change |

```typescript
const form = useForm({
  schema,
  mode: 'onBlur',
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
  onChange: (e: Event) => void
  onBlur: (e: Event) => void
}
```

**Returns (Controlled):**

```typescript
{
  value: Ref<T>
  name: string
  onChange: (e: Event) => void
  onBlur: (e: Event) => void
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
watch(): Ref<T>
watch(name: Path<T>): Ref<any>
watch(names: Path<T>[]): Ref<any[]>
```

Watch field values reactively.

```typescript
const allValues = watch()
const email = watch('email')
const [email, name] = watch(['email', 'name'])
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
clearErrors(name?: Path<T> | Path<T>[]): void
```

Clear errors from fields.

```typescript
clearErrors() // Clear all errors
clearErrors('email') // Clear specific field
clearErrors(['email', 'password']) // Clear multiple fields
```
