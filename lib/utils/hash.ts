/**
 * Monotonic counter for generating unique hashes for non-serializable values.
 * Used instead of Date.now() to avoid collisions within the same millisecond.
 */
let uniqueIdCounter = 0

/**
 * Fast value hashing for validation cache.
 * Uses JSON.stringify for objects/arrays, direct conversion for primitives.
 * Returns a string that can be compared for equality.
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
      // Circular reference or other JSON error - return unique hash
      return `o:_${++uniqueIdCounter}`
    }
  }

  // Functions and symbols - return unique identifier
  return `x:_${++uniqueIdCounter}`
}
