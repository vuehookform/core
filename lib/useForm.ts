import { computed, reactive, type ComputedRef } from 'vue'
import type { ZodType } from 'zod'
import type {
  UseFormOptions,
  UseFormReturn,
  FormState,
  FieldErrors,
  FieldErrorValue,
  FieldState,
  ErrorOption,
  SetFocusOptions,
  SetValueOptions,
  ResetOptions,
  ResetFieldOptions,
  InferSchema,
  Path,
  PathValue,
  SetErrorsOptions,
} from './types'
import { get, set } from './utils/paths'
import { deepClone } from './utils/clone'
import {
  __DEV__,
  validatePathSyntax,
  validatePathAgainstSchema,
  warnInvalidPath,
  warnPathNotInSchema,
} from './utils/devWarnings'
import { createFormContext } from './core/formContext'
import { createValidation } from './core/useValidation'
import { createFieldRegistration } from './core/useFieldRegistration'
import { createFieldArrayManager } from './core/useFieldArray'
import { syncUncontrolledInputs, updateDomElement } from './core/domSync'
import {
  markFieldDirty,
  markFieldTouched,
  clearFieldDirty,
  clearFieldTouched,
  clearFieldErrors,
} from './core/fieldState'

/**
 * Main form management composable
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   email: z.email(),
 *   name: z.string().min(2)
 * })
 *
 * const { register, handleSubmit, formState } = useForm({ schema })
 *
 * const onSubmit = (data) => {
 *   console.log(data) // { email: '...', name: '...' }
 * }
 * ```
 */
export function useForm<TSchema extends ZodType>(
  options: UseFormOptions<TSchema>,
): UseFormReturn<TSchema> {
  type FormValues = InferSchema<TSchema>

  // Create shared context with all reactive state
  const ctx = createFormContext(options)

  // Create validation functions
  const { validate, clearAllPendingErrors } = createValidation<FormValues>(ctx)

  // Create field registration functions
  const { register, unregister } = createFieldRegistration<FormValues>(ctx, validate)

  // Define setFocus early so it can be passed to field array manager
  function setFocus<TPath extends Path<FormValues>>(
    name: TPath,
    focusOptions?: SetFocusOptions,
  ): void {
    // Dev-mode path validation
    if (__DEV__) {
      const syntaxError = validatePathSyntax(name)
      if (syntaxError) {
        warnInvalidPath('setFocus', name, syntaxError)
      } else {
        const schemaResult = validatePathAgainstSchema(ctx.options.schema, name)
        if (!schemaResult.valid) {
          warnPathNotInSchema('setFocus', name, schemaResult.availableFields)
        }
      }
    }

    const fieldRef = ctx.fieldRefs.get(name)

    if (!fieldRef?.value) {
      return
    }

    const el = fieldRef.value

    // Check if element is focusable
    if (typeof el.focus === 'function') {
      el.focus()

      // Select text if requested and element supports selection
      if (
        focusOptions?.shouldSelect &&
        el instanceof HTMLInputElement &&
        typeof el.select === 'function'
      ) {
        el.select()
      }
    }
  }

  // Create field array manager (pass setFocus for focusOptions feature)
  // Wrap setFocus to accept string instead of Path<FormValues> for field array use
  const setFocusWrapper = (name: string) => setFocus(name as Path<FormValues>)
  const { fields } = createFieldArrayManager<FormValues>(ctx, validate, setFocusWrapper)

  // Track last sync time to avoid redundant DOM syncs
  let lastSyncTime = 0
  const SYNC_DEBOUNCE_MS = 16 // ~1 frame

  /**
   * Sync uncontrolled inputs with debounce to avoid redundant syncs.
   * If called multiple times within SYNC_DEBOUNCE_MS, only the first call syncs.
   */
  function syncWithDebounce(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (now - lastSyncTime < SYNC_DEBOUNCE_MS) {
      return // Skip - synced recently
    }
    syncUncontrolledInputs(ctx.fieldRefs, ctx.fieldOptions, ctx.formData)
    lastSyncTime = now
  }

  /**
   * Get merged errors (internal validation + external/server errors)
   * External errors take precedence (server knows best)
   * Memoized to avoid creating new objects when inputs haven't changed.
   */
  let lastErrors = ctx.errors.value
  let lastExternalErrors = ctx.externalErrors.value
  let cachedMergedErrors: FieldErrors<FormValues> | null = null

  function getMergedErrors(): FieldErrors<FormValues> {
    // Return cached result if inputs haven't changed (reference equality)
    if (
      cachedMergedErrors !== null &&
      lastErrors === ctx.errors.value &&
      lastExternalErrors === ctx.externalErrors.value
    ) {
      return cachedMergedErrors
    }

    // Update cache
    lastErrors = ctx.errors.value
    lastExternalErrors = ctx.externalErrors.value
    cachedMergedErrors = {
      ...ctx.errors.value,
      ...ctx.externalErrors.value,
    } as FieldErrors<FormValues>

    return cachedMergedErrors
  }

  // --- Granular computed properties for optimized reactivity ---
  // Each property is computed individually, then composed into formState
  // This provides stable object reference and granular dependency tracking

  // O(1) isDirty computation using counter instead of O(n) key scan
  const isDirtyComputed = computed(() => ctx.dirtyFieldCount.value > 0)

  // Memoized merged errors (internal + external)
  const errorsComputed = computed<FieldErrors<FormValues>>(() => getMergedErrors())

  // isValid: only true after interaction AND no errors
  const isValidComputed = computed(() => {
    const hasInteraction = ctx.submitCount.value > 0 || ctx.touchedFieldCount.value > 0
    if (!hasInteraction) return false
    return Object.keys(errorsComputed.value).length === 0
  })

  // isReady: form initialization complete (async defaults loaded)
  const isReadyComputed = computed(() => !ctx.isLoading.value)

  // isValidating: O(1) check with Set
  const isValidatingComputed = computed(() => ctx.validatingFields.value.size > 0)

  // isSubmitted: at least one submission attempt
  const isSubmittedComputed = computed(() => ctx.submitCount.value > 0)

  /**
   * Get current form state
   * Uses reactive object with getters for:
   * - Stable object reference (same instance)
   * - Lazy evaluation via getters
   * - Granular dependency tracking
   * - Full backward compatibility
   */
  const formStateInternal = reactive({
    get errors() {
      return errorsComputed.value
    },
    get isDirty() {
      return isDirtyComputed.value
    },
    get dirtyFields() {
      return ctx.dirtyFields.value
    },
    get isValid() {
      return isValidComputed.value
    },
    get isSubmitting() {
      return ctx.isSubmitting.value
    },
    get isLoading() {
      return ctx.isLoading.value
    },
    get isReady() {
      return isReadyComputed.value
    },
    get isValidating() {
      return isValidatingComputed.value
    },
    get validatingFields() {
      return ctx.validatingFields.value
    },
    get touchedFields() {
      return ctx.touchedFields.value
    },
    get submitCount() {
      return ctx.submitCount.value
    },
    get defaultValuesError() {
      return ctx.defaultValuesError.value
    },
    get isSubmitted() {
      return isSubmittedComputed.value
    },
    get isSubmitSuccessful() {
      return ctx.isSubmitSuccessful.value
    },
    get disabled() {
      return ctx.isDisabled.value
    },
  }) as FormState<FormValues>

  // Wrap in computed for backward compatibility with formState.value access pattern
  const formState = computed<FormState<FormValues>>(() => formStateInternal)

  /**
   * Handle form submission
   */
  function handleSubmit(
    onValid: (data: FormValues) => void | Promise<void>,
    onInvalid?: (errors: FieldErrors<FormValues>) => void,
  ) {
    return async (e: Event) => {
      e.preventDefault()

      // Prevent submission if form is disabled
      if (ctx.isDisabled.value) return

      // Prevent double-submit: ignore if already submitting
      if (ctx.isSubmitting.value) return

      ctx.isSubmitting.value = true
      ctx.submitCount.value++
      ctx.isSubmitSuccessful.value = false

      try {
        // Collect values from uncontrolled inputs (debounced)
        syncWithDebounce()

        // Validate entire form
        const isValid = await validate()

        if (isValid) {
          // Call success handler with validated data
          await onValid(ctx.formData as FormValues)
          ctx.isSubmitSuccessful.value = true
        } else {
          // Call error handler if provided (use merged errors from formState)
          onInvalid?.(formState.value.errors)

          // Focus first error field if shouldFocusError is enabled (default: true)
          if (options.shouldFocusError !== false) {
            const firstErrorField = Object.keys(formState.value.errors)[0]
            if (firstErrorField) {
              setFocus(firstErrorField as Path<FormValues>)
            }
          }
        }
      } finally {
        ctx.isSubmitting.value = false
      }
    }
  }

  /**
   * Set a field value programmatically. Supports nested paths and
   * optional validation/dirty/touched behavior control.
   *
   * @param name - Field path (e.g., 'email' or 'user.address.city')
   * @param value - New value (typed based on path)
   * @param options - Control side effects (validation, dirty, touched)
   *
   * @example Basic usage - sets value and marks dirty (default)
   * ```ts
   * setValue('email', 'user@example.com')
   * // Equivalent to: setValue('email', '...', { shouldDirty: true })
   * ```
   *
   * @example Set value from API without marking dirty
   * ```ts
   * // When populating from server data, don't mark as user-changed
   * setValue('email', serverData.email, { shouldDirty: false })
   * ```
   *
   * @example Set value and immediately validate
   * ```ts
   * setValue('quantity', newQty, { shouldValidate: true })
   * // Useful for fields that affect other validations
   * ```
   *
   * @example Set value and mark as touched
   * ```ts
   * setValue('terms', true, { shouldTouch: true })
   * // Simulates user interaction with the field
   * ```
   *
   * @example Set nested array item value
   * ```ts
   * setValue('addresses.0.city', 'New York')
   * setValue(`addresses.${index}.zipCode`, '10001')
   * ```
   *
   * @see reset - Reset entire form to default values
   * @see resetField - Reset a single field to its default
   */
  function setValue<TPath extends Path<FormValues>>(
    name: TPath,
    value: PathValue<FormValues, TPath>,
    setValueOptions?: SetValueOptions,
  ): void {
    // Dev-mode path validation
    if (__DEV__) {
      const syntaxError = validatePathSyntax(name)
      if (syntaxError) {
        warnInvalidPath('setValue', name, syntaxError)
      } else {
        const schemaResult = validatePathAgainstSchema(ctx.options.schema, name)
        if (!schemaResult.valid) {
          warnPathNotInSchema('setValue', name, schemaResult.availableFields)
        }
      }
    }

    set(ctx.formData, name, value)

    // shouldDirty (default: true)
    if (setValueOptions?.shouldDirty !== false) {
      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)
    }

    // shouldTouch (default: false)
    if (setValueOptions?.shouldTouch) {
      markFieldTouched(ctx.touchedFields, ctx.touchedFieldCount, name)
    }

    // Only update DOM element for uncontrolled inputs
    // For controlled inputs, Vue reactivity handles the sync through v-model
    const opts = ctx.fieldOptions.get(name)
    if (!opts?.controlled) {
      const fieldRef = ctx.fieldRefs.get(name)
      if (fieldRef?.value) {
        updateDomElement(fieldRef.value, value)
      }
    }

    // shouldValidate (default: false)
    if (setValueOptions?.shouldValidate) {
      validate(name)
    }
  }

  /**
   * Reset form to default values
   */
  function reset(values?: Partial<FormValues>, resetOptions?: ResetOptions): void {
    const opts = resetOptions || {}

    // Increment reset generation to invalidate any in-flight validations
    ctx.resetGeneration.value++

    // Clear all pending error timers and validating state
    clearAllPendingErrors()
    ctx.validatingFields.value = new Set()

    // Clear validation cache (values are being reset)
    ctx.validationCache.clear()

    // Clear any pending schema validation debounce timers
    for (const timer of ctx.schemaValidationTimers.values()) {
      clearTimeout(timer)
    }
    ctx.schemaValidationTimers.clear()

    // Update default values unless keepDefaultValues is true
    if (!opts.keepDefaultValues && values) {
      Object.assign(ctx.defaultValues, values)
    }

    // Clear form data
    Object.keys(ctx.formData).forEach((key) => delete ctx.formData[key])

    // Apply new values or defaults (deep clone to prevent reference sharing)
    const sourceValues = values || ctx.defaultValues
    const newValues = deepClone(sourceValues)
    Object.assign(ctx.formData, newValues)

    // Reset state based on options
    if (!opts.keepErrors) {
      ctx.errors.value = {} as FieldErrors<FormValues>
    }
    if (!opts.keepTouched) {
      ctx.touchedFields.value = {}
      ctx.touchedFieldCount.value = 0
    }
    if (!opts.keepDirty) {
      ctx.dirtyFields.value = {}
      ctx.dirtyFieldCount.value = 0
    }
    if (!opts.keepSubmitCount) {
      ctx.submitCount.value = 0
    }
    if (!opts.keepIsSubmitting) {
      ctx.isSubmitting.value = false
    }
    if (!opts.keepIsSubmitSuccessful) {
      ctx.isSubmitSuccessful.value = false
    }

    // Always clear field arrays (they'll be recreated on next access)
    ctx.fieldArrays.clear()

    // Update input elements
    for (const [name, fieldRef] of Array.from(ctx.fieldRefs.entries())) {
      const el = fieldRef.value
      if (el) {
        const value = get(newValues as Record<string, unknown>, name)
        if (value !== undefined) {
          if (el.type === 'checkbox') {
            el.checked = value as boolean
          } else {
            el.value = value as string
          }
        }
      }
    }
  }

  /**
   * Reset an individual field to its default value
   */
  function resetField<TPath extends Path<FormValues>>(
    name: TPath,
    resetFieldOptions?: ResetFieldOptions,
  ): void {
    // Dev-mode path validation
    if (__DEV__) {
      const syntaxError = validatePathSyntax(name)
      if (syntaxError) {
        warnInvalidPath('resetField', name, syntaxError)
      } else {
        const schemaResult = validatePathAgainstSchema(ctx.options.schema, name)
        if (!schemaResult.valid) {
          warnPathNotInSchema('resetField', name, schemaResult.availableFields)
        }
      }
    }

    const opts = resetFieldOptions || {}

    // Increment reset generation to invalidate pending validations
    ctx.resetGeneration.value++

    // Clear error delay timer for this field
    const errorTimer = ctx.errorDelayTimers.get(name)
    if (errorTimer) {
      clearTimeout(errorTimer)
      ctx.errorDelayTimers.delete(name)
    }
    ctx.pendingErrors.delete(name)

    // Get default value (use provided or stored default)
    let defaultValue = opts.defaultValue
    if (defaultValue === undefined) {
      defaultValue = get(ctx.defaultValues, name)
    } else {
      // Update stored default if new one provided
      set(ctx.defaultValues, name, defaultValue)
    }

    // Update form data (deep clone to prevent reference sharing)
    const clonedValue = defaultValue !== undefined ? deepClone(defaultValue) : undefined
    set(ctx.formData, name, clonedValue)

    // Conditionally clear errors
    if (!opts.keepError) {
      clearFieldErrors(ctx.errors, name)
    }

    // Conditionally clear dirty state
    if (!opts.keepDirty) {
      clearFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)
    }

    // Conditionally clear touched state
    if (!opts.keepTouched) {
      clearFieldTouched(ctx.touchedFields, ctx.touchedFieldCount, name)
    }

    // Update DOM element for uncontrolled inputs
    const fieldOpts = ctx.fieldOptions.get(name)
    if (!fieldOpts?.controlled) {
      const fieldRef = ctx.fieldRefs.get(name)
      if (fieldRef?.value) {
        updateDomElement(
          fieldRef.value,
          clonedValue ?? (fieldRef.value.type === 'checkbox' ? false : ''),
        )
      }
    }
  }

  /**
   * Watch field value(s) reactively. Returns a ComputedRef that updates
   * whenever the watched field(s) change.
   *
   * @overload Watch all form values
   * @returns ComputedRef containing all form values
   *
   * @example Watch all values for debugging or live preview
   * ```ts
   * const allValues = watch()
   * // In template: {{ allValues.value }}
   * // Returns: { email: 'user@example.com', name: 'John', addresses: [...] }
   * ```
   *
   * @overload Watch a single field
   * @param name - Field path (e.g., 'email' or 'user.address.city')
   * @returns ComputedRef containing the field's current value
   *
   * @example Watch single field for conditional UI
   * ```ts
   * const accountType = watch('accountType')
   *
   * // In template:
   * // <div v-if="accountType.value === 'business'">
   * //   <BusinessFields />
   * // </div>
   * ```
   *
   * @example Watch nested field
   * ```ts
   * const city = watch('user.address.city')
   * console.log(city.value) // 'New York'
   * ```
   *
   * @overload Watch multiple fields
   * @param names - Array of field paths
   * @returns ComputedRef containing an object with the watched fields
   *
   * @example Watch multiple fields for computed values
   * ```ts
   * const priceFields = watch(['quantity', 'price'])
   *
   * const total = computed(() => {
   *   const q = Number(priceFields.value.quantity) || 0
   *   const p = Number(priceFields.value.price) || 0
   *   return (q * p).toFixed(2)
   * })
   * ```
   *
   * @see useWatch - Standalone composable for watching from child components
   */
  function watch(): ComputedRef<FormValues>
  function watch<TPath extends Path<FormValues>>(
    name: TPath,
  ): ComputedRef<PathValue<FormValues, TPath>>
  function watch<TPath extends Path<FormValues>>(names: TPath[]): ComputedRef<Partial<FormValues>>
  function watch<TPath extends Path<FormValues>>(
    name?: TPath | TPath[],
  ): ComputedRef<FormValues | PathValue<FormValues, TPath> | Partial<FormValues>> {
    // Dev-mode path validation
    if (__DEV__ && name) {
      const names = Array.isArray(name) ? name : [name]
      for (const n of names) {
        const syntaxError = validatePathSyntax(n)
        if (syntaxError) {
          warnInvalidPath('watch', n, syntaxError)
        } else {
          const schemaResult = validatePathAgainstSchema(ctx.options.schema, n)
          if (!schemaResult.valid) {
            warnPathNotInSchema('watch', n, schemaResult.availableFields)
          }
        }
      }
    }

    return computed(() => {
      if (!name) {
        return ctx.formData as FormValues
      }
      if (Array.isArray(name)) {
        const result: Record<string, unknown> = {}
        for (const n of name) {
          result[n] = get(ctx.formData, n)
        }
        return result as Partial<FormValues>
      }
      return get(ctx.formData, name) as PathValue<FormValues, TPath>
    })
  }

  /**
   * Clear errors for one or more fields, or all errors
   */
  function clearErrors<TPath extends Path<FormValues>>(
    name?: TPath | TPath[] | 'root' | `root.${string}`,
  ): void {
    // Dev-mode path validation (skip for 'root' paths)
    if (__DEV__ && name && !String(name).startsWith('root')) {
      const names = Array.isArray(name) ? name : [name]
      for (const n of names) {
        if (String(n).startsWith('root')) continue
        const syntaxError = validatePathSyntax(n)
        if (syntaxError) {
          warnInvalidPath('clearErrors', n, syntaxError)
        } else {
          const schemaResult = validatePathAgainstSchema(ctx.options.schema, n)
          if (!schemaResult.valid) {
            warnPathNotInSchema('clearErrors', n, schemaResult.availableFields)
          }
        }
      }
    }

    if (name === undefined) {
      // Clear all errors
      ctx.errors.value = {} as FieldErrors<FormValues>
      return
    }

    const fieldsToClean = Array.isArray(name) ? name : [name]
    for (const field of fieldsToClean) {
      clearFieldErrors(ctx.errors, field)
    }
  }

  /**
   * Programmatically set an error for a field
   * Supports both simple string errors (backward compatible) and structured FieldError objects
   */
  function setError<TPath extends Path<FormValues>>(
    name: TPath | 'root' | `root.${string}`,
    error: ErrorOption,
  ): void {
    const newErrors = { ...ctx.errors.value }

    // Create structured error if type is provided, otherwise use string for backward compatibility
    const errorValue = error.type ? { type: error.type, message: error.message } : error.message

    set(newErrors, name, errorValue)
    ctx.errors.value = newErrors as FieldErrors<FormValues>
  }

  /**
   * Set multiple errors at once
   */
  function setErrors<TPath extends Path<FormValues>>(
    errors: Partial<Record<TPath | 'root' | `root.${string}`, string | ErrorOption>>,
    options?: SetErrorsOptions,
  ): void {
    // Start with empty object if replacing, otherwise preserve existing
    const newErrors = options?.shouldReplace ? {} : { ...ctx.errors.value }

    // Iterate over provided errors and apply them
    for (const [name, error] of Object.entries(errors)) {
      if (error === undefined) continue

      // Handle both string and ErrorOption formats
      const errorValue =
        typeof error === 'string'
          ? error
          : (error as ErrorOption).type
            ? { type: (error as ErrorOption).type, message: (error as ErrorOption).message }
            : (error as ErrorOption).message

      set(newErrors, name, errorValue)
    }

    ctx.errors.value = newErrors as FieldErrors<FormValues>
  }

  /**
   * Check if form or specific field has errors
   */
  function hasErrors<TPath extends Path<FormValues>>(
    fieldPath?: TPath | 'root' | `root.${string}`,
  ): boolean {
    const mergedErrors = getMergedErrors()

    if (fieldPath === undefined) {
      // Check if form has any errors
      return Object.keys(mergedErrors).length > 0
    }

    // Check specific field - use get() for nested path support
    const error = get(mergedErrors, fieldPath)
    return error !== undefined && error !== null
  }

  /**
   * Get errors for form or specific field
   */
  function getErrors(): FieldErrors<FormValues>
  function getErrors<TPath extends Path<FormValues>>(
    fieldPath: TPath | 'root' | `root.${string}`,
  ): FieldErrorValue | undefined
  function getErrors<TPath extends Path<FormValues>>(
    fieldPath?: TPath | 'root' | `root.${string}`,
  ): FieldErrors<FormValues> | FieldErrorValue | undefined {
    const mergedErrors = getMergedErrors()

    if (fieldPath === undefined) {
      // Return all errors
      return mergedErrors
    }

    // Return specific field error
    return get(mergedErrors, fieldPath) as FieldErrorValue | undefined
  }

  /**
   * Get current form values synchronously. For uncontrolled inputs,
   * this syncs DOM values before returning.
   *
   * @overload Get all form values
   * @returns Complete form data object (deep copy)
   *
   * @example Get all values for logging or API call
   * ```ts
   * const allData = getValues()
   * console.log(allData) // { email: '...', name: '...', addresses: [...] }
   * await api.saveDraft(allData)
   * ```
   *
   * @overload Get a single field value
   * @param name - Field path
   * @returns The field's current value (typed based on path)
   *
   * @example Get specific field value
   * ```ts
   * const email = getValues('email') // string
   * const city = getValues('addresses.0.city') // string
   * ```
   *
   * @overload Get multiple field values
   * @param names - Array of field paths
   * @returns Partial object containing only the requested fields
   *
   * @example Get subset of values
   * ```ts
   * const { email, name } = getValues(['email', 'name'])
   * // Returns: { email: '...', name: '...' }
   * ```
   *
   * @example Copy values between field groups
   * ```ts
   * // Copy shipping address to billing
   * const shipping = getValues(['shipping.street', 'shipping.city', 'shipping.zip'])
   * setValue('billing.street', getValues('shipping.street'))
   * setValue('billing.city', getValues('shipping.city'))
   * ```
   *
   * @see watch - For reactive value subscriptions
   * @see getFieldState - For field metadata (dirty, touched, error)
   */
  function getValues(): FormValues
  function getValues<TPath extends Path<FormValues>>(name: TPath): PathValue<FormValues, TPath>
  function getValues<TPath extends Path<FormValues>>(names: TPath[]): Partial<FormValues>
  function getValues<TPath extends Path<FormValues>>(
    nameOrNames?: TPath | TPath[],
  ): FormValues | PathValue<FormValues, TPath> | Partial<FormValues> {
    // Dev-mode path validation
    if (__DEV__ && nameOrNames) {
      const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames]
      for (const n of names) {
        const syntaxError = validatePathSyntax(n)
        if (syntaxError) {
          warnInvalidPath('getValues', n, syntaxError)
        } else {
          const schemaResult = validatePathAgainstSchema(ctx.options.schema, n)
          if (!schemaResult.valid) {
            warnPathNotInSchema('getValues', n, schemaResult.availableFields)
          }
        }
      }
    }

    // Sync values from uncontrolled inputs before returning (debounced)
    syncWithDebounce()

    if (nameOrNames === undefined) {
      // Return all values
      return { ...ctx.formData } as FormValues
    }

    if (Array.isArray(nameOrNames)) {
      // Return multiple field values
      const result: Record<string, unknown> = {}
      for (const fieldName of nameOrNames) {
        result[fieldName] = get(ctx.formData, fieldName)
      }
      return result as Partial<FormValues>
    }

    // Return single field value
    return get(ctx.formData, nameOrNames) as PathValue<FormValues, TPath>
  }

  /**
   * Get the state of an individual field
   */
  function getFieldState<TPath extends Path<FormValues>>(name: TPath): FieldState {
    // Dev-mode path validation
    if (__DEV__) {
      const syntaxError = validatePathSyntax(name)
      if (syntaxError) {
        warnInvalidPath('getFieldState', name, syntaxError)
      } else {
        const schemaResult = validatePathAgainstSchema(ctx.options.schema, name)
        if (!schemaResult.valid) {
          warnPathNotInSchema('getFieldState', name, schemaResult.availableFields)
        }
      }
    }

    const error = get(ctx.errors.value, name) as
      | string
      | { type: string; message: string }
      | undefined
    return {
      isDirty: ctx.dirtyFields.value[name] === true,
      isTouched: ctx.touchedFields.value[name] === true,
      invalid: error !== undefined && error !== null,
      error,
    }
  }

  /**
   * Manually trigger validation for specific fields or the entire form.
   * Useful for validating before certain actions or in wizard-style forms.
   *
   * @param name - Optional field path or array of paths. Validates all if omitted.
   * @returns Promise resolving to true if valid, false if errors exist
   *
   * @example Validate entire form before a custom action
   * ```ts
   * async function saveAsDraft() {
   *   const isValid = await trigger()
   *   if (isValid) {
   *     await api.saveDraft(getValues())
   *   } else {
   *     console.log('Please fix errors before saving')
   *   }
   * }
   * ```
   *
   * @example Validate specific field on custom event
   * ```ts
   * async function onUsernameBlur() {
   *   const isValid = await trigger('username')
   *   if (isValid) {
   *     // Check username availability
   *     const available = await api.checkUsername(getValues('username'))
   *     if (!available) {
   *       setError('username', { message: 'Username already taken' })
   *     }
   *   }
   * }
   * ```
   *
   * @example Validate step fields in multi-step form
   * ```ts
   * async function nextStep() {
   *   // Validate only current step's fields
   *   const stepFields = ['firstName', 'lastName', 'email']
   *   const isValid = await trigger(stepFields)
   *   if (isValid) {
   *     currentStep.value++
   *   }
   * }
   * ```
   *
   * @example Validate all addresses in array
   * ```ts
   * const addressCount = getValues('addresses').length
   * const addressFields = Array.from({ length: addressCount }, (_, i) => [
   *   `addresses.${i}.street`,
   *   `addresses.${i}.city`,
   *   `addresses.${i}.zip`
   * ]).flat()
   * const addressesValid = await trigger(addressFields)
   * ```
   */
  async function trigger<TPath extends Path<FormValues>>(name?: TPath | TPath[]): Promise<boolean> {
    // Dev-mode path validation
    if (__DEV__ && name) {
      const names = Array.isArray(name) ? name : [name]
      for (const n of names) {
        const syntaxError = validatePathSyntax(n)
        if (syntaxError) {
          warnInvalidPath('trigger', n, syntaxError)
        } else {
          const schemaResult = validatePathAgainstSchema(ctx.options.schema, n)
          if (!schemaResult.valid) {
            warnPathNotInSchema('trigger', n, schemaResult.availableFields)
          }
        }
      }
    }

    if (name === undefined) {
      // Validate entire form
      return await validate()
    }

    if (Array.isArray(name)) {
      // Validate multiple fields
      let allValid = true
      for (const fieldName of name) {
        const isValid = await validate(fieldName)
        if (!isValid) {
          allValid = false
        }
      }
      return allValid
    }

    // Validate single field
    return await validate(name)
  }

  // Type assertion needed because internal implementations use simpler types
  // but the public API provides full generic type safety
  return {
    register,
    unregister,
    handleSubmit,
    formState,
    fields,
    setValue,
    reset,
    resetField,
    watch,
    validate,
    clearErrors,
    setError,
    setErrors,
    hasErrors,
    getErrors,
    getValues,
    getFieldState,
    trigger,
    setFocus,
  } as UseFormReturn<TSchema>
}
