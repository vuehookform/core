# Types

TypeScript type definitions for Vue Hook Form.

## UseFormOptions

Options for the `useForm` composable.

```typescript
interface UseFormOptions<T extends ZodSchema> {
  /**
   * Zod schema for validation
   */
  schema: T

  /**
   * Initial form values
   */
  defaultValues?: Partial<z.infer<T>>

  /**
   * When to trigger validation
   * @default 'onSubmit'
   */
  mode?: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'

  /**
   * Disable the entire form
   * @default false
   */
  disabled?: Ref<boolean> | boolean

  /**
   * Use browser's native validation
   * @default false
   */
  shouldUseNativeValidation?: boolean
}
```

## UseFormReturn

Return value of the `useForm` composable.

```typescript
interface UseFormReturn<T> {
  /**
   * Register an input field
   */
  register: (name: Path<T>, options?: { controlled?: boolean }) => RegisterReturn

  /**
   * Wrap submit handler with validation
   */
  handleSubmit: (
    onValid: (data: T) => void | Promise<void>,
    onInvalid?: (errors: FieldErrors<T>) => void,
  ) => (e: Event) => Promise<void>

  /**
   * Reactive form state
   */
  formState: Ref<FormState<T>>

  /**
   * Get field array manager
   */
  fields: (name: ArrayPath<T>) => FieldArrayReturn<T>

  /**
   * Control object for child components
   */
  control: Control<T>

  /**
   * Set a field value
   */
  setValue: (
    name: Path<T>,
    value: any,
    options?: { shouldValidate?: boolean; shouldDirty?: boolean },
  ) => void

  /**
   * Get a field value
   */
  getValue: (name: Path<T>) => any

  /**
   * Get all or specific field values
   */
  getValues: (names?: Path<T>[]) => T | Partial<T>

  /**
   * Reset form to default or new values
   */
  reset: (values?: Partial<T>) => void

  /**
   * Manually trigger validation
   */
  trigger: (name?: Path<T> | Path<T>[]) => Promise<boolean>

  /**
   * Watch field values
   */
  watch: (name?: Path<T> | Path<T>[]) => Ref<any>

  /**
   * Set a field error
   */
  setError: (name: Path<T>, message: string) => void

  /**
   * Clear field errors
   */
  clearErrors: (name?: Path<T> | Path<T>[]) => void
}
```

## FormState

Reactive form state object.

```typescript
interface FormState<T> {
  /**
   * Validation errors by field
   */
  errors: FieldErrors<T>

  /**
   * True if any field differs from default
   */
  isDirty: boolean

  /**
   * True if form has no validation errors
   */
  isValid: boolean

  /**
   * True while submission is in progress
   */
  isSubmitting: boolean

  /**
   * True after first submission attempt
   */
  isSubmitted: boolean

  /**
   * True if last submission was successful
   */
  isSubmitSuccessful: boolean

  /**
   * Number of submission attempts
   */
  submitCount: number

  /**
   * Record of touched field names
   */
  touchedFields: Record<string, boolean>

  /**
   * Record of dirty field names
   */
  dirtyFields: Record<string, boolean>

  /**
   * True while async default values are loading
   */
  isLoading: boolean

  /**
   * True when form is ready (inverse of isLoading)
   */
  isReady: boolean

  /**
   * True while any field is validating asynchronously
   */
  isValidating: boolean

  /**
   * Set of fields currently validating
   */
  validatingFields: Set<string>

  /**
   * Error from loading async default values
   */
  defaultValuesError: unknown

  /**
   * True when form is disabled
   */
  disabled: boolean
}
```

## FieldErrors

Error object structure matching form schema.

```typescript
type FieldErrors<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends any[]
      ? (FieldErrors<T[K][number]> | undefined)[] | string
      : FieldErrors<T[K]> | string
    : string
}

// Example
interface FormData {
  email: string
  address: {
    street: string
    city: string
  }
  items: { name: string }[]
}

// FieldErrors<FormData> =
{
  email?: string
  address?: {
    street?: string
    city?: string
  } | string
  items?: ({ name?: string } | undefined)[] | string
}
```

## FieldArray

Field array manager for dynamic lists.

```typescript
interface FieldArrayReturn<T> {
  /**
   * Array of field objects with stable keys
   */
  value: Ref<FieldArrayItem[]>

  /**
   * Add item to end of array
   * @returns false if maxLength exceeded
   */
  append: (value: T) => boolean

  /**
   * Add item to start of array
   * @returns false if maxLength exceeded
   */
  prepend: (value: T) => boolean

  /**
   * Insert item at index
   * @returns false if maxLength exceeded
   */
  insert: (index: number, value: T) => boolean

  /**
   * Remove item at index
   * @returns false if minLength would be violated
   */
  remove: (index: number) => boolean

  /**
   * Remove all items from array
   * @returns false if minLength would be violated
   */
  removeAll: () => boolean

  /**
   * Remove multiple items by indices
   * @returns false if minLength would be violated
   */
  removeMany: (indices: number[]) => boolean

  /**
   * Update item at index while preserving its key
   */
  update: (index: number, value: T) => void

  /**
   * Swap two items
   */
  swap: (indexA: number, indexB: number) => void

  /**
   * Move item from one index to another
   */
  move: (from: number, to: number) => void

  /**
   * Replace all items
   */
  replace: (values: T[]) => void
}

interface FieldArrayItem {
  /**
   * Stable key for v-for
   */
  key: string

  /**
   * Current index in array
   */
  index: number

  /**
   * Remove this item
   */
  remove: () => void
}
```

## Path

Type-safe field paths derived from schema.

```typescript
// For schema:
const schema = z.object({
  user: z.object({
    name: z.string(),
    addresses: z.array(
      z.object({
        street: z.string(),
        city: z.string(),
      }),
    ),
  }),
})

// Path<T> generates:
type ValidPaths =
  | 'user'
  | 'user.name'
  | 'user.addresses'
  | `user.addresses.${number}`
  | `user.addresses.${number}.street`
  | `user.addresses.${number}.city`

// Usage
register('user.name') // OK
register('user.addresses.0.street') // OK
register('user.invalid') // Type error
```

## ArrayPath

Paths that point to array fields.

```typescript
// For the schema above:
type ArrayPaths = 'user.addresses'

// Usage
fields('user.addresses') // OK
fields('user.name') // Type error - not an array
```

## RegisterReturn

Return value of `register()`.

```typescript
// Uncontrolled mode (default)
interface RegisterReturn {
  name: string
  ref: (el: HTMLElement | null) => void
  onInput: (e: Event) => void
  onBlur: (e: Event) => void
  disabled?: boolean // Present when form is disabled
}

// Controlled mode
interface ControlledRegisterReturn {
  value: Ref<T>
  name: string
  onInput: (e: Event) => void
  onBlur: (e: Event) => void
  disabled?: boolean // Present when form is disabled
}
```

## Control

Control object for child component integration.

```typescript
interface Control<T> {
  /**
   * Register a field (internal use)
   */
  register: RegisterFunction<T>

  /**
   * Get form values (internal use)
   */
  getValues: () => T

  /**
   * Form state ref (internal use)
   */
  formState: Ref<FormState<T>>

  /**
   * Schema for validation (internal use)
   */
  schema: ZodSchema
}
```

The `Control` type is primarily used to pass form context to:

- `useController`
- `useFormState`
- `useWatch`
- Child components via props

## RegisterOptions

Options for the `register()` function.

```typescript
interface RegisterOptions<T> {
  /**
   * Enable controlled mode (returns reactive value ref)
   * @default false
   */
  controlled?: boolean

  /**
   * Disable validation for this field
   */
  disabled?: boolean

  /**
   * Custom validation function
   * Return error message string or undefined if valid
   */
  validate?: (value: T, formValues: FormData) => string | undefined | Promise<string | undefined>

  /**
   * Debounce async validation (milliseconds)
   */
  validateDebounce?: number

  /**
   * Field names to re-validate when this field changes
   */
  deps?: string[]

  /**
   * Override global shouldUnregister for this field
   */
  shouldUnregister?: boolean
}
```

## ResetOptions

Options for the `reset()` function.

```typescript
interface ResetOptions {
  /**
   * Don't clear errors
   */
  keepErrors?: boolean

  /**
   * Don't reset dirty state
   */
  keepDirty?: boolean

  /**
   * Don't reset touched state
   */
  keepTouched?: boolean

  /**
   * Don't reset submit counter
   */
  keepSubmitCount?: boolean

  /**
   * Don't update stored default values
   */
  keepDefaultValues?: boolean

  /**
   * Don't reset submitting state
   */
  keepIsSubmitting?: boolean

  /**
   * Don't reset success state
   */
  keepIsSubmitSuccessful?: boolean
}
```

## ResetFieldOptions

Options for the `resetField()` function.

```typescript
interface ResetFieldOptions<T> {
  /**
   * Keep validation error
   */
  keepError?: boolean

  /**
   * Keep dirty state
   */
  keepDirty?: boolean

  /**
   * Keep touched state
   */
  keepTouched?: boolean

  /**
   * New default value for this field
   */
  defaultValue?: T
}
```

## UnregisterOptions

Options for the `unregister()` function.

```typescript
interface UnregisterOptions {
  /**
   * Don't clear field value
   */
  keepValue?: boolean

  /**
   * Keep validation error
   */
  keepError?: boolean

  /**
   * Keep dirty state
   */
  keepDirty?: boolean

  /**
   * Keep touched state
   */
  keepTouched?: boolean

  /**
   * Keep stored default value
   */
  keepDefaultValue?: boolean

  /**
   * Don't re-evaluate form validity
   */
  keepIsValid?: boolean
}
```

## SetValueOptions

Options for the `setValue()` function.

```typescript
interface SetValueOptions {
  /**
   * Trigger validation after setting value
   * @default false
   */
  shouldValidate?: boolean

  /**
   * Mark field as dirty
   * @default true
   */
  shouldDirty?: boolean

  /**
   * Mark field as touched
   * @default false
   */
  shouldTouch?: boolean
}
```

## SetErrorsOptions

Options for the `setErrors()` function.

```typescript
interface SetErrorsOptions {
  /**
   * Replace all errors instead of merging
   * @default false
   */
  shouldReplace?: boolean
}
```

## FieldArrayOptions

Options for the `fields()` function.

```typescript
interface FieldArrayOptions<T> {
  /**
   * Validation rules for the array
   */
  rules?: FieldArrayRules<T>
}
```

## FieldArrayRules

Validation rules for field arrays.

```typescript
interface FieldArrayRules<T> {
  /**
   * Minimum number of items required
   */
  minLength?: {
    value: number
    message: string
  }

  /**
   * Maximum number of items allowed
   */
  maxLength?: {
    value: number
    message: string
  }

  /**
   * Custom array validation
   * Return error message or true if valid
   */
  validate?: (items: T[]) => string | true | Promise<string | true>
}
```

## FieldArrayFocusOptions

Focus options for field array operations.

```typescript
interface FieldArrayFocusOptions {
  /**
   * Focus the newly added item
   * @default true for add operations
   */
  shouldFocus?: boolean

  /**
   * When adding multiple items, which one to focus (0-indexed)
   * @default 0
   */
  focusIndex?: number

  /**
   * Field name within the item to focus
   * @example 'email' focuses items.X.email
   */
  focusName?: string
}
```

## FieldError

Structured error with type information.

```typescript
interface FieldError {
  /**
   * Error type identifier (e.g., 'required', 'too_small', 'custom')
   */
  type: string

  /**
   * Primary error message
   */
  message: string

  /**
   * All error types when criteriaMode: 'all'
   */
  types?: Record<string, string | string[]>
}
```

## FieldState

State of an individual field.

```typescript
interface FieldState {
  /**
   * Field value differs from default
   */
  isDirty: boolean

  /**
   * Field has been interacted with
   */
  isTouched: boolean

  /**
   * Field has validation error
   */
  invalid: boolean

  /**
   * Current error message
   */
  error?: string | FieldError
}
```

## ValidationMode

```typescript
type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'
```

## CriteriaMode

```typescript
type CriteriaMode = 'firstError' | 'all'
```
