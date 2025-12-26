import { computed, type ComputedRef } from 'vue'
import type { ZodType } from 'zod'
import type {
  UseFormOptions,
  UseFormReturn,
  FormState,
  FieldErrors,
  FieldState,
  ErrorOption,
  SetFocusOptions,
  SetValueOptions,
  ResetOptions,
  ResetFieldOptions,
  InferSchema,
  Path,
  PathValue,
} from './types'
import { get, set } from './utils/paths'
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

  // Create field array manager (pass setFocus for P2 focusOptions feature)
  // Wrap setFocus to accept string instead of Path<FormValues> for field array use
  const setFocusWrapper = (name: string) => setFocus(name as Path<FormValues>)
  const { fields } = createFieldArrayManager<FormValues>(ctx, validate, setFocusWrapper)

  /**
   * Get current form state
   */
  const formState = computed<FormState<FormValues>>(() => {
    // P2: Merge internal validation errors with external errors
    // External errors take precedence (server knows best)
    const mergedErrors = {
      ...ctx.errors.value,
      ...ctx.externalErrors.value,
    } as FieldErrors<FormValues>

    return {
      errors: mergedErrors,
      isDirty: Object.keys(ctx.dirtyFields.value).some((k) => ctx.dirtyFields.value[k]),
      dirtyFields: ctx.dirtyFields.value,
      isValid:
        (ctx.submitCount.value > 0 || Object.keys(ctx.touchedFields.value).length > 0) &&
        Object.keys(mergedErrors).length === 0,
      isSubmitting: ctx.isSubmitting.value,
      isLoading: ctx.isLoading.value,
      // P2: isReady - form initialization complete
      isReady: !ctx.isLoading.value,
      // P2: isValidating - any field is currently being validated
      isValidating: Object.keys(ctx.validatingFields.value).some(
        (k) => ctx.validatingFields.value[k],
      ),
      // P2: validatingFields - which fields are currently validating
      validatingFields: ctx.validatingFields.value,
      touchedFields: ctx.touchedFields.value,
      submitCount: ctx.submitCount.value,
      defaultValuesError: ctx.defaultValuesError.value,
      isSubmitted: ctx.submitCount.value > 0,
      isSubmitSuccessful: ctx.isSubmitSuccessful.value,
    }
  })

  /**
   * Handle form submission
   */
  function handleSubmit(
    onValid: (data: FormValues) => void | Promise<void>,
    onInvalid?: (errors: FieldErrors<FormValues>) => void,
  ) {
    return async (e: Event) => {
      e.preventDefault()

      // Prevent double-submit: ignore if already submitting
      if (ctx.isSubmitting.value) return

      ctx.isSubmitting.value = true
      ctx.submitCount.value++
      ctx.isSubmitSuccessful.value = false

      try {
        // Collect values from uncontrolled inputs
        syncUncontrolledInputs(ctx.fieldRefs, ctx.fieldOptions, ctx.formData)

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
   * Set field value programmatically
   */
  function setValue<TPath extends Path<FormValues>>(
    name: TPath,
    value: PathValue<FormValues, TPath>,
    setValueOptions?: SetValueOptions,
  ): void {
    set(ctx.formData, name, value)

    // shouldDirty (default: true)
    if (setValueOptions?.shouldDirty !== false) {
      markFieldDirty(ctx.dirtyFields, name)
    }

    // shouldTouch (default: false)
    if (setValueOptions?.shouldTouch) {
      markFieldTouched(ctx.touchedFields, name)
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
   * Get field value
   */
  function getValue<TPath extends Path<FormValues>>(
    name: TPath,
  ): PathValue<FormValues, TPath> | undefined {
    return get(ctx.formData, name) as PathValue<FormValues, TPath> | undefined
  }

  /**
   * Reset form to default values
   */
  function reset(values?: Partial<FormValues>, resetOptions?: ResetOptions): void {
    const opts = resetOptions || {}

    // Increment reset generation to invalidate any in-flight validations
    ctx.resetGeneration.value++

    // P2: Clear all pending error timers and validating state
    clearAllPendingErrors()
    ctx.validatingFields.value = {}

    // Update default values unless keepDefaultValues is true
    if (!opts.keepDefaultValues && values) {
      Object.assign(ctx.defaultValues, values)
    }

    // Clear form data
    Object.keys(ctx.formData).forEach((key) => delete ctx.formData[key])

    // Apply new values or defaults (deep clone to prevent reference sharing)
    const sourceValues = values || ctx.defaultValues
    const newValues = JSON.parse(JSON.stringify(sourceValues))
    Object.assign(ctx.formData, newValues)

    // Reset state based on options
    if (!opts.keepErrors) {
      ctx.errors.value = {} as FieldErrors<FormValues>
    }
    if (!opts.keepTouched) {
      ctx.touchedFields.value = {}
    }
    if (!opts.keepDirty) {
      ctx.dirtyFields.value = {}
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
    for (const [name, fieldRef] of ctx.fieldRefs.entries()) {
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
    const opts = resetFieldOptions || {}

    // Increment reset generation to invalidate pending validations
    ctx.resetGeneration.value++

    // P2: Clear error delay timer for this field
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
    const clonedValue = defaultValue !== undefined
      ? JSON.parse(JSON.stringify(defaultValue))
      : undefined
    set(ctx.formData, name, clonedValue)

    // Conditionally clear errors
    if (!opts.keepError) {
      clearFieldErrors(ctx.errors, name)
    }

    // Conditionally clear dirty state
    if (!opts.keepDirty) {
      clearFieldDirty(ctx.dirtyFields, name)
    }

    // Conditionally clear touched state
    if (!opts.keepTouched) {
      clearFieldTouched(ctx.touchedFields, name)
    }

    // Update DOM element for uncontrolled inputs
    const fieldOpts = ctx.fieldOptions.get(name)
    if (!fieldOpts?.controlled) {
      const fieldRef = ctx.fieldRefs.get(name)
      if (fieldRef?.value) {
        updateDomElement(fieldRef.value, clonedValue ?? (fieldRef.value.type === 'checkbox' ? false : ''))
      }
    }
  }

  /**
   * Watch field value(s) reactively
   * @overload Watch all form values
   * @overload Watch a single field
   * @overload Watch multiple fields
   */
  function watch(): ComputedRef<FormValues>
  function watch<TPath extends Path<FormValues>>(name: TPath): ComputedRef<PathValue<FormValues, TPath>>
  function watch<TPath extends Path<FormValues>>(names: TPath[]): ComputedRef<Partial<FormValues>>
  function watch<TPath extends Path<FormValues>>(
    name?: TPath | TPath[],
  ): ComputedRef<FormValues | PathValue<FormValues, TPath> | Partial<FormValues>> {
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

  // ========================================
  // NEW P0/P1 FEATURES
  // ========================================

  /**
   * Clear errors for one or more fields, or all errors
   */
  function clearErrors<TPath extends Path<FormValues>>(name?: TPath | TPath[]): void {
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
    const errorValue = error.type
      ? { type: error.type, message: error.message }
      : error.message

    set(newErrors, name, errorValue)
    ctx.errors.value = newErrors as FieldErrors<FormValues>
  }

  /**
   * Get form values - all values, single field, or multiple fields
   */
  function getValues(): FormValues
  function getValues<TPath extends Path<FormValues>>(name: TPath): PathValue<FormValues, TPath>
  function getValues<TPath extends Path<FormValues>>(names: TPath[]): Partial<FormValues>
  function getValues<TPath extends Path<FormValues>>(
    nameOrNames?: TPath | TPath[],
  ): FormValues | PathValue<FormValues, TPath> | Partial<FormValues> {
    // Sync values from uncontrolled inputs before returning
    syncUncontrolledInputs(ctx.fieldRefs, ctx.fieldOptions, ctx.formData)

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
    const error = get(ctx.errors.value, name) as string | { type: string; message: string } | undefined
    return {
      isDirty: ctx.dirtyFields.value[name] === true,
      isTouched: ctx.touchedFields.value[name] === true,
      invalid: error !== undefined && error !== null,
      error,
    }
  }

  /**
   * Manually trigger validation for specific fields or entire form
   */
  async function trigger<TPath extends Path<FormValues>>(
    name?: TPath | TPath[],
  ): Promise<boolean> {
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
    getValue,
    reset,
    resetField,
    watch,
    validate,
    clearErrors,
    setError,
    getValues,
    getFieldState,
    trigger,
    setFocus,
  } as UseFormReturn<TSchema>
}
