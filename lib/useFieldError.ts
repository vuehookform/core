import { computed, type ComputedRef } from 'vue'
import type { ZodType } from 'zod'
import type { UseFormReturn, Path, InferSchema, LooseControl } from './types'
import { useFormContext } from './context'
import { get } from './utils/paths'
import { __DEV__ } from './utils/devWarnings'

/**
 * Options for useFieldError composable
 */
export interface UseFieldErrorOptions<
  TSchema extends ZodType,
  TPath extends Path<InferSchema<TSchema>>,
> {
  /** Field path to get the error for */
  name: TPath
  /** Form control from useForm (uses context if not provided) */
  control?: UseFormReturn<TSchema>
}

/**
 * Loose options for useFieldError when schema type is unknown.
 */
export interface LooseFieldErrorOptions {
  /** Field path as a string */
  name: string
  /** Form control from useForm (uses context if not provided) */
  control?: LooseControl
}

/**
 * Get a reactive error message for a single field.
 *
 * Returns a ComputedRef that automatically updates when the field's
 * error state changes. Normalizes both string errors and structured
 * FieldError objects to a plain string message.
 *
 * For field array paths with per-item errors (not a single array-level error),
 * returns `undefined`. Use `formState.value.errors` directly for item-level errors.
 *
 * @example Basic usage with context
 * ```vue
 * <script setup>
 * const emailError = useFieldError({ name: 'email' })
 * </script>
 * <template>
 *   <span v-if="emailError" class="error">{{ emailError }}</span>
 * </template>
 * ```
 *
 * @example With explicit control
 * ```ts
 * const form = useForm({ schema })
 * const emailError = useFieldError({ name: 'email', control: form })
 * ```
 *
 * @example Nested path
 * ```ts
 * const cityError = useFieldError({ name: 'user.address.city' })
 * ```
 */
export function useFieldError(options: LooseFieldErrorOptions): ComputedRef<string | undefined>
export function useFieldError<TSchema extends ZodType, TPath extends Path<InferSchema<TSchema>>>(
  options: UseFieldErrorOptions<TSchema, TPath>,
): ComputedRef<string | undefined>
export function useFieldError<TSchema extends ZodType, TPath extends Path<InferSchema<TSchema>>>(
  options: UseFieldErrorOptions<TSchema, TPath> | LooseFieldErrorOptions,
): ComputedRef<string | undefined> {
  const form = options.control ?? useFormContext<TSchema>()

  return computed(() => {
    const error = get(form.formState.value.errors, options.name)
    if (!error) return undefined
    if (typeof error === 'string') return error
    // Array means per-item errors for a field array — no single message applies
    if (Array.isArray(error)) {
      if (__DEV__) {
        console.warn(
          `[vue-hook-form] useFieldError('${options.name}') resolved to an array of per-item errors.\n` +
            `useFieldError only returns scalar error messages. ` +
            `Use formState.value.errors['${options.name}'] directly for item-level errors.`,
        )
      }
      return undefined
    }
    if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
      return (error as { message: string }).message
    }
    return undefined
  })
}
