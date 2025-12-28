import { computed, type ComputedRef } from 'vue'
import type { ZodType } from 'zod'
import type { UseFormReturn, FormState, InferSchema } from './types'
import { useFormContext } from './context'

/**
 * Keys of FormState that can be subscribed to
 */
export type FormStateKey = keyof FormState<unknown>

/**
 * Options for useFormState composable
 */
export interface UseFormStateOptions<TSchema extends ZodType> {
  /** Form control from useForm (uses context if not provided) */
  control?: UseFormReturn<TSchema>
  /** Specific state keys to subscribe to (subscribes to all if not provided) */
  name?: FormStateKey | FormStateKey[]
}

/**
 * Subscribe to specific form state properties
 *
 * This composable allows you to efficiently subscribe to only the form state
 * properties you need, reducing unnecessary re-renders.
 *
 * @example
 * ```ts
 * // Subscribe to all form state
 * const formState = useFormState({})
 *
 * // Subscribe to specific properties
 * const { isSubmitting, errors } = useFormState({ name: ['isSubmitting', 'errors'] })
 *
 * // Subscribe to single property
 * const isDirty = useFormState({ name: 'isDirty' })
 *
 * // With explicit control
 * const { control } = useForm({ schema })
 * const formState = useFormState({ control })
 * ```
 */
export function useFormState<TSchema extends ZodType>(
  options: UseFormStateOptions<TSchema> = {},
): ComputedRef<Partial<FormState<InferSchema<TSchema>>>> {
  const { control, name } = options

  // Get form control from context if not provided
  const form = control ?? useFormContext<TSchema>()

  return computed(() => {
    const fullState = form.formState.value

    if (name === undefined) {
      // Return all state
      return { ...fullState }
    }

    if (Array.isArray(name)) {
      // Return specific properties
      const result: Partial<FormState<InferSchema<TSchema>>> = {}
      for (const key of name) {
        ;(result as Record<string, unknown>)[key] = fullState[key]
      }
      return result
    }

    // Return single property wrapped in object
    return { [name]: fullState[name] } as Partial<FormState<InferSchema<TSchema>>>
  })
}
