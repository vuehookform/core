/**
 * Monotonic counter for generating unique hashes for non-serializable values.
 * Used instead of Date.now() to avoid collisions within the same millisecond.
 */
let uniqueIdCounter = 0

/**
 * WeakMap to track circular references for stable hashing.
 * Same circular object always returns the same hash ID.
 */
const circularRefMap = new WeakMap<object, string>()

/**
 * Fast value hashing for validation cache.
 * Uses JSON.stringify for objects/arrays, direct conversion for primitives.
 * Returns a string that can be compared for equality.
 *
 * Handles circular references by assigning stable IDs via WeakMap,
 * ensuring the same object always produces the same hash.
 */
export function hashValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  const type = typeof value

  // Primitives: direct string conversion
  if (type === 'string') return `s:${value}`
  if (type === 'number') return `n:${value}`
  if (type === 'boolean') return `b:${value}`

  // Objects and arrays: JSON stringify
  // This handles nested structures and is fast enough for form values
  if (type === 'object') {
    try {
      return `o:${JSON.stringify(value)}`
    } catch {
      // Circular reference or other JSON error
      // Use WeakMap to ensure stable hash for same object
      let id = circularRefMap.get(value as object)
      if (!id) {
        id = String(++uniqueIdCounter)
        circularRefMap.set(value as object, id)
      }
      return `o:_${id}`
    }
  }

  // Functions and symbols - return unique identifier
  return `x:_${++uniqueIdCounter}`
}
