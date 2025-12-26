import type { ComputedRef, MaybeRef, Ref } from 'vue'
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
 * Generate all possible paths for a nested object type
 * e.g., { user: { name: string } } => 'user' | 'user.name'
 */
export type Path<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: K extends string | number
        ? `${K}` | `${K}.${Path<T[K]>}`
        : never
    }[keyof T & (string | number)]
  : never

/**
 * Get the type at a given path
 * e.g., PathValue<{ user: { name: string } }, 'user.name'> => string
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Path<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
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
 * Field error value - can be a simple string (backward compatible) or structured error
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
 */
export interface ResetFieldOptions {
  /** Keep validation errors after reset */
  keepError?: boolean
  /** Keep dirty state after reset */
  keepDirty?: boolean
  /** Keep touched state after reset */
  keepTouched?: boolean
  /** New default value (updates stored default) */
  defaultValue?: unknown
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
 */
export interface RegisterOptions {
  /** Use controlled mode (v-model) instead of uncontrolled (ref) */
  controlled?: boolean
  /** Disable validation for this field */
  disabled?: boolean
  /** Custom validation function */
  validate?: (value: unknown) => string | undefined | Promise<string | undefined>
  /** Debounce time in ms for async validation (default: 0 = no debounce) */
  validateDebounce?: number
  /** Remove field data when unmounted (overrides global shouldUnregister option) */
  shouldUnregister?: boolean
  /** Dependent fields to re-validate when this field changes */
  deps?: string[]
}

/**
 * Return value from register() for binding to inputs
 */
export interface RegisterReturn {
  /** Field name for form data */
  name: string
  /** Ref callback for uncontrolled inputs - accepts HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement, or null */
  ref: (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null | unknown) => void
  /** Input handler (fires on every keystroke) */
  onInput: (e: Event) => void
  /** Blur handler */
  onBlur: (e: Event) => void
  /** Current value (for controlled mode) - only present when controlled: true */
  value?: Ref<unknown>
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
 * API for managing dynamic field arrays
 */
export interface FieldArray {
  /** Current field items with metadata */
  value: FieldArrayItem[]
  /** Append item(s) to end of array */
  append: (value: unknown | unknown[], options?: FieldArrayFocusOptions) => void
  /** Prepend item(s) to beginning of array */
  prepend: (value: unknown | unknown[], options?: FieldArrayFocusOptions) => void
  /** Remove item at index */
  remove: (index: number) => void
  /** Insert item(s) at index */
  insert: (index: number, value: unknown | unknown[], options?: FieldArrayFocusOptions) => void
  /** Swap two items */
  swap: (indexA: number, indexB: number) => void
  /** Move item from one index to another */
  move: (from: number, to: number) => void
  /** Update item at index (preserves key/identity) */
  update: (index: number, value: unknown) => void
  /** Replace all items with new values */
  replace: (values: unknown[]) => void
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
 * Return value from useForm composable
 */
export interface UseFormReturn<TSchema extends ZodType> {
  /**
   * Register an input field
   * @param name - Field path (e.g., 'email' or 'user.address.street')
   * @param options - Registration options
   */
  register: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    options?: RegisterOptions,
  ) => RegisterReturn

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
   * Manage dynamic field arrays
   * @param name - Array field path
   * @param options - Optional configuration including rules
   */
  fields: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    options?: FieldArrayOptions,
  ) => FieldArray

  /**
   * Set field value programmatically
   * @param name - Field path
   * @param value - New value
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
   * @param options - Options for what state to preserve
   */
  resetField: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    options?: ResetFieldOptions,
  ) => void

  /**
   * Watch field value(s) reactively
   * @param name - Field path or array of paths (optional - watches all if not provided)
   */
  watch: <TPath extends Path<InferSchema<TSchema>>>(name?: TPath | TPath[]) => ComputedRef<unknown>

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
    name?: TPath | TPath[]
  ) => void

  /**
   * Set an error for a specific field
   * @param name - Field path or root error
   * @param error - Error option with message
   */
  setError: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath | 'root' | `root.${string}`,
    error: ErrorOption
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
  getFieldState: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath
  ) => FieldState

  /**
   * Manually trigger validation for specific fields or entire form
   * @param name - Optional field path or array of paths
   */
  trigger: <TPath extends Path<InferSchema<TSchema>>>(
    name?: TPath | TPath[]
  ) => Promise<boolean>

  /**
   * Programmatically focus a field
   * @param name - Field path
   * @param options - Focus options
   */
  setFocus: <TPath extends Path<InferSchema<TSchema>>>(
    name: TPath,
    options?: SetFocusOptions
  ) => void
}
