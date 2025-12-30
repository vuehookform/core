import type { ShallowRef } from 'vue'

/**
 * Mark a field as dirty (value has changed from default).
 * Optimized to skip clone if already dirty.
 *
 * @param dirtyFields - The reactive dirty fields record
 * @param fieldName - Name of the field to mark as dirty
 */
export function markFieldDirty(
  dirtyFields: ShallowRef<Record<string, boolean>>,
  fieldName: string,
): void {
  // Skip if already dirty (avoid unnecessary object clone)
  if (dirtyFields.value[fieldName]) return
  dirtyFields.value = { ...dirtyFields.value, [fieldName]: true }
}

/**
 * Mark a field as touched (user has interacted with it).
 * Optimized to skip clone if already touched.
 *
 * @param touchedFields - The reactive touched fields record
 * @param fieldName - Name of the field to mark as touched
 */
export function markFieldTouched(
  touchedFields: ShallowRef<Record<string, boolean>>,
  fieldName: string,
): void {
  // Skip if already touched (avoid unnecessary object clone)
  if (touchedFields.value[fieldName]) return
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
  // Skip if not dirty (avoid unnecessary object clone)
  if (!(fieldName in dirtyFields.value)) return
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
  // Skip if not touched (avoid unnecessary object clone)
  if (!(fieldName in touchedFields.value)) return
  const newTouched = { ...touchedFields.value }
  delete newTouched[fieldName]
  touchedFields.value = newTouched
}

/**
 * Clear errors for a field and its nested paths.
 * Optimized with early exit if nothing to delete.
 *
 * @param errors - The reactive errors record
 * @param fieldName - Name of the field (clears exact match and all nested paths)
 */
export function clearFieldErrors<T>(
  errors: ShallowRef<Record<string, T>>,
  fieldName: string,
): void {
  const currentErrors = errors.value
  const keys = Object.keys(currentErrors)

  // Early exit if no errors
  if (keys.length === 0) return

  // Pre-compute prefix for nested path matching
  const prefix = `${fieldName}.`

  // Collect keys to delete
  const keysToDelete: string[] = []
  for (const key of keys) {
    if (key === fieldName || key.startsWith(prefix)) {
      keysToDelete.push(key)
    }
  }

  // Early exit if nothing to delete
  if (keysToDelete.length === 0) return

  // Clone and delete
  const newErrors = { ...currentErrors }
  for (const key of keysToDelete) {
    delete newErrors[key]
  }
  errors.value = newErrors
}
