import type { Ref } from 'vue'
import type { RegisterOptions } from '../types'
import { set } from '../utils/paths'

/**
 * Sync values from uncontrolled DOM inputs to form data
 *
 * This reads the current DOM state from uncontrolled inputs and updates
 * the formData object. Used before form submission and when getting values.
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
        const value = el.type === 'checkbox' ? el.checked : el.value
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

/**
 * Get value from a DOM element based on its type
 *
 * @param el - The DOM input element
 * @returns The current value (checked state for checkboxes, value for others)
 */
export function getDomElementValue(el: HTMLInputElement): unknown {
  return el.type === 'checkbox' ? el.checked : el.value
}
