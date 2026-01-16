import type { ValidationMode } from '../types'

/**
 * Determines if validation should occur on change event.
 * Used by useController and register for consistent mode handling.
 *
 * @param mode - The form's validation mode
 * @param isTouched - Whether the field has been touched
 * @param reValidateMode - The form's reValidateMode (used after first submit)
 * @returns true if validation should be triggered
 */
export function shouldValidateOnChange(
  mode: ValidationMode,
  isTouched: boolean,
  reValidateMode?: ValidationMode,
): boolean {
  return (
    mode === 'onChange' ||
    (mode === 'onTouched' && isTouched) ||
    (isTouched && reValidateMode === 'onChange')
  )
}

/**
 * Determines if validation should occur on blur event.
 * Used by useController and register for consistent mode handling.
 *
 * @param mode - The form's validation mode
 * @param hasSubmitted - Whether the form has been submitted at least once
 * @param reValidateMode - The form's reValidateMode (used after first submit)
 * @returns true if validation should be triggered
 */
export function shouldValidateOnBlur(
  mode: ValidationMode,
  hasSubmitted: boolean,
  reValidateMode?: ValidationMode,
): boolean {
  return mode === 'onBlur' || mode === 'onTouched' || (hasSubmitted && reValidateMode === 'onBlur')
}
