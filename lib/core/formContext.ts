import { reactive, ref, shallowRef, watch, toValue, type Ref, type ShallowRef } from 'vue'
import type { ZodType } from 'zod'
import type {
  UseFormOptions,
  FieldErrors,
  FieldErrorValue,
  InferSchema,
  RegisterOptions,
  FieldArrayItem,
  FieldArrayRules,
} from '../types'
import { set } from '../utils/paths'

/**
 * Internal state for field array management.
 * Tracks items, their indices, and array-level validation rules.
 *
 * @internal This interface is used internally by useFieldArray and should not be
 * directly instantiated by consumers.
 */
export interface FieldArrayState {
  /** Reactive list of field array items with stable keys for Vue reconciliation */
  items: Ref<FieldArrayItem[]>
  /** Raw array values (kept in sync with formData) */
  values: unknown[]
  /** O(1) lookup cache mapping item keys to their current indices */
  indexCache: Map<string, number>
  /** Optional validation rules for the array itself (minLength, maxLength, custom) */
  rules?: FieldArrayRules
}

/**
 * Cached event handlers for a field.
 * These are created once per field registration and reused to prevent
 * unnecessary re-renders and closure recreation.
 *
 * @internal This interface is used internally by useFieldRegistration and should not be
 * directly instantiated by consumers.
 */
export interface FieldHandlers {
  /** Handler for input events, triggers validation based on mode */
  onInput: (e: Event) => Promise<void>
  /** Handler for blur events, marks field as touched and may trigger validation */
  onBlur: (e: Event) => Promise<void>
  /** Ref callback to capture the DOM element reference */
  refCallback: (el: unknown) => void
}

/**
 * Shared form context containing all reactive state.
 * This is the central state container passed to sub-modules via dependency injection.
 *
 * The context is organized into several categories:
 * - **Form Data**: Raw form values and their defaults
 * - **Form State**: Validation errors, touched/dirty tracking, submission state
 * - **Field Tracking**: DOM refs, registration options, field arrays
 * - **Validation**: Caching, debouncing, and async validation coordination
 * - **Configuration**: Form options and disabled state
 *
 * @typeParam FormValues - The inferred type from the Zod schema
 *
 * @internal This interface is used internally by useForm and its sub-modules.
 * Consumers should use the public API returned by useForm() instead.
 */
export interface FormContext<FormValues> {
  // ═══════════════════════════════════════════════════════════════════════════
  // Form Data
  // ═══════════════════════════════════════════════════════════════════════════

  /** Reactive form data object containing current field values */
  formData: Record<string, unknown>
  /** Original default values used for reset() and dirty detection */
  defaultValues: Record<string, unknown>

  // ═══════════════════════════════════════════════════════════════════════════
  // Form State
  // ═══════════════════════════════════════════════════════════════════════════

  /** Current validation errors keyed by field path */
  errors: ShallowRef<FieldErrors<FormValues>>
  /** Record of field paths that have been touched (blurred) */
  touchedFields: ShallowRef<Record<string, boolean>>
  /** Record of field paths that differ from default values */
  dirtyFields: ShallowRef<Record<string, boolean>>
  /** Whether the form is currently being submitted */
  isSubmitting: Ref<boolean>
  /** Whether async default values are being loaded */
  isLoading: Ref<boolean>
  /** Number of times the form has been submitted */
  submitCount: Ref<number>
  /** Error that occurred while loading async default values */
  defaultValuesError: Ref<unknown>
  /** Whether the last submission completed successfully */
  isSubmitSuccessful: Ref<boolean>
  /** Set of field paths currently being validated (for isValidating state) */
  validatingFields: ShallowRef<Set<string>>
  /** External errors (e.g., from server) merged with validation errors */
  externalErrors: ShallowRef<FieldErrors<FormValues>>

  // ═══════════════════════════════════════════════════════════════════════════
  // Delayed Error Display
  // ═══════════════════════════════════════════════════════════════════════════

  /** Timers for delayed error display per field */
  errorDelayTimers: Map<string, ReturnType<typeof setTimeout>>
  /** Pending errors waiting for delay timer to complete */
  pendingErrors: Map<string, FieldErrorValue>

  // ═══════════════════════════════════════════════════════════════════════════
  // Field Tracking
  // ═══════════════════════════════════════════════════════════════════════════

  /** DOM element refs for registered uncontrolled fields */
  fieldRefs: Map<string, Ref<HTMLInputElement | null>>
  /** Registration options per field path */
  fieldOptions: Map<string, RegisterOptions>
  /** Field array state for array fields managed by fields() */
  fieldArrays: Map<string, FieldArrayState>
  /** Cached event handlers to prevent recreation on re-render */
  fieldHandlers: Map<string, FieldHandlers>

  // ═══════════════════════════════════════════════════════════════════════════
  // Validation
  // ═══════════════════════════════════════════════════════════════════════════

  /** Debounce timers for custom async validation per field */
  debounceTimers: Map<string, ReturnType<typeof setTimeout>>
  /** Request IDs for canceling stale async validation results */
  validationRequestIds: Map<string, number>
  /** Generation counter incremented on reset to cancel in-flight validations */
  resetGeneration: Ref<number>
  /** O(1) counter for number of dirty fields (avoids Object.keys counting) */
  dirtyFieldCount: Ref<number>
  /** O(1) counter for number of touched fields (avoids Object.keys counting) */
  touchedFieldCount: Ref<number>
  /** Cache of validation results keyed by field path and value hash */
  validationCache: Map<string, { hash: string; isValid: boolean }>
  /** Debounce timers for schema validation per field */
  schemaValidationTimers: Map<string, ReturnType<typeof setTimeout>>
  /** Set of field paths with persistent errors (survive validation cycles) */
  persistentErrorFields: Set<string>

  // ═══════════════════════════════════════════════════════════════════════════
  // Configuration
  // ═══════════════════════════════════════════════════════════════════════════

  /** Whether the entire form is disabled */
  isDisabled: Ref<boolean>
  /** Original options passed to useForm() */
  options: UseFormOptions<ZodType>
}

/**
 * Create a new form context with all reactive state initialized
 */
export function createFormContext<TSchema extends ZodType>(
  options: UseFormOptions<TSchema>,
): FormContext<InferSchema<TSchema>> {
  type FormValues = InferSchema<TSchema>

  // Form data storage
  const formData = reactive<Record<string, unknown>>({})
  const defaultValues = reactive<Record<string, unknown>>({})

  // Check if defaultValues is a function (async) or an object (sync)
  const isAsyncDefaults = typeof options.defaultValues === 'function'
  const isLoading = ref(isAsyncDefaults)

  if (isAsyncDefaults) {
    // Async default values - load them
    const asyncFn = options.defaultValues as () => Promise<Partial<FormValues>>
    asyncFn()
      .then((values) => {
        Object.assign(defaultValues, values)
        Object.assign(formData, values)
        isLoading.value = false
      })
      .catch((error) => {
        console.error('Failed to load async default values:', error)
        defaultValuesError.value = error
        isLoading.value = false
        // Call error callback if provided
        options.onDefaultValuesError?.(error)
      })
  } else if (options.defaultValues) {
    // Sync default values
    Object.assign(defaultValues, options.defaultValues)
    Object.assign(formData, defaultValues)
  }

  // Form state - using Record instead of Set for per-field tracking
  // Use shallowRef for object state to prevent excessive reactivity triggering
  const errors = shallowRef<FieldErrors<FormValues>>({})
  const touchedFields = shallowRef<Record<string, boolean>>({})
  const dirtyFields = shallowRef<Record<string, boolean>>({})
  const isSubmitting = ref(false)
  const submitCount = ref(0)
  const defaultValuesError = ref<unknown>(null)
  const isSubmitSuccessful = ref(false)

  // Validation state tracking - which fields are currently validating (Set for O(1) operations)
  const validatingFields = shallowRef<Set<string>>(new Set())

  // External errors from server/parent
  const externalErrors = shallowRef<FieldErrors<FormValues>>({})

  // Delayed error display tracking
  const errorDelayTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const pendingErrors = new Map<string, FieldErrorValue>()

  // Field registration tracking
  const fieldRefs = new Map<string, Ref<HTMLInputElement | null>>()
  const fieldOptions = new Map<string, RegisterOptions>()

  // Field array tracking for dynamic arrays
  const fieldArrays = new Map<string, FieldArrayState>()

  // Cached event handlers to prevent recreation on every render
  const fieldHandlers = new Map<string, FieldHandlers>()

  // Debounce tracking for async validation
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const validationRequestIds = new Map<string, number>()

  // Reset generation counter (incremented on each reset to invalidate in-flight validations)
  const resetGeneration = ref(0)

  // Performance optimization: O(1) counters for dirty/touched field counts
  const dirtyFieldCount = ref(0)
  const touchedFieldCount = ref(0)

  // Validation cache: skip re-validation when field value hasn't changed
  const validationCache = new Map<string, { hash: string; isValid: boolean }>()

  // Schema validation debounce timers per field (for validationDebounce option)
  const schemaValidationTimers = new Map<string, ReturnType<typeof setTimeout>>()

  // Persistent errors: field names with errors that should not be cleared by validation
  const persistentErrorFields = new Set<string>()

  // Form-wide disabled state (supports MaybeRef)
  const isDisabled = ref(false)
  if (options.disabled !== undefined) {
    const initialDisabled = toValue(options.disabled)
    isDisabled.value = initialDisabled ?? false

    watch(
      () => toValue(options.disabled),
      (newDisabled) => {
        isDisabled.value = newDisabled ?? false
      },
    )
  }

  // Watch external values prop for changes
  if (options.values !== undefined) {
    // Set initial values from prop (if provided and not loading async defaults)
    const initialValues = toValue(options.values)
    if (initialValues && !isAsyncDefaults) {
      for (const [key, value] of Object.entries(initialValues)) {
        if (value !== undefined) {
          set(formData, key, value)
        }
      }
    }

    // Watch for changes - update formData without marking dirty
    watch(
      () => toValue(options.values),
      (newValues) => {
        if (newValues) {
          for (const [key, value] of Object.entries(newValues)) {
            if (value !== undefined) {
              set(formData, key, value)

              // Also update DOM elements for uncontrolled fields
              const fieldRef = fieldRefs.get(key)
              const opts = fieldOptions.get(key)
              if (fieldRef?.value && !opts?.controlled) {
                const el = fieldRef.value
                if (el.type === 'checkbox') {
                  el.checked = value as boolean
                } else {
                  el.value = value as string
                }
              }
            }
          }
        }
      },
      { deep: true },
    )
  }

  // Watch external errors prop for changes
  if (options.errors !== undefined) {
    // Set initial external errors
    const initialErrors = toValue(options.errors)
    if (initialErrors) {
      externalErrors.value = initialErrors as FieldErrors<FormValues>
    }

    // Watch for changes
    watch(
      () => toValue(options.errors),
      (newErrors) => {
        externalErrors.value = (newErrors || {}) as FieldErrors<FormValues>
      },
      { deep: true },
    )
  }

  return {
    formData,
    defaultValues,
    errors,
    touchedFields,
    dirtyFields,
    isSubmitting,
    isLoading,
    submitCount,
    defaultValuesError,
    isSubmitSuccessful,
    validatingFields,
    externalErrors,
    errorDelayTimers,
    pendingErrors,
    fieldRefs,
    fieldOptions,
    fieldArrays,
    fieldHandlers,
    debounceTimers,
    validationRequestIds,
    resetGeneration,
    isDisabled,
    dirtyFieldCount,
    touchedFieldCount,
    validationCache,
    schemaValidationTimers,
    persistentErrorFields,
    options: options as UseFormOptions<ZodType>,
  }
}
