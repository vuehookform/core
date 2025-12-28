import { inject, provide, type InjectionKey } from 'vue'
import type { UseFormReturn } from './types'
import type { ZodType } from 'zod'

/**
 * Injection key for form context
 */
export const FormContextKey: InjectionKey<UseFormReturn<ZodType>> = Symbol('FormContext')

/**
 * Provide form methods to child components via Vue's dependency injection.
 *
 * Call this in a parent component's setup function after calling useForm().
 *
 * @example
 * ```ts
 * // Parent component
 * const form = useForm({ schema })
 * provideForm(form)
 * ```
 *
 * @param methods - The return value from useForm()
 */
export function provideForm<TSchema extends ZodType>(methods: UseFormReturn<TSchema>): void {
  provide(FormContextKey, methods as unknown as UseFormReturn<ZodType>)
}

/**
 * Access form methods in a child component via Vue's dependency injection.
 *
 * Must be used within a component tree where provideForm() has been called.
 *
 * @example
 * ```ts
 * // Child component
 * const { register, formState } = useFormContext()
 * ```
 *
 * @returns The form methods from the parent component's useForm() call
 * @throws Error if used outside of a FormProvider context
 */
export function useFormContext<TSchema extends ZodType>(): UseFormReturn<TSchema> {
  const context = inject(FormContextKey)

  if (!context) {
    throw new Error(
      'useFormContext must be used within a component tree where provideForm() has been called. ' +
        'Make sure to call provideForm(useForm({ schema })) in a parent component.',
    )
  }

  return context as unknown as UseFormReturn<TSchema>
}
