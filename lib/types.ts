import type { ComponentPublicInstance, ComputedRef, MaybeRef, Ref } from 'vue'
import type { ZodType, z } from 'zod'

/**
 * Validation mode determines when validation occurs
 */
export type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched'

/**
 * Extract the inferred type from a Zod schema
 */
export type InferSchema<TSchema extends ZodType> = z.infer<TSchema>

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
 * Get non-array field paths (primitive fields and nested objects, excluding arrays).
 * Useful for methods like register() that work with individual fields.
 *
 * @example
 * type Form = { name: string; addresses: Address[] }
 * type Fields = FieldPath<Form>  // 'name' (excludes 'addresses')
 */
export type FieldPath<T> = {
  [K in Path<T>]: PathValue<T, K> extends Array<unknown> ? never : K
}[Path<T>]

/**
 * Extract the value type at a given dot-notation path.
 * Used internally to ensure setValue/getValues have correct types.
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
 * Single field error with type and message.
 * When criteriaMode is 'all', the `types` property contains all validation errors.
 */
export interface FieldError {
  /** Error type identifier (e.g., 'required', 'too_small', 'invalid_string', 'custom') */
  type: string
  /** Primary error message to display */
  message: string
  /**
   * Additional error types when multiple validations fail.
   * Only populated when `criteriaMode: 'all'` is set in useForm options.
   *
   * @example Password with multiple requirements
   * ```ts
   * // Schema:
   * const schema = z.object({
   *   password: z.string()
   *     .min(8, 'At least 8 characters')
   *     .regex(/[A-Z]/, 'Needs uppercase letter')
   *     .regex(/[0-9]/, 'Needs a number')
   * })
   *
   * // With criteriaMode: 'all', error.types might be:
   * // {
   * //   too_small: 'At least 8 characters',
   * //   invalid_string: ['Needs uppercase letter', 'Needs a number']
   * // }
   *
   * // Template usage:
   * // <ul v-if="isFieldError(error) && error.types">
   * //   <li v-for="(messages, type) in error.types" :key="type">
   * //     {{ Array.isArray(messages) ? messages.join(', ') : messages }}
   * //   </li>
   * // </ul>
   * ```
   */
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
  /** Set of field paths currently being validated */
  validatingFields: Set<string>
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
  /** Whether the form is disabled */
  disabled: boolean
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
  error?: FieldErrorValue
}

/**
 * Error option for setError()
 */
export interface ErrorOption {
  /** Error type identifier */
  type?: string
  /** Error message to display */
  message: string
  /**
   * If true, the error will not be cleared by subsequent validations.
   * Useful for server-side validation errors that should persist until explicitly cleared.
   */
  persistent?: boolean
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
 * Options for trigger()
 */
export interface TriggerOptions {
  /**
   * If true, increments submitCount to activate reValidateMode behavior.
   * Useful when you want manual validation to trigger reValidation on subsequent changes.
   */
  markAsSubmitted?: boolean
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
 * Options for setErrors() bulk operation
 */
export interface SetErrorsOptions {
  /** Replace all existing errors instead of merging (default: false) */
  shouldReplace?: boolean
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
  /** Disabled state from form-level disabled option */
  disabled?: boolean
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
 * Most operations return a boolean indicating success or failure.
 * Operations fail (return false) when:
 * - maxLength rule would be exceeded (append, prepend, insert)
 * - minLength rule would be violated (remove, removeAll, removeMany)
 * - Index is out of bounds (remove, update, swap, move)
 *
 * **Reactivity:** The `value` property is fully reactive - it automatically
 * updates when array methods (append, remove, swap, etc.) are called.
 * Your template will re-render when items change.
 *
 * @template TItem - The type of items in the array (inferred from field path)
 *
 * @example
 * interface Address { street: string; city: string }
 * const addresses = fields('addresses') // FieldArray<Address>
 * addresses.append({ street: '123 Main', city: 'NYC' }) // Typed!
 *
 * @example Check if operation succeeded
 * const success = addresses.append({ street: '', city: '' })
 * if (!success) {
 *   // Operation was rejected (e.g., maxLength exceeded)
 *   showNotification('Cannot add more addresses')
 * }
 */
export interface FieldArray<TItem = unknown> {
  /** Current field items with metadata. Reactive - updates when array methods are called. */
  value: FieldArrayItem[]
  /** Append item(s) to end of array. Returns false if maxLength exceeded. */
  append: (value: TItem | TItem[], options?: FieldArrayFocusOptions) => boolean
  /** Prepend item(s) to beginning of array. Returns false if maxLength exceeded. */
  prepend: (value: TItem | TItem[], options?: FieldArrayFocusOptions) => boolean
  /** Remove item at index. Returns false if minLength violated or index out of bounds. */
  remove: (index: number) => boolean
  /**
   * Remove all items from the array.
   * Returns false if minLength > 0.
   */
  removeAll: () => boolean
  /**
   * Remove multiple items by indices (handles any order, removes from highest to lowest).
   * Returns false if minLength would be violated.
   * @param indices - Array of indices to remove
   */
  removeMany: (indices: number[]) => boolean
  /** Insert item(s) at index. Returns false if maxLength exceeded. */
  insert: (index: number, value: TItem | TItem[], options?: FieldArrayFocusOptions) => boolean
  /** Swap two items. Returns false if either index is out of bounds. */
  swap: (indexA: number, indexB: number) => boolean
  /** Move item from one index to another. Returns false if from index is out of bounds. */
  move: (from: number, to: number) => boolean
  /** Update item at index (preserves key/identity). Returns false if index out of bounds. */
  update: (index: number, value: TItem) => boolean
  /** Replace all items with new values. Always succeeds (returns true). */
  replace: (values: TItem[]) => boolean
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

  /**
   * Default form values. Can be a sync object or async function.
   * Async function is useful for fetching initial values from an API.
   *
   * @example Sync default values
   * ```ts
   * useForm({
   *   schema,
   *   defaultValues: { email: '', name: '' }
   * })
   * ```
   *
   * @example Async default values (API fetch)
   * ```ts
   * useForm({
   *   schema,
   *   defaultValues: async () => {
   *     const user = await api.getCurrentUser()
   *     return { email: user.email, name: user.name }
   *   },
   *   onDefaultValuesError: (err) => console.error('Failed to load user:', err)
   * })
   * // Check formState.isLoading to show loading indicator
   * ```
   */
  defaultValues?: Partial<InferSchema<TSchema>> | AsyncDefaultValues<InferSchema<TSchema>>

  /**
   * When to run validation.
   * - 'onSubmit' (default): Only validate on form submission
   * - 'onBlur': Validate when field loses focus
   * - 'onChange': Validate on every input change
   * - 'onTouched': Validate after field touched, then on every change
   *
   * @example Different validation modes
   * ```ts
   * // Most performant - only show errors after submit attempt
   * useForm({ schema, mode: 'onSubmit' })
   *
   * // Real-time feedback - validate as user types
   * useForm({ schema, mode: 'onChange' })
   *
   * // Balanced - validate after first interaction
   * useForm({ schema, mode: 'onTouched' })
   * ```
   */
  mode?: ValidationMode

  /**
   * Validation mode after first submission.
   * Useful for "validate on submit, then real-time revalidation" pattern.
   *
   * @example Submit first, then real-time
   * ```ts
   * useForm({
   *   schema,
   *   mode: 'onSubmit',           // First submit validates all
   *   reValidateMode: 'onChange'  // After submit, revalidate on change
   * })
   * ```
   */
  reValidateMode?: ValidationMode

  /** Remove field data when unmounted (default: false) */
  shouldUnregister?: boolean

  /** Callback when async default values fail to load */
  onDefaultValuesError?: (error: unknown) => void

  /** Focus first field with error on submit (default: true) */
  shouldFocusError?: boolean

  /**
   * How to collect validation errors.
   * - 'firstError' (default): Stop at first error per field
   * - 'all': Collect all errors for each field (populates FieldError.types)
   *
   * @example Show all validation errors (password requirements)
   * ```ts
   * const schema = z.object({
   *   password: z.string()
   *     .min(8, 'At least 8 characters')
   *     .regex(/[A-Z]/, 'Needs uppercase letter')
   *     .regex(/[0-9]/, 'Needs a number')
   * })
   *
   * useForm({ schema, criteriaMode: 'all' })
   *
   * // In template - display all password requirements:
   * // <ul v-if="formState.errors.password?.types">
   * //   <li v-for="(msg, type) in formState.errors.password.types" :key="type">
   * //     {{ msg }}
   * //   </li>
   * // </ul>
   * ```
   *
   * @see isFieldError - Type guard for structured errors
   * @see FieldError.types - Contains all error types when criteriaMode is 'all'
   */
  criteriaMode?: CriteriaMode

  /**
   * Delay in milliseconds before displaying validation errors.
   * Prevents error flash during fast typing.
   *
   * @example Delay error display by 500ms
   * ```ts
   * useForm({
   *   schema,
   *   mode: 'onChange',
   *   delayError: 500  // Wait 500ms before showing error
   * })
   * // If user fixes error within 500ms, error never appears
   * ```
   */
  delayError?: number

  /**
   * Debounce time in milliseconds for schema validation in onChange mode.
   * Prevents excessive validation calls during rapid typing.
   * Unlike delayError which delays showing errors, this delays the validation itself.
   *
   * @example Debounce validation by 150ms
   * ```ts
   * useForm({
   *   schema,
   *   mode: 'onChange',
   *   validationDebounce: 150  // Wait 150ms of idle time before validating
   * })
   * // Reduces validation calls during rapid typing
   * ```
   */
  validationDebounce?: number

  /**
   * External values to sync to form. Changes update formData without marking dirty.
   * Useful for server-fetched data or parent component state.
   *
   * @example Sync with parent component state
   * ```ts
   * const props = defineProps<{ userData: UserData }>()
   *
   * useForm({
   *   schema,
   *   values: computed(() => props.userData)  // Reactive sync
   * })
   * // When props.userData changes, form updates without becoming dirty
   * ```
   *
   * @example Sync with API polling
   * ```ts
   * const { data: serverData } = useQuery('user', fetchUser)
   *
   * useForm({
   *   schema,
   *   values: serverData  // Ref from useQuery
   * })
   * ```
   */
  values?: MaybeRef<Partial<InferSchema<TSchema>>>

  /**
   * External/server errors to merge with validation errors.
   * These take precedence over client-side validation errors.
   *
   * @example Display server validation errors
   * ```ts
   * const serverErrors = ref({})
   *
   * const { handleSubmit } = useForm({
   *   schema,
   *   errors: serverErrors
   * })
   *
   * const onSubmit = async (data) => {
   *   try {
   *     await api.submit(data)
   *   } catch (err) {
   *     if (err.validationErrors) {
   *       serverErrors.value = err.validationErrors
   *       // e.g., { email: 'Email already registered' }
   *     }
   *   }
   * }
   * ```
   */
  errors?: MaybeRef<Partial<FieldErrors<InferSchema<TSchema>>>>

  /**
   * Disable the entire form. When true:
   * - All registered fields receive `disabled` attribute
   * - Form submission is prevented
   * - Can be reactive (MaybeRef) to toggle dynamically
   *
   * @example Disable form during submission
   * ```ts
   * const isSubmitting = ref(false)
   *
   * useForm({
   *   schema,
   *   disabled: isSubmitting
   * })
   * ```
   */
  disabled?: MaybeRef<boolean>

  /**
   * Enable browser's native validation API.
   * When true:
   * - Calls setCustomValidity() on inputs with error messages
   * - Enables :valid/:invalid CSS pseudo-selectors
   * - Shows native browser validation tooltips
   *
   * @example
   * ```ts
   * useForm({ schema, shouldUseNativeValidation: true })
   *
   * // CSS styling:
   * // input:invalid { border-color: red; }
   * // input:valid { border-color: green; }
   * ```
   */
  shouldUseNativeValidation?: boolean
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
   * @param name - Array field path (must be an array field in the schema)
   * @param options - Optional configuration including validation rules
   * @returns Typed FieldArray API
   *
   * @example
   * const addresses = fields('addresses')
   * addresses.append({ street: '', city: '' }) // Typed to Address
   */
  fields: <TPath extends ArrayPath<InferSchema<TSchema>>>(
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
    <TPath extends Path<InferSchema<TSchema>>>(
      name: TPath,
    ): ComputedRef<PathValue<InferSchema<TSchema>, TPath>>
    <TPath extends Path<InferSchema<TSchema>>>(
      names: TPath[],
    ): ComputedRef<Partial<InferSchema<TSchema>>>
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
   * Set multiple errors at once. Useful for server-side validation errors
   * or bulk error handling scenarios.
   *
   * @param errors - Record of field paths to error messages or ErrorOption objects
   * @param options - Optional configuration for merge behavior
   *
   * @example
   * // Simple string errors
   * setErrors({
   *   email: 'Email already exists',
   *   'user.name': 'Name is too short'
   * })
   *
   * @example
   * // Replace all errors
   * setErrors({ email: 'New error' }, { shouldReplace: true })
   */
  setErrors: <TPath extends Path<InferSchema<TSchema>>>(
    errors: Partial<Record<TPath | 'root' | `root.${string}`, string | ErrorOption>>,
    options?: SetErrorsOptions,
  ) => void

  /**
   * Check if the form or a specific field has validation errors
   *
   * @param fieldPath - Optional field path to check. If omitted, checks entire form.
   * @returns true if errors exist, false otherwise
   *
   * @example
   * if (hasErrors()) {
   *   console.log('Form has validation errors')
   * }
   *
   * @example
   * if (hasErrors('email')) {
   *   focusField('email')
   * }
   */
  hasErrors: <TPath extends Path<InferSchema<TSchema>>>(
    fieldPath?: TPath | 'root' | `root.${string}`,
  ) => boolean

  /**
   * Get validation errors for the form or a specific field
   *
   * @overload Get all form errors
   * @overload Get error for a specific field
   *
   * @example
   * const allErrors = getErrors()
   *
   * @example
   * const emailError = getErrors('email')
   */
  getErrors: {
    (): FieldErrors<InferSchema<TSchema>>
    <TPath extends Path<InferSchema<TSchema>>>(
      fieldPath: TPath | 'root' | `root.${string}`,
    ): FieldErrorValue | undefined
  }

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
   * @param options - Optional trigger options (e.g., markAsSubmitted)
   */
  trigger: <TPath extends Path<InferSchema<TSchema>>>(
    name?: TPath | TPath[],
    options?: TriggerOptions,
  ) => Promise<boolean>

  /**
   * Programmatically focus a field
   * @param name - Field path
   * @param options - Focus options
   */
  setFocus: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    options?: SetFocusOptions,
  ) => void

  /**
   * Form configuration options (mode, reValidateMode).
   * Useful for composables like useController that need to respect validation modes.
   */
  options: Pick<UseFormOptions<TSchema>, 'mode' | 'reValidateMode'>
}

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
