import type { ShallowRef } from 'vue'

/**
 * Mark a field as dirty (value has changed from default)
 *
 * @param dirtyFields - The reactive dirty fields record
 * @param fieldName - Name of the field to mark as dirty
 */
export function markFieldDirty(
  dirtyFields: ShallowRef<Record<string, boolean>>,
  fieldName: string,
): void {
  dirtyFields.value = { ...dirtyFields.value, [fieldName]: true }
}

/**
 * Mark a field as touched (user has interacted with it)
 *
 * @param touchedFields - The reactive touched fields record
 * @param fieldName - Name of the field to mark as touched
 */
export function markFieldTouched(
  touchedFields: ShallowRef<Record<string, boolean>>,
  fieldName: string,
): void {
  touchedFields.value = { ...touchedFields.value, [fieldName]: true }
}

/**
 * Clear dirty state for a field
 *
 * @param dirtyFields - The reactive dirty fields record
 * @param fieldName - Name of the field to clear
 */
export function clearFieldDirty(
  dirtyFields: ShallowRef<Record<string, boolean>>,
  fieldName: string,
): void {
  const newDirty = { ...dirtyFields.value }
  delete newDirty[fieldName]
  dirtyFields.value = newDirty
}

/**
 * Clear touched state for a field
 *
 * @param touchedFields - The reactive touched fields record
 * @param fieldName - Name of the field to clear
 */
export function clearFieldTouched(
  touchedFields: ShallowRef<Record<string, boolean>>,
  fieldName: string,
): void {
  const newTouched = { ...touchedFields.value }
  delete newTouched[fieldName]
  touchedFields.value = newTouched
}

/**
 * Clear errors for a field and its nested paths
 *
 * @param errors - The reactive errors record
 * @param fieldName - Name of the field (clears exact match and all nested paths)
 */
export function clearFieldErrors<T>(
  errors: ShallowRef<Record<string, T>>,
  fieldName: string,
): void {
  const newErrors = { ...errors.value }
  for (const key of Object.keys(newErrors)) {
    if (key === fieldName || key.startsWith(`${fieldName}.`)) {
      delete newErrors[key]
    }
  }
  errors.value = newErrors
}
