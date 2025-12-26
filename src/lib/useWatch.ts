import { computed, type ComputedRef } from 'vue'
import type { ZodType } from 'zod'
import type { UseFormReturn, Path, PathValue, InferSchema } from './types'
import { useFormContext } from './context'
import { get } from './utils/paths'

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
  defaultValue?: unknown
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

export function useWatch<
  TSchema extends ZodType,
  TPath extends Path<InferSchema<TSchema>>,
>(options: UseWatchOptions<TSchema, TPath> & { name: TPath }): ComputedRef<PathValue<InferSchema<TSchema>, TPath>>

export function useWatch<
  TSchema extends ZodType,
  TPath extends Path<InferSchema<TSchema>>,
>(options: UseWatchOptions<TSchema, TPath> & { name: TPath[] }): ComputedRef<Partial<InferSchema<TSchema>>>

export function useWatch<
  TSchema extends ZodType,
  TPath extends Path<InferSchema<TSchema>> = Path<InferSchema<TSchema>>,
>(
  options: UseWatchOptions<TSchema, TPath> = {} as UseWatchOptions<TSchema, TPath>,
): ComputedRef<InferSchema<TSchema> | PathValue<InferSchema<TSchema>, TPath> | Partial<InferSchema<TSchema>>> {
  const { control, name, defaultValue } = options

  // Get form control from context if not provided
  const form = control ?? useFormContext<TSchema>()

  return computed(() => {
    if (name === undefined) {
      // Watch all values
      return form.getValues()
    }

    if (Array.isArray(name)) {
      // Watch multiple fields
      const result: Record<string, unknown> = {}
      for (const fieldName of name) {
        const value = get(form.getValues(), fieldName)
        result[fieldName] = value ?? defaultValue
      }
      return result
    }

    // Watch single field
    const value = get(form.getValues(), name)
    return value ?? defaultValue
  }) as ComputedRef<InferSchema<TSchema> | PathValue<InferSchema<TSchema>, TPath> | Partial<InferSchema<TSchema>>>
}
