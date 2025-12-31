import type { FormContext } from './formContext'
import type { FieldErrors, FieldError, FieldErrorValue, CriteriaMode } from '../types'
import { get, set } from '../utils/paths'
import { hashValue } from '../utils/hash'
import { analyzeSchemaPath } from '../utils/schemaExtract'

/**
 * Helper to clear errors for a specific field path and its children
 */
function clearFieldErrors<T>(errors: FieldErrors<T>, fieldPath: string): FieldErrors<T> {
  const newErrors = { ...errors }
  for (const key of Object.keys(newErrors)) {
    if (key === fieldPath || key.startsWith(`${fieldPath}.`)) {
      delete newErrors[key as keyof typeof newErrors]
    }
  }
  return newErrors as FieldErrors<T>
}

/**
 * Helper to mark a field as validating.
 * Uses Set<string> for O(1) add/delete operations without object spreading.
 */
function setValidating<T>(ctx: FormContext<T>, fieldPath: string, isValidating: boolean): void {
  const newSet = new Set(ctx.validatingFields.value)
  if (isValidating) {
    newSet.add(fieldPath)
  } else {
    newSet.delete(fieldPath)
  }
  ctx.validatingFields.value = newSet
}

/**
 * Group errors by field path for multi-error support
 */
function groupErrorsByPath(
  issues: Array<{ path: PropertyKey[]; message: string; code: string }>,
): Map<string, Array<{ type: string; message: string }>> {
  const grouped = new Map<string, Array<{ type: string; message: string }>>()

  for (const issue of issues) {
    const path = issue.path.join('.')
    const existing = grouped.get(path) || []
    existing.push({ type: issue.code, message: issue.message })
    grouped.set(path, existing)
  }

  return grouped
}

/**
 * Convert grouped errors to FieldError format
 * criteriaMode: 'firstError' - always returns first error message (string)
 * criteriaMode: 'all' - returns structured FieldError with all error types
 */
function createFieldError(
  errors: Array<{ type: string; message: string }>,
  criteriaMode: CriteriaMode = 'firstError',
): string | FieldError {
  const firstError = errors[0]
  if (!firstError) {
    return ''
  }

  // criteriaMode: 'firstError' - always return just the first error message
  if (criteriaMode === 'firstError') {
    return firstError.message
  }

  // criteriaMode: 'all' - return structured FieldError with all types
  if (errors.length === 1) {
    // Single error - return string for backward compatibility
    return firstError.message
  }

  // Multiple errors - return structured FieldError
  const types: Record<string, string | string[]> = {}
  for (const err of errors) {
    const existing = types[err.type]
    if (existing) {
      // Multiple errors of same type - make array
      types[err.type] = Array.isArray(existing)
        ? [...existing, err.message]
        : [existing, err.message]
    } else {
      types[err.type] = err.message
    }
  }

  return {
    type: firstError.type,
    message: firstError.message,
    types,
  }
}

/**
 * Create validation functions for form
 */
export function createValidation<FormValues>(ctx: FormContext<FormValues>) {
  /**
   * Apply native validation to a field's DOM element.
   * Sets the custom validity message for browser validation UI.
   */
  function applyNativeValidation(fieldPath: string, errorMessage: string | null): void {
    if (!ctx.options.shouldUseNativeValidation) return

    const fieldRef = ctx.fieldRefs.get(fieldPath)
    const el = fieldRef?.value

    if (el && 'setCustomValidity' in el) {
      ;(el as HTMLInputElement).setCustomValidity(errorMessage || '')
    }
  }

  /**
   * Clear native validation on all registered fields
   */
  function clearAllNativeValidation(): void {
    if (!ctx.options.shouldUseNativeValidation) return

    for (const [path] of ctx.fieldRefs) {
      applyNativeValidation(path, null)
    }
  }

  /**
   * Batch schedule multiple errors at once (optimization for full-form validation).
   * When delayError is 0, this applies all errors in a single reactive update.
   */
  function scheduleErrorsBatch(errors: Array<[string, FieldErrorValue]>): void {
    const delayMs = ctx.options.delayError || 0

    if (delayMs <= 0) {
      // No delay - set all errors in a single update
      const newErrors = { ...ctx.errors.value }
      for (const [fieldPath, error] of errors) {
        set(newErrors, fieldPath, error)
        // Apply native validation
        const errorMessage = typeof error === 'string' ? error : error.message
        applyNativeValidation(fieldPath, errorMessage)
      }
      ctx.errors.value = newErrors as FieldErrors<FormValues>
      return
    }

    // With delay - fall back to individual scheduling
    for (const [fieldPath, error] of errors) {
      scheduleError(fieldPath, error)
    }
  }

  /**
   * Schedule error display with optional delay (delayError feature)
   * If delayError > 0, the error will be shown after the delay.
   * If the field becomes valid before the delay completes, the error won't be shown.
   */
  function scheduleError(fieldPath: string, error: FieldErrorValue): void {
    const delayMs = ctx.options.delayError || 0

    // Get error message for native validation
    const errorMessage = typeof error === 'string' ? error : error.message

    if (delayMs <= 0) {
      // No delay - set error immediately using set() to maintain nested structure
      const newErrors = { ...ctx.errors.value }
      set(newErrors, fieldPath, error)
      ctx.errors.value = newErrors as FieldErrors<FormValues>

      // Apply native validation
      applyNativeValidation(fieldPath, errorMessage)
      return
    }

    // Cancel any existing timer for this field
    const existingTimer = ctx.errorDelayTimers.get(fieldPath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Store pending error
    ctx.pendingErrors.set(fieldPath, error)

    // Schedule delayed error display
    const timer = setTimeout(() => {
      ctx.errorDelayTimers.delete(fieldPath)
      const pendingError = ctx.pendingErrors.get(fieldPath)
      if (pendingError !== undefined) {
        ctx.pendingErrors.delete(fieldPath)
        // Use set() to maintain nested structure
        const newErrors = { ...ctx.errors.value }
        set(newErrors, fieldPath, pendingError)
        ctx.errors.value = newErrors as FieldErrors<FormValues>

        // Apply native validation after delay
        applyNativeValidation(fieldPath, errorMessage)
      }
    }, delayMs)

    ctx.errorDelayTimers.set(fieldPath, timer)
  }

  /**
   * Cancel pending error and clear existing error for a field (delayError feature)
   */
  function cancelError(fieldPath: string): FieldErrors<FormValues> {
    // Cancel any pending delayed error
    const timer = ctx.errorDelayTimers.get(fieldPath)
    if (timer) {
      clearTimeout(timer)
      ctx.errorDelayTimers.delete(fieldPath)
    }
    ctx.pendingErrors.delete(fieldPath)

    // Clear native validation
    applyNativeValidation(fieldPath, null)

    // Clear existing error
    return clearFieldErrors(ctx.errors.value, fieldPath)
  }

  /**
   * Clear all pending errors and timers (called on form reset)
   */
  function clearAllPendingErrors(): void {
    for (const timer of ctx.errorDelayTimers.values()) {
      clearTimeout(timer)
    }
    ctx.errorDelayTimers.clear()
    ctx.pendingErrors.clear()
  }

  /**
   * Validate a single field using partial schema validation (O(1) optimization)
   * Only validates the field's sub-schema instead of the entire form.
   */
  async function validateFieldPartial(
    fieldPath: string,
    subSchema: import('zod').ZodType,
    valueHash: string | undefined,
    criteriaMode: CriteriaMode,
    generationAtStart: number,
  ): Promise<boolean> {
    const fieldValue = get(ctx.formData, fieldPath)
    setValidating(ctx, fieldPath, true)

    try {
      const result = await subSchema.safeParseAsync(fieldValue)

      // Check if form was reset during validation
      if (ctx.resetGeneration.value !== generationAtStart) {
        return true
      }

      if (result.success) {
        ctx.errors.value = cancelError(fieldPath)
        if (valueHash) {
          ctx.validationCache.set(fieldPath, { hash: valueHash, isValid: true })
        }
        return true
      }

      // Validation failed - process errors
      // Prepend fieldPath to error paths since we validated just the sub-schema
      const fieldErrors = result.error.issues.map((issue) => ({
        ...issue,
        path: fieldPath.split('.').concat(issue.path.map(String)),
      }))

      // Cancel existing errors for this field first
      ctx.errors.value = cancelError(fieldPath)

      // Schedule errors in batch
      const grouped = groupErrorsByPath(fieldErrors)
      const errorBatch: Array<[string, FieldErrorValue]> = []
      for (const [path, errors] of grouped) {
        errorBatch.push([path, createFieldError(errors, criteriaMode)])
      }
      scheduleErrorsBatch(errorBatch)

      if (valueHash) {
        ctx.validationCache.set(fieldPath, { hash: valueHash, isValid: false })
      }
      return false
    } finally {
      setValidating(ctx, fieldPath, false)
    }
  }

  /**
   * Validate a single field using full form validation (fallback for schemas with effects)
   * Validates entire form, then filters to this field's errors.
   */
  async function validateFieldFull(
    fieldPath: string,
    valueHash: string | undefined,
    criteriaMode: CriteriaMode,
    generationAtStart: number,
  ): Promise<boolean> {
    setValidating(ctx, fieldPath, true)

    try {
      const result = await ctx.options.schema.safeParseAsync(ctx.formData)

      // Check if form was reset during validation
      if (ctx.resetGeneration.value !== generationAtStart) {
        return true
      }

      if (result.success) {
        ctx.errors.value = cancelError(fieldPath)
        if (valueHash) {
          ctx.validationCache.set(fieldPath, { hash: valueHash, isValid: true })
        }
        return true
      }

      // Filter to only this field's errors
      const fieldErrors = result.error.issues.filter((issue) => {
        const path = issue.path.join('.')
        return path === fieldPath || path.startsWith(`${fieldPath}.`)
      })

      if (fieldErrors.length === 0) {
        ctx.errors.value = cancelError(fieldPath)
        if (valueHash) {
          ctx.validationCache.set(fieldPath, { hash: valueHash, isValid: true })
        }
        return true
      }

      // Cancel existing errors for this field first
      ctx.errors.value = cancelError(fieldPath)

      // Schedule errors in batch
      const grouped = groupErrorsByPath(fieldErrors)
      const errorBatch: Array<[string, FieldErrorValue]> = []
      for (const [path, errors] of grouped) {
        errorBatch.push([path, createFieldError(errors, criteriaMode)])
      }
      scheduleErrorsBatch(errorBatch)

      if (valueHash) {
        ctx.validationCache.set(fieldPath, { hash: valueHash, isValid: false })
      }
      return false
    } finally {
      setValidating(ctx, fieldPath, false)
    }
  }

  /**
   * Validate a single field or entire form
   */
  async function validate(fieldPath?: string): Promise<boolean> {
    // Capture reset generation before async validation
    const generationAtStart = ctx.resetGeneration.value

    // Get criteriaMode from options (default: 'firstError')
    const criteriaMode = ctx.options.criteriaMode || 'firstError'

    // For single-field validation, check cache first
    let valueHash: string | undefined
    if (fieldPath) {
      const currentValue = get(ctx.formData, fieldPath)
      valueHash = hashValue(currentValue)
      const cached = ctx.validationCache.get(fieldPath)

      if (cached && cached.hash === valueHash) {
        // Cache hit - return cached result without re-validating
        return cached.isValid
      }

      // Analyze if partial validation is possible
      const analysis = analyzeSchemaPath(ctx.options.schema, fieldPath)

      if (analysis.canPartialValidate && analysis.subSchema) {
        // O(1) single-field validation - validate only the sub-schema
        return validateFieldPartial(
          fieldPath,
          analysis.subSchema,
          valueHash,
          criteriaMode,
          generationAtStart,
        )
      }

      // Fallback: full form validation with filtering
      // Required when schema has refinements that may depend on other fields
      return validateFieldFull(fieldPath, valueHash, criteriaMode, generationAtStart)
    }

    // Full form validation
    const validatingKey = '_form'
    setValidating(ctx, validatingKey, true)

    try {
      // Use safeParseAsync to avoid throwing
      const result = await ctx.options.schema.safeParseAsync(ctx.formData)

      // Check if form was reset during validation - if so, discard stale results
      if (ctx.resetGeneration.value !== generationAtStart) {
        return true // Form was reset, don't update errors
      }

      if (result.success) {
        // Full form valid - clear all pending errors and timers
        clearAllPendingErrors()
        ctx.errors.value = {} as FieldErrors<FormValues>

        // Clear native validation on all fields
        clearAllNativeValidation()

        // Clear validation cache on full form validation (values may have changed)
        ctx.validationCache.clear()
        return true
      }

      // Full form validation with multi-error support
      // Clear all pending errors first
      clearAllPendingErrors()
      ctx.errors.value = {} as FieldErrors<FormValues>

      // Schedule all errors in batch (optimization: single reactive update when no delay)
      const grouped = groupErrorsByPath(result.error.issues)
      const errorBatch: Array<[string, FieldErrorValue]> = []
      for (const [path, errors] of grouped) {
        errorBatch.push([path, createFieldError(errors, criteriaMode)])
      }
      scheduleErrorsBatch(errorBatch)

      // Clear validation cache on full form validation failure
      ctx.validationCache.clear()

      return false
    } finally {
      // Clear validating state
      setValidating(ctx, validatingKey, false)
    }
  }

  return { validate, clearAllPendingErrors }
}
