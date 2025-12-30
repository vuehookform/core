import type { FormContext } from './formContext'
import type { FieldErrors, FieldError, FieldErrorValue, CriteriaMode } from '../types'
import { set } from '../utils/paths'

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
   * Validate a single field or entire form
   */
  async function validate(fieldPath?: string): Promise<boolean> {
    // Capture reset generation before async validation
    const generationAtStart = ctx.resetGeneration.value

    // Get criteriaMode from options (default: 'firstError')
    const criteriaMode = ctx.options.criteriaMode || 'firstError'

    // Mark field(s) as validating
    const validatingKey = fieldPath || '_form'
    setValidating(ctx, validatingKey, true)

    try {
      // Use safeParseAsync to avoid throwing
      const result = await ctx.options.schema.safeParseAsync(ctx.formData)

      // Check if form was reset during validation - if so, discard stale results
      if (ctx.resetGeneration.value !== generationAtStart) {
        return true // Form was reset, don't update errors
      }

      if (result.success) {
        // Clear errors on success
        if (fieldPath) {
          ctx.errors.value = cancelError(fieldPath)
        } else {
          // Full form valid - clear all pending errors and timers
          clearAllPendingErrors()
          ctx.errors.value = {} as FieldErrors<FormValues>

          // Clear native validation on all fields
          clearAllNativeValidation()
        }
        return true
      }

      // Validation failed - process errors
      const zodErrors = result.error.issues

      if (fieldPath) {
        // Single field validation - filter to only this field's errors
        const fieldErrors = zodErrors.filter((issue) => {
          const path = issue.path.join('.')
          return path === fieldPath || path.startsWith(`${fieldPath}.`)
        })

        if (fieldErrors.length === 0) {
          // This specific field is valid, clear its errors
          ctx.errors.value = cancelError(fieldPath)
          return true
        }

        // Cancel existing errors for this field first
        ctx.errors.value = cancelError(fieldPath)

        // Schedule errors (with optional delay)
        const grouped = groupErrorsByPath(fieldErrors)
        for (const [path, errors] of grouped) {
          scheduleError(path, createFieldError(errors, criteriaMode))
        }

        return false
      }

      // Full form validation with multi-error support
      // Clear all pending errors first
      clearAllPendingErrors()
      ctx.errors.value = {} as FieldErrors<FormValues>

      const grouped = groupErrorsByPath(zodErrors)
      for (const [path, errors] of grouped) {
        scheduleError(path, createFieldError(errors, criteriaMode))
      }

      return false
    } finally {
      // Clear validating state
      setValidating(ctx, validatingKey, false)
    }
  }

  return { validate, clearAllPendingErrors }
}
