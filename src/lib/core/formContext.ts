import { reactive, ref, shallowRef, type Ref, type ShallowRef } from 'vue'
import type { ZodType } from 'zod'
import type {
  UseFormOptions,
  FieldErrors,
  InferSchema,
  RegisterOptions,
  FieldArrayItem,
} from '../types'

/**
 * Internal state for field array management
 */
export interface FieldArrayState {
  items: Ref<FieldArrayItem[]>
  values: unknown[]
  // Index cache for O(1) index lookups, shared across fields() calls
  indexCache: Map<string, number>
}

/**
 * Cached event handlers for a field to prevent recreation on every render
 */
export interface FieldHandlers {
  onInput: (e: Event) => Promise<void>
  onBlur: (e: Event) => Promise<void>
  refCallback: (el: unknown) => void
}

/**
 * Shared form context containing all reactive state
 * This is passed to sub-modules via dependency injection
 */
export interface FormContext<FormValues> {
  // Reactive form data
  formData: Record<string, unknown>
  defaultValues: Record<string, unknown>

  // Form state
  errors: ShallowRef<FieldErrors<FormValues>>
  touchedFields: ShallowRef<Record<string, boolean>>
  dirtyFields: ShallowRef<Record<string, boolean>>
  isSubmitting: Ref<boolean>
  isLoading: Ref<boolean>
  submitCount: Ref<number>
  defaultValuesError: Ref<unknown>

  // Field tracking
  fieldRefs: Map<string, Ref<HTMLInputElement | null>>
  fieldOptions: Map<string, RegisterOptions>
  fieldArrays: Map<string, FieldArrayState>
  fieldHandlers: Map<string, FieldHandlers>

  // Debounce tracking for async validation
  debounceTimers: Map<string, ReturnType<typeof setTimeout>>
  validationRequestIds: Map<string, number>

  // Reset generation counter (used to cancel stale validations after reset)
  resetGeneration: Ref<number>

  // Options
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
    fieldRefs,
    fieldOptions,
    fieldArrays,
    fieldHandlers,
    debounceTimers,
    validationRequestIds,
    resetGeneration,
    options: options as UseFormOptions<ZodType>,
  }
}
