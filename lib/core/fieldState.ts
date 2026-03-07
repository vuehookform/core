import type { ShallowRef } from 'vue'
import { hashValue } from '../utils/hash'
import { get, unset } from '../utils/paths'

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
 * Clear dirty state for a field.
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
 * Clear touched state for a field.
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

  // Early exit if no errors
  if (Object.keys(currentErrors).length === 0) return

  // Check for nested path error (e.g., 'user.email' stored as { user: { email: "error" } })
  const nestedError = get(currentErrors, fieldName)

  // Check for flat key matches (e.g., 'user.email' or 'user.email.something' as top-level keys)
  const prefix = `${fieldName}.`
  const flatKeysToDelete: string[] = []
  for (const key of Object.keys(currentErrors)) {
    if (key === fieldName || key.startsWith(prefix)) {
      flatKeysToDelete.push(key)
    }
  }

  // Early exit if nothing to clear
  if (nestedError === undefined && flatKeysToDelete.length === 0) return

  // Clone and clear
  const newErrors = { ...currentErrors }
  for (const key of flatKeysToDelete) {
    delete newErrors[key]
  }
  if (nestedError !== undefined) {
    unset(newErrors as Record<string, unknown>, fieldName)
  }
  errors.value = newErrors
}

/**
 * Update field dirty state based on value comparison with default.
 * Field is dirty only if current value differs from default value.
 *
 * Uses lazy hash computation - default hashes are computed on first access
 * and cached for subsequent comparisons.
 *
 * @param dirtyFields - The reactive dirty fields record
 * @param defaultValues - The original default values
 * @param defaultValueHashes - Cache of hashed default values
 * @param fieldName - Name of the field to check
 * @param currentValue - The current value to compare against default
 */
export function updateFieldDirtyState(
  dirtyFields: ShallowRef<Record<string, boolean>>,
  defaultValues: Record<string, unknown>,
  defaultValueHashes: Map<string, string>,
  fieldName: string,
  currentValue: unknown,
): void {
  // Get or compute default hash (lazy initialization)
  let defaultHash = defaultValueHashes.get(fieldName)
  if (defaultHash === undefined) {
    const defaultValue = get(defaultValues, fieldName)
    defaultHash = hashValue(defaultValue)
    defaultValueHashes.set(fieldName, defaultHash)
  }

  const currentHash = hashValue(currentValue)
  const isDirty = currentHash !== defaultHash
  const wasDirty = dirtyFields.value[fieldName] === true

  if (isDirty && !wasDirty) {
    // Became dirty - value differs from default
    dirtyFields.value = { ...dirtyFields.value, [fieldName]: true }
  } else if (!isDirty && wasDirty) {
    // Reverted to clean - value matches default
    const newDirty = { ...dirtyFields.value }
    delete newDirty[fieldName]
    dirtyFields.value = newDirty
  }
  // If isDirty === wasDirty, no change needed
}
