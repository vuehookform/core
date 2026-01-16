import type { Ref } from 'vue'
import type { RegisterOptions } from '../types'
import { set } from '../utils/paths'

/**
 * Sync values from uncontrolled DOM inputs to form data
 *
 * This reads the current DOM state from uncontrolled inputs and updates
 * the formData object. Used before form submission and when getting values.
 *
 * Handles type coercion for:
 * - checkbox: returns boolean (el.checked)
 * - number/range: returns number (el.valueAsNumber)
 * - all other types: returns string (el.value)
 *
 * @param fieldRefs - Map of field names to their DOM element refs
 * @param fieldOptions - Map of field names to their registration options
 * @param formData - The reactive form data object to update
 */
export function syncUncontrolledInputs(
  fieldRefs: Map<string, Ref<HTMLInputElement | null>>,
  fieldOptions: Map<string, RegisterOptions>,
  formData: Record<string, unknown>,
): void {
  for (const [name, fieldRef] of Array.from(fieldRefs.entries())) {
    const el = fieldRef.value
    if (el) {
      const opts = fieldOptions.get(name)
      if (!opts?.controlled) {
        let value: unknown
        if (el.type === 'checkbox') {
          value = el.checked
        } else if (el.type === 'number' || el.type === 'range') {
          // Use valueAsNumber for proper number coercion
          // Returns NaN for empty/invalid inputs which preserves the "no value" semantic
          value = el.valueAsNumber
        } else {
          value = el.value
        }
        set(formData, name, value)
      }
    }
  }
}

/**
 * Update a single DOM element with a new value
 *
 * Handles both checkbox and text inputs appropriately.
 *
 * @param el - The DOM input element to update
 * @param value - The value to set
 */
export function updateDomElement(el: HTMLInputElement, value: unknown): void {
  if (el.type === 'checkbox') {
    el.checked = value as boolean
  } else {
    el.value = value as string
  }
}
