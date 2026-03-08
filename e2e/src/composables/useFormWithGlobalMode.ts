import {
  shallowRef,
  ref,
  watch,
  effectScope,
  type ShallowRef,
  type Ref,
  type EffectScope,
} from 'vue'
import { useForm, type UseFormOptions, type UseFormReturn } from '@vuehookform/core'
import type { ZodType } from 'zod'
import { useGlobalValidationMode } from './useGlobalValidationMode'

export interface UseFormWithGlobalModeOptions<TSchema extends ZodType>
  extends Omit<UseFormOptions<TSchema>, 'mode'> {
  /**
   * If true, ignore the global mode and don't recreate the form on mode changes.
   * Useful for views that have their own local mode selector (like ValidationModesView).
   */
  overrideMode?: boolean
}

export interface UseFormWithGlobalModeReturn<TSchema extends ZodType> {
  /**
   * The form instance. Use shallowRef to avoid deep reactivity issues.
   * Access form methods via form.value.register(), form.value.handleSubmit(), etc.
   */
  form: ShallowRef<UseFormReturn<TSchema>>
  /**
   * Key for the form element. Changes when the form is recreated.
   * Use :key="formKey" on the form element to force re-render.
   */
  formKey: Ref<number>
}

/**
 * Wrapper composable that combines useForm with global validation mode awareness.
 * Automatically recreates the form when the global mode changes.
 *
 * @example
 * const { form, formKey } = useFormWithGlobalMode({
 *   schema,
 *   defaultValues: { email: '', name: '' },
 * })
 *
 * // In template:
 * // <form :key="formKey" @submit.prevent="form.handleSubmit(onSubmit)($event)">
 * //   <input v-bind="form.register('email')" />
 * // </form>
 */
export function useFormWithGlobalMode<TSchema extends ZodType>(
  options: UseFormWithGlobalModeOptions<TSchema>,
): UseFormWithGlobalModeReturn<TSchema> {
  const { overrideMode, ...formOptions } = options
  const globalMode = useGlobalValidationMode()
  const formKey = ref(0)

  // Track the current effectScope for cleanup
  let currentScope: EffectScope | null = null

  const createForm = () => {
    // Dispose old scope if it exists (cleans up old form's watchers/hooks)
    if (currentScope) {
      currentScope.stop()
    }

    // Create new scope and run useForm inside it
    currentScope = effectScope()

    const newForm = currentScope.run(() => {
      return useForm({
        ...formOptions,
        mode: globalMode.value,
      })
    })

    return newForm!
  }

  const form = shallowRef(createForm())

  // Watch for global mode changes and recreate the form (unless overrideMode is true)
  if (!overrideMode) {
    watch(globalMode, () => {
      form.value = createForm()
      formKey.value++
    })
  }

  return {
    form,
    formKey,
  }
}
