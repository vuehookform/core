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
 * - Circular references (recreates the circular structure in the clone)
 *
 * Does NOT handle (by design, not needed for form data):
 * - Map/Set/WeakMap/WeakSet
 * - Functions
 * - Symbols
 * - Class instances (cloned as plain objects)
 */
export function deepClone<T>(obj: T, seen?: Map<object, unknown>): T {
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

  // Initialize seen map for tracking circular references
  // Map tracks original -> clone mappings so we can recreate circular refs
  if (!seen) {
    seen = new Map()
  }

  // Check for circular reference - return the already-created clone
  const existingClone = seen.get(obj as object)
  if (existingClone !== undefined) {
    return existingClone as T
  }

  // Handle Array
  if (Array.isArray(obj)) {
    const clonedArray: unknown[] = []
    // Register clone BEFORE recursing to handle circular refs within the array
    seen.set(obj as object, clonedArray)
    for (const item of obj) {
      clonedArray.push(deepClone(item, seen))
    }
    return clonedArray as T
  }

  // Handle plain objects
  const cloned = {} as T
  // Register clone BEFORE recursing to handle circular refs within the object
  seen.set(obj as object, cloned)
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key], seen)
    }
  }

  return cloned
}
