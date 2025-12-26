import type { ComponentPublicInstance, ComputedRef, MaybeRef, Ref } from 'vue'
import type { ZodType, z } from 'zod'

/**
 * Validation mode determines when validation occurs
 */
export type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'

/**
 * Extract the inferred type from a Zod schema
 */
export type InferSchema<T extends ZodType> = z.infer<T>

/**
 * Alias for InferSchema - extracts form value type from schema.
 * Use this when you need the actual form data type.
 *
 * @example
 * const schema = z.object({ email: z.string(), age: z.number() })
 * type MyFormValues = FormValues<typeof schema>
 * // Result: { email: string; age: number }
 */
export type FormValues<TSchema extends ZodType> = InferSchema<TSchema>

/**
 * Extract the element type from an array type.
 * Returns `never` if T is not an array.
 *
 * @example
 * type Item = ArrayElement<string[]>  // string
 * type Never = ArrayElement<string>   // never
 */
export type ArrayElement<T> = T extends Array<infer U> ? U : never

/**
 * Generate all possible dot-notation paths for a nested object type.
 * Provides IDE autocomplete for valid field names.
 *
 * @example
 * type Form = { user: { name: string; age: number }; tags: string[] }
 * type FormPaths = Path<Form>
 * // Result: 'user' | 'user.name' | 'user.age' | 'tags'
 *
 * @example Using with register
 * register('user.name')  // ✅ Valid - autocomplete suggests this
 * register('user.invalid')  // ❌ TypeScript error
 */
export type Path<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: K extends string | number
        ? `${K}` | `${K}.${Path<T[K]>}`
        : never
    }[keyof T & (string | number)]
  : never

/**
 * Type alias for valid field paths in a form.
 * Provides autocomplete for all dot-notation paths.
 *
 * @example
 * type MyPaths = FormPath<typeof schema>
 * // Use with functions that accept field paths
 */
export type FormPath<TSchema extends ZodType> = Path<FormValues<TSchema>>

/**
 * Get array field paths (fields that are arrays).
 * Useful for the fields() method which only works with array fields.
 *
 * @example
 * type Form = { name: string; addresses: Address[] }
 * type ArrayFields = ArrayPath<Form>  // 'addresses'
 */
export type ArrayPath<T> = {
  [K in Path<T>]: PathValue<T, K> extends Array<unknown> ? K : never
}[Path<T>]

/**
 * Extract the value type at a given dot-notation path.
 * Used internally to ensure setValue/getValue have correct types.
 * Supports numeric string indices for array access (e.g., 'items.0.name').
 *
 * @example
 * type Form = { user: { name: string }; items: { id: number }[] }
 * type NameType = PathValue<Form, 'user.name'>    // string
 * type ItemType = PathValue<Form, 'items.0'>      // { id: number }
 * type ItemId = PathValue<Form, 'items.0.id'>     // number
 */
export type PathValue<T, P extends string> = T extends unknown
  ? P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? PathValue<T[K], Rest>
      : T extends Array<infer U>
        ? K extends `${number}`
          ? PathValue<U, Rest>
          : never
        : never
    : P extends keyof T
      ? T[P]
      : T extends Array<infer U>
        ? P extends `${number}`
          ? U
          : never
        : never
  : never

/**
 * Single field error with type and message
 */
export interface FieldError {
  /** Error type identifier (e.g., 'required', 'minLength', 'custom') */
  type: string
  /** Error message to display */
  message: string
  /** Additional error types when multiple validations fail */
  types?: Record<string, string | string[]>
}

/**
 * Field error value - supports both simple strings and structured errors.
 *
 * - When `criteriaMode: 'firstError'` (default): Errors are typically strings
 * - When `criteriaMode: 'all'`: Errors are FieldError objects with `types` populated
 *
 * Use the `isFieldError()` type guard to safely handle both cases:
 * @example
 * const error = formState.value.errors.email
 * if (isFieldError(error)) {
 *   // Structured error with type, message, and optional types
 *   console.log(error.type, error.message)
 * } else if (typeof error === 'string') {
 *   // Simple string error
 *   console.log(error)
 * }
 */
export type FieldErrorValue = string | FieldError

/**
 * Field error structure matching the form data structure
 */
export type FieldErrors<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<FieldErrors<U>> | FieldErrorValue
    : T[K] extends object
      ? FieldErrors<T[K]> | FieldErrorValue
      : FieldErrorValue
} & {
  /** Root-level form errors */
  root?: FieldError
}

/**
 * Form state tracking
 */
export interface FormState<T> {
  /** Field validation errors */
  errors: FieldErrors<T>
  /** Whether form has been modified from default values */
  isDirty: boolean
  /** Whether form is currently valid (no errors) */
  isValid: boolean
  /** Whether form is currently submitting */
  isSubmitting: boolean
  /** Whether async default values are loading */
  isLoading: boolean
  /** Whether form is ready (initialization complete, not loading) */
  isReady: boolean
  /** Whether any field is currently being validated */
  isValidating: boolean
  /** Record of fields currently being validated */
  validatingFields: Record<string, boolean>
  /** Record of touched field paths */
  touchedFields: Record<string, boolean>
  /** Record of dirty field paths */
  dirtyFields: Record<string, boolean>
  /** Number of times form has been submitted */
  submitCount: number
  /** Error that occurred while loading async default values */
  defaultValuesError: unknown
  /** Whether form has been submitted at least once */
  isSubmitted: boolean
  /** Whether the last submission was successful */
  isSubmitSuccessful: boolean
}

/**
 * State of an individual field
 */
export interface FieldState {
  /** Whether field value differs from default */
  isDirty: boolean
  /** Whether field has been blurred */
  isTouched: boolean
  /** Whether field has a validation error */
  invalid: boolean
  /** The error (string for backward compatibility, or FieldError for structured errors) */
  error?: string | FieldError
}

/**
 * Error option for setError()
 */
export interface ErrorOption {
  /** Error type identifier */
  type?: string
  /** Error message to display */
  message: string
}

/**
 * Options for setFocus()
 */
export interface SetFocusOptions {
  /** Whether to select the text in the input */
  shouldSelect?: boolean
}

/**
 * Options for setValue()
 */
export interface SetValueOptions {
  /** Trigger validation after setting value (default: false) */
  shouldValidate?: boolean
  /** Mark field as dirty (default: true) */
  shouldDirty?: boolean
  /** Mark field as touched (default: false) */
  shouldTouch?: boolean
}

/**
 * Options for resetField()
 * @template TValue - The type of the field value (inferred from field path)
 */
export interface ResetFieldOptions<TValue = unknown> {
  /** Keep validation errors after reset */
  keepError?: boolean
  /** Keep dirty state after reset */
  keepDirty?: boolean
  /** Keep touched state after reset */
  keepTouched?: boolean
  /** New default value (updates stored default) - typed to match field */
  defaultValue?: TValue
}

/**
 * Options for unregister()
 */
export interface UnregisterOptions {
  /** Keep the field value in form data */
  keepValue?: boolean
  /** Keep validation errors */
  keepError?: boolean
  /** Keep dirty state */
  keepDirty?: boolean
  /** Keep touched state */
  keepTouched?: boolean
  /** Keep the default value */
  keepDefaultValue?: boolean
  /** Don't re-evaluate isValid */
  keepIsValid?: boolean
}

/**
 * Options for reset()
 */
export interface ResetOptions {
  /** Keep validation errors after reset */
  keepErrors?: boolean
  /** Keep dirty state after reset */
  keepDirty?: boolean
  /** Keep touched state after reset */
  keepTouched?: boolean
  /** Keep submit count after reset */
  keepSubmitCount?: boolean
  /** Keep current default values (don't update with new values) */
  keepDefaultValues?: boolean
  /** Keep isSubmitting state after reset */
  keepIsSubmitting?: boolean
  /** Keep isSubmitSuccessful state after reset */
  keepIsSubmitSuccessful?: boolean
}

/**
 * Options for registering a field
 * @template TValue - The type of the field value (inferred from field path)
 */
export interface RegisterOptions<TValue = unknown> {
  /** Use controlled mode (v-model) instead of uncontrolled (ref) */
  controlled?: boolean
  /** Disable validation for this field */
  disabled?: boolean
  /**
   * Custom validation function - receives the typed field value.
   * Return an error message string to indicate validation failure,
   * or undefined to indicate success.
   *
   * @example
   * register('email', {
   *   validate: (value) => {
   *     // value is typed as string (inferred from schema)
   *     if (!value.includes('@')) return 'Must be a valid email'
   *   }
   * })
   */
  validate?: (value: TValue) => string | undefined | Promise<string | undefined>
  /** Debounce time in ms for async validation (default: 0 = no debounce) */
  validateDebounce?: number
  /** Remove field data when unmounted (overrides global shouldUnregister option) */
  shouldUnregister?: boolean
  /** Dependent fields to re-validate when this field changes */
  deps?: string[]
}

/**
 * Return value from register() for binding to inputs.
 * Use object spread to bind all properties to your input element.
 *
 * @template TValue - The type of the field value (inferred from field path)
 *
 * @example
 * // Uncontrolled (default) - uses ref for DOM access
 * <input v-bind="register('email')" />
 *
 * @example
 * // Controlled - uses v-model via value ref
 * const { value, ...rest } = register('email', { controlled: true })
 * <input v-model="value" v-bind="rest" />
 */
export interface RegisterReturn<TValue = unknown> {
  /** Field name for form data */
  name: string
  /**
   * Ref callback for uncontrolled inputs.
   * Compatible with Vue's template ref system (v-bind spreads this onto elements).
   * Internally handles HTMLInputElement, HTMLSelectElement, and HTMLTextAreaElement.
   */
  ref: (
    el:
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | Element
      | ComponentPublicInstance
      | null,
    refs?: Record<string, unknown>,
  ) => void
  /** Input handler (fires on every keystroke) */
  onInput: (e: Event) => void
  /** Blur handler */
  onBlur: (e: Event) => void
  /** Current value (for controlled mode) - only present when controlled: true */
  value?: Ref<TValue>
}

/**
 * Field metadata for dynamic arrays
 */
export interface FieldArrayItem {
  /** Stable key for v-for */
  key: string
  /** Current index in array */
  index: number
  /** Remove this item */
  remove: () => void
}

/**
 * Focus options for field array operations
 */
export interface FieldArrayFocusOptions {
  /** Whether to focus after operation (default: true for append/prepend/insert) */
  shouldFocus?: boolean
  /** Which item index to focus relative to added items (default: 0 = first added) */
  focusIndex?: number
  /** Field name within the item to focus (e.g., 'name' for items.X.name) */
  focusName?: string
}

/**
 * Rules for validating field arrays
 */
export interface FieldArrayRules<T = unknown> {
  /** Minimum number of items required */
  minLength?: { value: number; message: string }
  /** Maximum number of items allowed */
  maxLength?: { value: number; message: string }
  /** Custom validation function - return error message or true if valid */
  validate?: (items: T[]) => string | true | Promise<string | true>
}

/**
 * Options for configuring field arrays
 */
export interface FieldArrayOptions<T = unknown> {
  /** Validation rules for the array itself */
  rules?: FieldArrayRules<T>
}

/**
 * API for managing dynamic field arrays.
 * All methods that accept values are typed to match the array item type.
 *
 * @template TItem - The type of items in the array (inferred from field path)
 *
 * @example
 * interface Address { street: string; city: string }
 * const addresses = fields('addresses') // FieldArray<Address>
 * addresses.append({ street: '123 Main', city: 'NYC' }) // Typed!
 */
export interface FieldArray<TItem = unknown> {
  /** Current field items with metadata */
  value: FieldArrayItem[]
  /** Append item(s) to end of array */
  append: (value: TItem | TItem[], options?: FieldArrayFocusOptions) => void
  /** Prepend item(s) to beginning of array */
  prepend: (value: TItem | TItem[], options?: FieldArrayFocusOptions) => void
  /** Remove item at index */
  remove: (index: number) => void
  /** Insert item(s) at index */
  insert: (index: number, value: TItem | TItem[], options?: FieldArrayFocusOptions) => void
  /** Swap two items */
  swap: (indexA: number, indexB: number) => void
  /** Move item from one index to another */
  move: (from: number, to: number) => void
  /** Update item at index (preserves key/identity) */
  update: (index: number, value: TItem) => void
  /** Replace all items with new values */
  replace: (values: TItem[]) => void
}

/**
 * Async default values function type
 */
export type AsyncDefaultValues<T> = () => Promise<Partial<T>>

/**
 * Criteria mode for error collection
 */
export type CriteriaMode = 'firstError' | 'all'

/**
 * Options for useForm composable
 */
export interface UseFormOptions<TSchema extends ZodType> {
  /** Zod schema for validation */
  schema: TSchema
  /** Default form values (can be a sync object or async function) */
  defaultValues?: Partial<InferSchema<TSchema>> | AsyncDefaultValues<InferSchema<TSchema>>
  /** When to run validation */
  mode?: ValidationMode
  /** Revalidate on change after first submit */
  reValidateMode?: ValidationMode
  /** Remove field data when unmounted (default: false) */
  shouldUnregister?: boolean
  /** Callback when async default values fail to load */
  onDefaultValuesError?: (error: unknown) => void
  /** Focus first field with error on submit (default: true) */
  shouldFocusError?: boolean
  /** How to collect validation errors: 'firstError' or 'all' (default: 'firstError') */
  criteriaMode?: CriteriaMode
  /** Delay before displaying validation errors in milliseconds (default: 0 = no delay) */
  delayError?: number
  /**
   * External values to sync to form. Changes update formData without marking dirty.
   * Useful for server-fetched data or parent component state.
   */
  values?: MaybeRef<Partial<InferSchema<TSchema>>>
  /**
   * External/server errors to merge with validation errors.
   * Useful for server-side validation errors.
   */
  errors?: MaybeRef<Partial<FieldErrors<InferSchema<TSchema>>>>
}

/**
 * Return value from useForm composable.
 * Provides full type safety with autocomplete for field paths and typed values.
 *
 * @template TSchema - The Zod schema type for form validation
 */
export interface UseFormReturn<TSchema extends ZodType> {
  /**
   * Register an input field for form management.
   * Returns props to spread onto your input element.
   *
   * @param name - Field path (e.g., 'email' or 'user.address.street')
   * @param options - Registration options (validation, controlled mode, etc.)
   * @returns Props to bind to the input element
   *
   * @example
   * <input v-bind="register('email')" />
   * <input v-bind="register('age', { validate: (v) => v >= 0 || 'Must be positive' })" />
   */
  register: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    options?: RegisterOptions<PathValue<InferSchema<TSchema>, TPath>>,
  ) => RegisterReturn<PathValue<InferSchema<TSchema>, TPath>>

  /**
   * Unregister a field to clean up refs and options
   * Call this when a field is unmounted to prevent memory leaks
   * @param name - Field path to unregister
   * @param options - Options for what state to preserve
   */
  unregister: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    options?: UnregisterOptions,
  ) => void

  /**
   * Handle form submission
   * @param onValid - Callback called with valid data
   * @param onInvalid - Optional callback called with errors
   */
  handleSubmit: (
    onValid: (data: InferSchema<TSchema>) => void | Promise<void>,
    onInvalid?: (errors: FieldErrors<InferSchema<TSchema>>) => void,
  ) => (e: Event) => Promise<void>

  /** Reactive form state */
  formState: ComputedRef<FormState<InferSchema<TSchema>>>

  /**
   * Manage dynamic field arrays.
   * Returns a typed API for adding, removing, and reordering array items.
   *
   * @param name - Array field path
   * @param options - Optional configuration including validation rules
   * @returns Typed FieldArray API
   *
   * @example
   * const addresses = fields('addresses')
   * addresses.append({ street: '', city: '' }) // Typed to Address
   */
  fields: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    options?: FieldArrayOptions<ArrayElement<PathValue<InferSchema<TSchema>, TPath>>>,
  ) => FieldArray<ArrayElement<PathValue<InferSchema<TSchema>, TPath>>>

  /**
   * Set field value programmatically
   * @param name - Field path
   * @param value - New value (typed to match field)
   * @param options - Options for validation/dirty/touched behavior
   */
  setValue: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    value: PathValue<InferSchema<TSchema>, TPath>,
    options?: SetValueOptions,
  ) => void

  /**
   * Get field value
   * @param name - Field path
   * @returns The field value (typed) or undefined if not set
   */
  getValue: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
  ) => PathValue<InferSchema<TSchema>, TPath> | undefined

  /**
   * Reset form to default values
   * @param values - Optional new default values
   * @param options - Optional reset options
   */
  reset: (values?: Partial<InferSchema<TSchema>>, options?: ResetOptions) => void

  /**
   * Reset an individual field to its default value
   * @param name - Field path
   * @param options - Options for what state to preserve (with typed defaultValue)
   */
  resetField: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    options?: ResetFieldOptions<PathValue<InferSchema<TSchema>, TPath>>,
  ) => void

  /**
   * Watch field value(s) reactively
   * @overload Watch all form values
   * @overload Watch single field value by path
   * @overload Watch multiple field values by paths array
   */
  watch: {
    (): ComputedRef<InferSchema<TSchema>>
    <TPath extends Path<InferSchema<TSchema>>>(name: TPath): ComputedRef<PathValue<InferSchema<TSchema>, TPath>>
    <TPath extends Path<InferSchema<TSchema>>>(names: TPath[]): ComputedRef<Partial<InferSchema<TSchema>>>
  }

  /**
   * Manually trigger validation
   * @param name - Optional field path (validates all if not provided)
   */
  validate: <TPath extends Path<InferSchema<TSchema>>>(name?: TPath) => Promise<boolean>

  /**
   * Clear errors for specified fields or all errors
   * @param name - Optional field path or array of paths
   */
  clearErrors: <TPath extends Path<InferSchema<TSchema>>>(
    name?: TPath | TPath[] | 'root' | `root.${string}`,
  ) => void

  /**
   * Set an error for a specific field
   * @param name - Field path or root error
   * @param error - Error option with message
   */
  setError: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath | 'root' | `root.${string}`,
    error: ErrorOption,
  ) => void

  /**
   * Get all form values, a single value, or multiple values
   * @overload Get all form values
   * @overload Get single field value by path
   * @overload Get multiple field values by paths array
   */
  getValues: {
    (): InferSchema<TSchema>
    <TPath extends Path<InferSchema<TSchema>>>(name: TPath): PathValue<InferSchema<TSchema>, TPath>
    <TPath extends Path<InferSchema<TSchema>>>(names: TPath[]): Partial<InferSchema<TSchema>>
  }

  /**
   * Get the state of an individual field
   * @param name - Field path
   */
  getFieldState: <TPath extends Path<InferSchema<TSchema>>>(name: TPath) => FieldState

  /**
   * Manually trigger validation for specific fields or entire form
   * @param name - Optional field path or array of paths
   */
  trigger: <TPath extends Path<InferSchema<TSchema>>>(name?: TPath | TPath[]) => Promise<boolean>

  /**
   * Programmatically focus a field
   * @param name - Field path
   * @param options - Focus options
   */
  setFocus: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    options?: SetFocusOptions,
  ) => void
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error value is a structured FieldError object.
 * Use this to safely narrow FieldErrorValue when handling errors.
 *
 * @param error - The error value to check (can be string, FieldError, or undefined)
 * @returns True if the error is a FieldError object with type and message
 *
 * @example
 * const error = formState.value.errors.email
 * if (isFieldError(error)) {
 *   // error is FieldError - has .type, .message, and optional .types
 *   console.log(`${error.type}: ${error.message}`)
 * } else if (typeof error === 'string') {
 *   // error is a simple string message
 *   console.log(error)
 * }
 */
export function isFieldError(error: FieldErrorValue | undefined | null): error is FieldError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    typeof error.type === 'string' &&
    typeof error.message === 'string'
  )
}
