import type { Ref } from 'vue'
import type { RegisterOptions } from '../types'
import { set } from '../utils/paths'

/**
 * Extract the actual HTMLInputElement from a ref value.
 * Handles both native elements and Vue component instances (PrimeVue, Vuetify, etc.)
 *
 * Vue component libraries typically expose:
 * - $el: The root DOM element of the component
 * - Some components wrap inputs in divs, so we may need to query for the input
 *
 * @param refValue - The value from fieldRef.value (HTMLInputElement, Component, or null)
 * @returns The underlying HTMLInputElement, or null if not found
 */
export function getInputElement(refValue: unknown): HTMLInputElement | null {
  if (!refValue) return null

  // Already an HTMLInputElement - most common case (native inputs)
  if (refValue instanceof HTMLInputElement) {
    return refValue
  }

  // Handle HTMLSelectElement and HTMLTextAreaElement (they share similar APIs)
  if (refValue instanceof HTMLSelectElement || refValue instanceof HTMLTextAreaElement) {
    return refValue as unknown as HTMLInputElement
  }

  // Vue component instance - check for $el property
  if (typeof refValue === 'object' && '$el' in refValue) {
    const el = (refValue as { $el: unknown }).$el

    // $el is the input element directly (common for simple input wrappers like PrimeVue InputText)
    if (el instanceof HTMLInputElement) {
      return el
    }

    // $el is a select or textarea
    if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      return el as unknown as HTMLInputElement
    }

    // $el is a container element - search for input inside
    if (el instanceof Element) {
      // Query for nested input, select, or textarea
      const input = el.querySelector('input, select, textarea')
      if (
        input instanceof HTMLInputElement ||
        input instanceof HTMLSelectElement ||
        input instanceof HTMLTextAreaElement
      ) {
        return input as HTMLInputElement
      }
    }
  }

  return null
}

/**
 * Get a focusable element from a ref value.
 * Works with both native elements and Vue component instances.
 *
 * @param refValue - The value from fieldRef.value
 * @returns The focusable HTMLElement, or null if not found
 */
export function getFocusableElement(refValue: unknown): HTMLElement | null {
  // Try to get the input element first
  const input = getInputElement(refValue)
  if (input) return input

  // For Vue components that have focus() on $el (like some button components)
  if (typeof refValue === 'object' && refValue && '$el' in refValue) {
    const el = (refValue as { $el: unknown }).$el
    if (el instanceof HTMLElement && typeof el.focus === 'function') {
      return el
    }
  }

  // Check if the refValue itself is focusable
  if (refValue instanceof HTMLElement && typeof refValue.focus === 'function') {
    return refValue
  }

  return null
}

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
  fieldRefs: Map<string, Ref<unknown>>,
  fieldOptions: Map<string, RegisterOptions>,
  formData: Record<string, unknown>,
): void {
  for (const [name, fieldRef] of Array.from(fieldRefs.entries())) {
    const el = getInputElement(fieldRef.value)
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
 * Supports both native elements and Vue component instances.
 *
 * @param refValue - The ref value (HTMLInputElement, Vue component, or null)
 * @param value - The value to set
 */
export function updateDomElement(refValue: unknown, value: unknown): void {
  const el = getInputElement(refValue)
  if (!el) return

  if (el.type === 'checkbox') {
    el.checked = value as boolean
  } else {
    el.value = value as string
  }
}
