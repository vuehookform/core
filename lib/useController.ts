import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { ZodType } from 'zod'
import type { UseFormReturn, Path, PathValue, InferSchema, FieldState } from './types'
import { useFormContext } from './context'
import { shouldValidateOnChange, shouldValidateOnBlur } from './utils/modeChecks'
import { setCalledFromController } from './useForm'

/**
 * Options for useController composable
 */
export interface UseControllerOptions<
  TSchema extends ZodType,
  TPath extends Path<InferSchema<TSchema>>,
> {
  /** Field name/path */
  name: TPath
  /** Form control from useForm (uses context if not provided) */
  control?: UseFormReturn<TSchema>
  /** Default value for the field */
  defaultValue?: PathValue<InferSchema<TSchema>, TPath>
}

/**
 * Field props returned by useController
 */
export interface ControllerFieldProps<TValue> {
  /** Current field value */
  value: Ref<TValue>
  /** Field name */
  name: string
  /** Change handler - call with new value */
  onChange: (value: TValue) => void
  /** Blur handler */
  onBlur: () => void
  /** Ref callback for the input element */
  ref: (el: HTMLElement | null) => void
}

/**
 * Return value from useController
 */
export interface UseControllerReturn<TValue> {
  /** Field props for binding to input components */
  field: ControllerFieldProps<TValue>
  /** Current field state (errors, dirty, touched) */
  fieldState: ComputedRef<FieldState>
}

/**
 * Hook for controlled components that need fine-grained control over field state
 *
 * This composable is useful for integrating with custom input components or
 * third-party UI libraries that don't work with the standard register() approach.
 *
 * @example
 * ```ts
 * // Basic usage with context
 * const { field, fieldState } = useController({ name: 'email' })
 *
 * // With explicit control
 * const { control } = useForm({ schema })
 * const { field, fieldState } = useController({ control, name: 'email' })
 *
 * // In template:
 * // <CustomInput
 * //   :value="field.value.value"
 * //   @update:modelValue="field.onChange"
 * //   @blur="field.onBlur"
 * // />
 * // <span v-if="fieldState.value.error">{{ fieldState.value.error }}</span>
 * ```
 */
export function useController<TSchema extends ZodType, TPath extends Path<InferSchema<TSchema>>>(
  options: UseControllerOptions<TSchema, TPath>,
): UseControllerReturn<PathValue<InferSchema<TSchema>, TPath>> {
  type TValue = PathValue<InferSchema<TSchema>, TPath>

  const { name, control, defaultValue } = options

  // Get form control from context if not provided
  const form = control ?? useFormContext<TSchema>()

  // Element ref for focus management
  const elementRef = ref<HTMLElement | null>(null)

  // Initialize with default value if provided
  if (defaultValue !== undefined && form.getValues(name) === undefined) {
    form.setValue(name, defaultValue)
  }

  // Create reactive value for v-model binding.
  // The setter marks the field dirty by default (shouldDirty: true),
  // which is the expected behavior for controlled inputs.
  // For programmatic value loading without marking dirty, use form.setValue with { shouldDirty: false }.
  const value = computed({
    get: () => {
      const currentValue = form.getValues(name)
      return (currentValue ?? defaultValue) as TValue
    },
    set: (newValue: TValue) => {
      form.setValue(name, newValue)
    },
  })

  // Change handler - respects form validation mode
  const onChange = (newValue: TValue) => {
    const isTouched = form.formState.value.touchedFields[name] === true
    const hasSubmitted = form.formState.value.submitCount > 0
    const mode = form.options.mode ?? 'onSubmit'
    const reValidateMode = form.options.reValidateMode

    const shouldValidate = shouldValidateOnChange(mode, isTouched, hasSubmitted, reValidateMode)

    form.setValue(name, newValue, { shouldValidate })
  }

  // Blur handler - respects form validation mode
  const onBlur = () => {
    const hasSubmitted = form.formState.value.submitCount > 0
    const mode = form.options.mode ?? 'onSubmit'
    const reValidateMode = form.options.reValidateMode

    const shouldValidate = shouldValidateOnBlur(mode, hasSubmitted, reValidateMode)

    // Use setValue with shouldTouch to properly mark the field as touched
    // This ensures touchedFieldCount is updated, which isValid depends on
    const currentValue = form.getValues(name)
    form.setValue(name, currentValue, {
      shouldTouch: true,
      shouldValidate,
      shouldDirty: false, // Don't change dirty state on blur
    })
  }

  // Ref callback
  const refCallback = (el: HTMLElement | null) => {
    elementRef.value = el
  }

  // Field state computed - wrapped with flag to suppress false positive warning
  const fieldState = computed<FieldState>(() => {
    setCalledFromController(true)
    const state = form.getFieldState(name)
    setCalledFromController(false)
    return state
  })

  return {
    field: {
      value: value as unknown as Ref<TValue>,
      name,
      onChange,
      onBlur,
      ref: refCallback,
    },
    fieldState,
  }
}
