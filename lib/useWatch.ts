import { computed, type ComputedRef } from 'vue'
import type { ZodType } from 'zod'
import type { UseFormReturn, Path, PathValue, InferSchema } from './types'
import { useFormContext } from './context'

/**
 * Options for useWatch composable
 */
export interface UseWatchOptions<
  TSchema extends ZodType,
  TPath extends Path<InferSchema<TSchema>>,
> {
  /** Form control from useForm (uses context if not provided) */
  control?: UseFormReturn<TSchema>
  /** Field path or array of paths to watch (watches all if not provided) */
  name?: TPath | TPath[]
  /** Default value when field is undefined */
  defaultValue?: PathValue<InferSchema<TSchema>, TPath>
}

/**
 * Watch form field values reactively without the full form instance
 *
 * This composable allows you to subscribe to form value changes from any component
 * in the tree, as long as the form context is provided via provideForm().
 *
 * @example
 * ```ts
 * // Watch a single field
 * const email = useWatch({ name: 'email' })
 *
 * // Watch multiple fields
 * const fields = useWatch({ name: ['firstName', 'lastName'] })
 *
 * // Watch all form values
 * const allValues = useWatch({})
 *
 * // With explicit control
 * const { control } = useForm({ schema })
 * const email = useWatch({ control, name: 'email' })
 *
 * // With default value
 * const status = useWatch({ name: 'status', defaultValue: 'pending' })
 * ```
 */
export function useWatch<TSchema extends ZodType>(
  options?: Omit<UseWatchOptions<TSchema, Path<InferSchema<TSchema>>>, 'name'>,
): ComputedRef<InferSchema<TSchema>>

export function useWatch<TSchema extends ZodType, TPath extends Path<InferSchema<TSchema>>>(
  options: UseWatchOptions<TSchema, TPath> & { name: TPath },
): ComputedRef<PathValue<InferSchema<TSchema>, TPath>>

export function useWatch<TSchema extends ZodType, TPath extends Path<InferSchema<TSchema>>>(
  options: UseWatchOptions<TSchema, TPath> & { name: TPath[] },
): ComputedRef<Partial<InferSchema<TSchema>>>

export function useWatch<
  TSchema extends ZodType,
  TPath extends Path<InferSchema<TSchema>> = Path<InferSchema<TSchema>>,
>(
  options: UseWatchOptions<TSchema, TPath> = {} as UseWatchOptions<TSchema, TPath>,
): ComputedRef<
  InferSchema<TSchema> | PathValue<InferSchema<TSchema>, TPath> | Partial<InferSchema<TSchema>>
> {
  const { control, name, defaultValue } = options

  // Get form control from context if not provided
  const form = control ?? useFormContext<TSchema>()

  // Delegate to form.watch() which reads directly from reactive formData.
  // This avoids the O(N) syncUncontrolledInputs + deepClone overhead that
  // form.getValues() would trigger on every computed evaluation.
  if (name === undefined) {
    return form.watch() as ComputedRef<
      InferSchema<TSchema> | PathValue<InferSchema<TSchema>, TPath> | Partial<InferSchema<TSchema>>
    >
  }

  if (Array.isArray(name)) {
    const watched = form.watch(name)
    if (defaultValue === undefined) {
      return watched as ComputedRef<
        | InferSchema<TSchema>
        | PathValue<InferSchema<TSchema>, TPath>
        | Partial<InferSchema<TSchema>>
      >
    }
    // Apply defaultValue fallback for undefined entries
    return computed(() => {
      const result = { ...watched.value } as Record<string, unknown>
      for (const fieldName of name) {
        if (result[fieldName] === undefined) {
          result[fieldName] = defaultValue
        }
      }
      return result
    }) as ComputedRef<
      InferSchema<TSchema> | PathValue<InferSchema<TSchema>, TPath> | Partial<InferSchema<TSchema>>
    >
  }

  // Single field watch with optional defaultValue fallback
  const watched = form.watch(name)
  if (defaultValue === undefined) {
    return watched as ComputedRef<
      InferSchema<TSchema> | PathValue<InferSchema<TSchema>, TPath> | Partial<InferSchema<TSchema>>
    >
  }
  return computed(() => watched.value ?? defaultValue) as ComputedRef<
    InferSchema<TSchema> | PathValue<InferSchema<TSchema>, TPath> | Partial<InferSchema<TSchema>>
  >
}
