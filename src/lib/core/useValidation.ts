import type { FormContext } from './formContext'
import type { FieldErrors, FieldError } from '../types'
import { set } from '../utils/paths'

/**
 * Helper to clear errors for a specific field path and its children
 */
function clearFieldErrors<T>(
  errors: FieldErrors<T>,
  fieldPath: string,
): FieldErrors<T> {
  const newErrors = { ...errors }
  for (const key of Object.keys(newErrors)) {
    if (key === fieldPath || key.startsWith(`${fieldPath}.`)) {
      delete newErrors[key as keyof typeof newErrors]
    }
  }
  return newErrors as FieldErrors<T>
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
 * Single error = string (backward compatible)
 * Multiple errors = FieldError with types
 */
function createFieldError(errors: Array<{ type: string; message: string }>): string | FieldError {
  const firstError = errors[0]
  if (!firstError) {
    return ''
  }

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
   * Validate a single field or entire form
   */
  async function validate(fieldPath?: string): Promise<boolean> {
    // Capture reset generation before async validation
    const generationAtStart = ctx.resetGeneration.value

    // Use safeParseAsync to avoid throwing
    const result = await ctx.options.schema.safeParseAsync(ctx.formData)

    // Check if form was reset during validation - if so, discard stale results
    if (ctx.resetGeneration.value !== generationAtStart) {
      return true // Form was reset, don't update errors
    }

    if (result.success) {
      // Clear errors on success
      if (fieldPath) {
        ctx.errors.value = clearFieldErrors(ctx.errors.value, fieldPath)
      } else {
        ctx.errors.value = {} as FieldErrors<FormValues>
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
        ctx.errors.value = clearFieldErrors(ctx.errors.value, fieldPath)
        return true
      }

      // Update only this field's errors (merge with existing), with multi-error support
      const newErrors = clearFieldErrors(ctx.errors.value, fieldPath)
      const grouped = groupErrorsByPath(fieldErrors)

      for (const [path, errors] of grouped) {
        set(newErrors, path, createFieldError(errors))
      }

      ctx.errors.value = newErrors as FieldErrors<FormValues>
      return false
    }

    // Full form validation with multi-error support
    const newErrors: Record<string, string | FieldError> = {}
    const grouped = groupErrorsByPath(zodErrors)

    for (const [path, errors] of grouped) {
      set(newErrors, path, createFieldError(errors))
    }

    ctx.errors.value = newErrors as FieldErrors<FormValues>
    return false
  }

  return { validate }
}
