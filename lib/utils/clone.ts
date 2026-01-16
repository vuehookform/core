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
 * - Circular references (returns original reference to break cycle)
 *
 * Does NOT handle (by design, not needed for form data):
 * - Map/Set/WeakMap/WeakSet
 * - Functions
 * - Symbols
 * - Class instances (cloned as plain objects)
 */
export function deepClone<T>(obj: T, seen?: WeakSet<object>): T {
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

  // Initialize seen set for tracking circular references
  if (!seen) {
    seen = new WeakSet()
  }

  // Check for circular reference - return original to break cycle
  if (seen.has(obj as object)) {
    return obj
  }

  // Mark this object as seen before recursing
  seen.add(obj as object)

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item, seen)) as T
  }

  // Handle plain objects
  const cloned = {} as T
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key], seen)
    }
  }

  return cloned
}
