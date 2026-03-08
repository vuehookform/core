import { ref, inject, provide, type InjectionKey, type Ref } from 'vue'
import type { ValidationMode } from '@vuehookform/core'

/**
 * Available validation modes for the selector
 */
export const VALIDATION_MODES: { name: string; value: ValidationMode }[] = [
  { name: 'onSubmit', value: 'onSubmit' },
  { name: 'onBlur', value: 'onBlur' },
  { name: 'onChange', value: 'onChange' },
  { name: 'onTouched', value: 'onTouched' },
]

/**
 * Injection key for the global validation mode
 */
const ValidationModeKey: InjectionKey<Ref<ValidationMode>> = Symbol('validation-mode')

/**
 * Provide the global validation mode at the app level (call in App.vue)
 */
export function provideValidationMode(): Ref<ValidationMode> {
  const mode = ref<ValidationMode>('onSubmit')
  provide(ValidationModeKey, mode)
  return mode
}

/**
 * Inject the global validation mode (use in sidebar and views)
 * Throws if called outside of a provider context
 */
export function useGlobalValidationMode(): Ref<ValidationMode> {
  const mode = inject(ValidationModeKey)
  if (!mode) {
    throw new Error(
      'useGlobalValidationMode must be used within a component that has provideValidationMode() in a parent',
    )
  }
  return mode
}
