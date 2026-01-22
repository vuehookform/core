import { computed, ref } from 'vue'
import type { FormContext } from './formContext'
import type {
  RegisterOptions,
  RegisterReturn,
  FieldErrors,
  UnregisterOptions,
  Path,
} from '../types'
import { get, set, unset } from '../utils/paths'
import {
  __DEV__,
  validatePathSyntax,
  validatePathAgainstSchema,
  warnInvalidPath,
  warnPathNotInSchema,
} from '../utils/devWarnings'
import {
  markFieldTouched,
  clearFieldDirty,
  clearFieldTouched,
  clearFieldErrors,
  updateFieldDirtyState,
} from './fieldState'
import { shouldValidateOnChange, shouldValidateOnBlur } from '../utils/modeChecks'
import { getInputElement } from './domSync'

// Monotonic counter for validation request IDs (avoids race conditions)
let validationRequestCounter = 0

/**
 * Create field registration functions
 */
export function createFieldRegistration<FormValues>(
  ctx: FormContext<FormValues>,
  validate: (fieldPath?: string) => Promise<boolean>,
) {
  /**
   * Register an input field
   */
  function register<TPath extends Path<FormValues>>(
    name: TPath,
    registerOptions?: RegisterOptions,
  ): RegisterReturn {
    // Dev-mode path validation (tree-shaken in production)
    if (__DEV__) {
      // Check for syntax errors in the path
      const syntaxError = validatePathSyntax(name)
      if (syntaxError) {
        warnInvalidPath('register', name, syntaxError)
      }

      // Validate path exists in schema
      const schemaResult = validatePathAgainstSchema(ctx.options.schema, name)
      if (!schemaResult.valid) {
        warnPathNotInSchema('register', name, schemaResult.availableFields)
      }
    }

    // Check if already registered - reuse existing ref to prevent recreation on every render
    let fieldRef = ctx.fieldRefs.get(name)

    if (!fieldRef) {
      fieldRef = ref<HTMLInputElement | null>(null)
      ctx.fieldRefs.set(name, fieldRef)

      // Only initialize field value on FIRST registration to avoid mutating state during re-renders
      if (get(ctx.formData, name) === undefined) {
        const defaultValue = get(ctx.defaultValues, name)
        if (defaultValue !== undefined) {
          set(ctx.formData, name, defaultValue)
        }
      }
    }

    // Update options if provided (this is safe to do on every render)
    if (registerOptions) {
      ctx.fieldOptions.set(name, registerOptions)
    }

    // Check if handlers are already cached - reuse to prevent recreation on every render
    let handlers = ctx.fieldHandlers.get(name)

    if (!handlers) {
      /**
       * Run custom field validation with optional debouncing
       */
      const runCustomValidation = async (
        fieldName: string,
        value: unknown,
        requestId: number,
        resetGenAtStart: number,
      ) => {
        // Check if field still exists (may have been unmounted during debounce)
        if (!ctx.fieldRefs.has(fieldName)) {
          return
        }

        const fieldOpts = ctx.fieldOptions.get(fieldName)
        if (!fieldOpts?.validate || fieldOpts.disabled) {
          return
        }

        const error = await fieldOpts.validate(value)

        // Check if this is still the latest request (race condition handling)
        const latestRequestId = ctx.validationRequestIds.get(fieldName)
        if (requestId !== latestRequestId) {
          return // Stale request, ignore result
        }

        // Check if form was reset during validation
        if (ctx.resetGeneration.value !== resetGenAtStart) {
          return // Form was reset, discard stale results
        }

        if (error) {
          ctx.errors.value = { ...ctx.errors.value, [fieldName]: error } as FieldErrors<FormValues>
        } else {
          // Clear the error if validation passes
          const newErrors = { ...ctx.errors.value }
          delete newErrors[fieldName as keyof typeof newErrors]
          ctx.errors.value = newErrors as FieldErrors<FormValues>
        }
      }

      /**
       * Handle field input (fires on every keystroke)
       */
      const onInput = async (e: Event) => {
        const target = e.target as HTMLInputElement
        let value: unknown
        if (target.type === 'checkbox') {
          value = target.checked
        } else if (target.type === 'number' || target.type === 'range') {
          // Use valueAsNumber for proper number coercion (matches domSync.ts behavior)
          // Returns NaN for empty/invalid inputs which preserves the "no value" semantic
          value = target.valueAsNumber
        } else {
          value = target.value
        }

        // Update form data
        set(ctx.formData, name, value)

        // Update dirty state using value comparison (field is dirty only if value differs from default)
        updateFieldDirtyState(
          ctx.dirtyFields,
          ctx.defaultValues,
          ctx.defaultValueHashes,
          name,
          value,
        )

        // Cache field options lookup (avoid multiple Map.get calls)
        const fieldOpts = ctx.fieldOptions.get(name)

        // Validate based on mode
        const shouldValidate = shouldValidateOnChange(
          ctx.options.mode ?? 'onSubmit',
          ctx.touchedFields.value[name] === true,
          ctx.submitCount.value > 0,
          ctx.options.reValidateMode,
        )

        if (shouldValidate) {
          const validationDebounceMs = ctx.options.validationDebounce || 0

          if (validationDebounceMs > 0) {
            // Debounce schema validation to reduce calls during rapid typing
            const existingTimer = ctx.schemaValidationTimers.get(name)
            if (existingTimer) {
              clearTimeout(existingTimer)
            }

            const timer = setTimeout(async () => {
              ctx.schemaValidationTimers.delete(name)
              await validate(name)

              // Trigger validation for dependent fields
              if (fieldOpts?.deps && fieldOpts.deps.length > 0) {
                const uniqueDeps = [...new Set(fieldOpts.deps)]
                await Promise.all(uniqueDeps.map((depField) => validate(depField)))
              }
            }, validationDebounceMs)

            ctx.schemaValidationTimers.set(name, timer)
          } else {
            // No debounce - validate immediately
            await validate(name)

            // Trigger validation for dependent fields in parallel (deps option)
            if (fieldOpts?.deps && fieldOpts.deps.length > 0) {
              const uniqueDeps = [...new Set(fieldOpts.deps)]
              await Promise.all(uniqueDeps.map((depField) => validate(depField)))
            }
          }
        }

        // Custom validation with optional debouncing (reuse cached fieldOpts)
        // Custom validation always runs on input if provided (it's an explicit opt-in)
        if (fieldOpts?.validate && !fieldOpts.disabled) {
          // Generate a new request ID for race condition handling (monotonic counter)
          const requestId = ++validationRequestCounter
          ctx.validationRequestIds.set(name, requestId)

          // Capture reset generation before starting async validation
          const resetGenAtStart = ctx.resetGeneration.value

          const debounceMs = fieldOpts.validateDebounce || 0

          if (debounceMs > 0) {
            // Cancel any existing debounce timer
            const existingTimer = ctx.debounceTimers.get(name)
            if (existingTimer) {
              clearTimeout(existingTimer)
            }

            // Set new debounce timer
            const timer = setTimeout(async () => {
              ctx.debounceTimers.delete(name)
              await runCustomValidation(name, value, requestId, resetGenAtStart)
              // Clean up validationRequestIds ONLY if we're still the latest request.
              // A newer request might have been queued while we were validating,
              // and we shouldn't delete its request ID.
              if (ctx.validationRequestIds.get(name) === requestId) {
                ctx.validationRequestIds.delete(name)
              }
            }, debounceMs)

            ctx.debounceTimers.set(name, timer)
          } else {
            // No debounce, run immediately
            await runCustomValidation(name, value, requestId, resetGenAtStart)
            // Clean up only if still the latest request
            if (ctx.validationRequestIds.get(name) === requestId) {
              ctx.validationRequestIds.delete(name)
            }
          }
        }
      }

      /**
       * Handle field blur
       */
      const onBlur = async () => {
        // Mark as touched (optimized - skips clone if already touched)
        markFieldTouched(ctx.touchedFields, name)

        // Validate based on mode
        const shouldValidate = shouldValidateOnBlur(
          ctx.options.mode ?? 'onSubmit',
          ctx.submitCount.value > 0,
          ctx.options.reValidateMode,
        )

        if (shouldValidate) {
          await validate(name)

          // Trigger validation for dependent fields in parallel (deps option)
          const fieldOpts = ctx.fieldOptions.get(name)
          if (fieldOpts?.deps && fieldOpts.deps.length > 0) {
            const uniqueDeps = [...new Set(fieldOpts.deps)]
            await Promise.all(uniqueDeps.map((depField) => validate(depField)))
          }
        }
      }

      /**
       * Ref callback to store element reference
       */
      const refCallback = (el: unknown) => {
        // Get the current fieldRef from the Map (not closed over variable)
        const currentFieldRef = ctx.fieldRefs.get(name)
        if (!currentFieldRef) return

        const previousEl = currentFieldRef.value
        // Skip if same element - prevents triggering Vue reactivity unnecessarily
        if (previousEl === el) return

        // For fields with multiple elements (like radio buttons in v-for), only store the first one.
        // This prevents "Maximum recursive updates exceeded" when Vue re-binds refs on re-render:
        // - Without this check: radio5 → radio1 → radio2... triggers infinite updates
        // - With this check: we keep the first element and skip subsequent overwrites
        if (previousEl && el) return

        currentFieldRef.value = el as HTMLInputElement | null

        // Set initial value for uncontrolled inputs
        const opts = ctx.fieldOptions.get(name)
        const inputEl = getInputElement(el)
        if (inputEl && !opts?.controlled) {
          const value = get(ctx.formData, name)
          if (value !== undefined) {
            if (inputEl.type === 'checkbox') {
              inputEl.checked = value as boolean
            } else {
              inputEl.value = value as string
            }
          }
        }

        // Handle cleanup when element is removed (ref becomes null)
        if (previousEl && !el) {
          // Always clear debounce timers to prevent memory leaks
          // (timers hold references to form context via closure)
          const timer = ctx.debounceTimers.get(name)
          if (timer) {
            clearTimeout(timer)
            ctx.debounceTimers.delete(name)
          }
          // Clear schema validation debounce timers too
          const schemaTimer = ctx.schemaValidationTimers.get(name)
          if (schemaTimer) {
            clearTimeout(schemaTimer)
            ctx.schemaValidationTimers.delete(name)
          }
          // Clear error delay timers to prevent stale errors from appearing
          const errorTimer = ctx.errorDelayTimers.get(name)
          if (errorTimer) {
            clearTimeout(errorTimer)
            ctx.errorDelayTimers.delete(name)
          }
          ctx.pendingErrors.delete(name)
          ctx.validationRequestIds.delete(name)

          // Always clean up refs, options, and handlers when DOM element unmounts
          // to prevent memory accumulation for dynamically added/removed fields
          ctx.fieldRefs.delete(name)
          ctx.fieldOptions.delete(name)
          ctx.fieldHandlers.delete(name)

          const shouldUnreg = opts?.shouldUnregister ?? ctx.options.shouldUnregister ?? false

          if (shouldUnreg) {
            // Also clear form data and state for this field
            unset(ctx.formData, name)

            // Clear errors, touched, and dirty state (optimized with early exit)
            clearFieldErrors(ctx.errors, name)
            clearFieldTouched(ctx.touchedFields, name)
            clearFieldDirty(ctx.dirtyFields, name)
          }
        }
      }

      // Cache the handlers
      handlers = { onInput, onBlur, refCallback }
      ctx.fieldHandlers.set(name, handlers)
    }

    return {
      name,
      ref: handlers.refCallback,
      onInput: handlers.onInput,
      onBlur: handlers.onBlur,
      // Add form-level disabled
      ...(ctx.isDisabled.value && { disabled: true }),
      ...(registerOptions?.controlled && {
        value: computed({
          get: () => get(ctx.formData, name),
          set: (val) => {
            set(ctx.formData, name, val)
            updateFieldDirtyState(
              ctx.dirtyFields,
              ctx.defaultValues,
              ctx.defaultValueHashes,
              name,
              val,
            )
          },
        }),
      }),
    }
  }

  /**
   * Unregister a field to clean up refs, options, and form data
   */
  function unregister<TPath extends Path<FormValues>>(
    name: TPath,
    options?: UnregisterOptions,
  ): void {
    const opts = options || {}

    // Conditionally remove form data for this field
    if (!opts.keepValue) {
      unset(ctx.formData, name)
    }

    // Conditionally clear errors, touched, and dirty state (optimized)
    if (!opts.keepError) {
      clearFieldErrors(ctx.errors, name)
    }
    if (!opts.keepTouched) {
      clearFieldTouched(ctx.touchedFields, name)
    }
    if (!opts.keepDirty) {
      clearFieldDirty(ctx.dirtyFields, name)
    }

    // Always clean up refs, options, and handlers (internal state)
    ctx.fieldRefs.delete(name)
    ctx.fieldOptions.delete(name)
    ctx.fieldHandlers.delete(name)

    // Always clean up debounce timers
    const timer = ctx.debounceTimers.get(name)
    if (timer) {
      clearTimeout(timer)
      ctx.debounceTimers.delete(name)
    }
    // Clear schema validation debounce timers too
    const schemaTimer = ctx.schemaValidationTimers.get(name)
    if (schemaTimer) {
      clearTimeout(schemaTimer)
      ctx.schemaValidationTimers.delete(name)
    }
    ctx.validationRequestIds.delete(name)

    // Clear validation cache to prevent stale results on re-register
    // Clear both partial and full strategy cache entries
    ctx.validationCache.delete(`${name}:partial`)
    ctx.validationCache.delete(`${name}:full`)
  }

  return { register, unregister }
}
