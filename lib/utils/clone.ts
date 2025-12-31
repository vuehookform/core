/**
 * Deep clone utility for form values.
 * Handles common types without JSON.parse/stringify overhead.
 *
 * Properly handles:
 * - Primitives (pass-through)
 * - Plain objects (recursive clone)
 * - Arrays (recursive clone)
 * - Date objects (new Date instance)
 * - null/undefined (pass-through)
 *
 * Does NOT handle (by design, not needed for form data):
 * - Circular references
 * - Map/Set/WeakMap/WeakSet
 * - Functions
 * - Symbols
 * - Class instances (cloned as plain objects)
 */
export function deepClone<T>(obj: T): T {
  // Handle null/undefined and primitives
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj !== 'object') {
    return obj
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T
  }

  // Handle plain objects
  const cloned = {} as T
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }

  return cloned
}
