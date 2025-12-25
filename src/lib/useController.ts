import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { ZodType } from 'zod'
import type { UseFormReturn, Path, PathValue, InferSchema, FieldState } from './types'
import { useFormContext } from './context'

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
export function useController<
  TSchema extends ZodType,
  TPath extends Path<InferSchema<TSchema>>,
>(
  options: UseControllerOptions<TSchema, TPath>,
): UseControllerReturn<PathValue<InferSchema<TSchema>, TPath>> {
  type TValue = PathValue<InferSchema<TSchema>, TPath>

  const { name, control, defaultValue } = options

  // Get form control from context if not provided
  const form = control ?? useFormContext<TSchema>()

  // Element ref for focus management
  const elementRef = ref<HTMLElement | null>(null)

  // Initialize with default value if provided
  if (defaultValue !== undefined && form.getValue(name) === undefined) {
    form.setValue(name, defaultValue)
  }

  // Create reactive value
  const value = computed({
    get: () => {
      const currentValue = form.getValue(name)
      return (currentValue ?? defaultValue) as TValue
    },
    set: (newValue: TValue) => {
      form.setValue(name, newValue)
    },
  })

  // Change handler
  const onChange = (newValue: TValue) => {
    form.setValue(name, newValue)
  }

  // Blur handler - triggers validation based on mode
  const onBlur = () => {
    form.trigger(name)
  }

  // Ref callback
  const refCallback = (el: HTMLElement | null) => {
    elementRef.value = el
  }

  // Field state computed
  const fieldState = computed<FieldState>(() => {
    return form.getFieldState(name)
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
