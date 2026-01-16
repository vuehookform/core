import type { ValidationMode } from '../types'
import { __DEV__, warnOnce } from './devWarnings'

/** Valid validation mode values */
const VALID_MODES: readonly ValidationMode[] = ['onSubmit', 'onBlur', 'onChange', 'onTouched']

/**
 * Validate that a mode is one of the allowed ValidationMode values.
 * Warns once per invalid mode in development.
 */
function validateMode(mode: ValidationMode, paramName: string): void {
  if (__DEV__ && !VALID_MODES.includes(mode)) {
    warnOnce(
      `Invalid ${paramName}: "${mode}". Expected one of: ${VALID_MODES.join(', ')}`,
      `invalid-mode-${mode}`,
    )
  }
}

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
  if (__DEV__) {
    validateMode(mode, 'validation mode')
    if (reValidateMode) validateMode(reValidateMode, 'reValidateMode')
  }

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
  if (__DEV__) {
    validateMode(mode, 'validation mode')
    if (reValidateMode) validateMode(reValidateMode, 'reValidateMode')
  }

  return mode === 'onBlur' || mode === 'onTouched' || (hasSubmitted && reValidateMode === 'onBlur')
}
