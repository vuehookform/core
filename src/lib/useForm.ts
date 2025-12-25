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
  ResetOptions,
  InferSchema,
  Path,
  PathValue,
} from './types'
import { get, set } from './utils/paths'
import { createFormContext } from './core/formContext'
import { createValidation } from './core/useValidation'
import { createFieldRegistration } from './core/useFieldRegistration'
import { createFieldArrayManager } from './core/useFieldArray'

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
  const { validate } = createValidation<FormValues>(ctx)

  // Create field registration functions
  const { register, unregister } = createFieldRegistration<FormValues>(ctx, validate)

  // Create field array manager
  const { fields } = createFieldArrayManager<FormValues>(ctx, validate)

  /**
   * Get current form state
   */
  const formState = computed<FormState<FormValues>>(() => ({
    errors: ctx.errors.value,
    isDirty: Object.keys(ctx.dirtyFields.value).some((k) => ctx.dirtyFields.value[k]),
    dirtyFields: ctx.dirtyFields.value,
    isValid:
      (ctx.submitCount.value > 0 || Object.keys(ctx.touchedFields.value).length > 0) &&
      Object.keys(ctx.errors.value).length === 0,
    isSubmitting: ctx.isSubmitting.value,
    isLoading: ctx.isLoading.value,
    touchedFields: ctx.touchedFields.value,
    submitCount: ctx.submitCount.value,
    defaultValuesError: ctx.defaultValuesError.value,
  }))

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

      try {
        // Collect values from uncontrolled inputs
        for (const [name, fieldRef] of ctx.fieldRefs.entries()) {
          const el = fieldRef.value
          if (el) {
            const opts = ctx.fieldOptions.get(name)
            if (!opts?.controlled) {
              const value = el.type === 'checkbox' ? el.checked : el.value
              set(ctx.formData, name, value)
            }
          }
        }

        // Validate entire form
        const isValid = await validate()

        if (isValid) {
          // Call success handler with validated data
          await onValid(ctx.formData as FormValues)
        } else {
          // Call error handler if provided
          onInvalid?.(ctx.errors.value)
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
  ): void {
    set(ctx.formData, name, value)
    ctx.dirtyFields.value = { ...ctx.dirtyFields.value, [name]: true }

    // Only update DOM element for uncontrolled inputs
    // For controlled inputs, Vue reactivity handles the sync through v-model
    const opts = ctx.fieldOptions.get(name)
    if (!opts?.controlled) {
      const fieldRef = ctx.fieldRefs.get(name)
      if (fieldRef?.value) {
        const el = fieldRef.value
        if (el.type === 'checkbox') {
          el.checked = value as boolean
        } else {
          el.value = value as string
        }
      }
    }

    // Validate if needed
    if (options.mode === 'onChange' || ctx.touchedFields.value[name]) {
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
    const newErrors = { ...ctx.errors.value }

    for (const field of fieldsToClean) {
      // Clear exact path and any nested paths
      for (const key of Object.keys(newErrors)) {
        if (key === field || key.startsWith(`${field}.`)) {
          delete newErrors[key as keyof typeof newErrors]
        }
      }
    }

    ctx.errors.value = newErrors as FieldErrors<FormValues>
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
    for (const [name, fieldRef] of ctx.fieldRefs.entries()) {
      const el = fieldRef.value
      if (el) {
        const opts = ctx.fieldOptions.get(name)
        if (!opts?.controlled) {
          const value = el.type === 'checkbox' ? el.checked : el.value
          set(ctx.formData, name, value)
        }
      }
    }

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

  /**
   * Programmatically focus a field
   */
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

  return {
    register,
    unregister,
    handleSubmit,
    formState,
    fields,
    setValue,
    getValue,
    reset,
    watch,
    validate,
    clearErrors,
    setError,
    getValues,
    getFieldState,
    trigger,
    setFocus,
  }
}
