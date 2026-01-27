/**
 * Vue Hook Form - TypeScript-first form library for Vue 3
 *
 * @example
 * ```ts
 * import { useForm } from './lib'
 * import { z } from 'zod'
 *
 * const schema = z.object({
 *   email: z.email(),
 *   name: z.string().min(2)
 * })
 *
 * const { register, handleSubmit, formState } = useForm({ schema })
 * ```
 */

export { useForm } from './useForm'
export { provideForm, useFormContext, FormContextKey } from './context'
export { useWatch, type UseWatchOptions } from './useWatch'
export {
  useController,
  type UseControllerOptions,
  type UseControllerReturn,
  type ControllerFieldProps,
  type LooseControllerOptions,
} from './useController'
export { useFormState, type UseFormStateOptions, type FormStateKey } from './useFormState'

// Type guard functions
export { isFieldError } from './types'

export type {
  // Core form types
  UseFormOptions,
  UseFormReturn,
  UseFormReturn as Control,
  LooseControl,
  RegisterOptions,
  RegisterReturn,
  FormState,
  FieldState,
  // Error types
  FieldErrors,
  FieldError,
  FieldErrorValue,
  ErrorOption,
  SetErrorsOptions,
  // Field array types
  FieldArray,
  FieldArrayItem,
  FieldArrayOptions,
  FieldArrayRules,
  FieldArrayFocusOptions,
  // Utility types for type-safe paths
  InferSchema,
  FormValues,
  FormPath,
  Path,
  PathValue,
  ArrayElement,
  ArrayPath,
  FieldPath,
  // Configuration types
  ValidationMode,
  SetFocusOptions,
  ResetOptions,
  ResetFieldOptions,
  AsyncDefaultValues,
  // Method option types
  TriggerOptions,
  SetValueOptions,
  UnregisterOptions,
  CriteriaMode,
} from './types'

// Path utilities for advanced form data manipulation
export { get, set, unset, clearPathCache } from './utils/paths'
