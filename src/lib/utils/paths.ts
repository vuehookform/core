/**
 * Get value from object using dot notation path
 * @example get({ user: { name: 'John' } }, 'user.name') => 'John'
 */
export function get(obj: unknown, path: string): unknown {
  if (!path || obj === null || obj === undefined) return obj

  const keys = path.split('.')
  let result: unknown = obj

  for (const key of keys) {
    if (result === null || result === undefined) {
      return undefined
    }
    result = (result as Record<string, unknown>)[key]
  }

  return result
}

/**
 * Set value in object using dot notation path
 * @example set({}, 'user.name', 'John') => { user: { name: 'John' } }
 */
export function set(obj: Record<string, unknown>, path: string, value: unknown): void {
  if (!path) return

  const keys = path.split('.')

  // Prototype pollution protection
  const UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype']
  if (keys.some((k) => UNSAFE_KEYS.includes(k))) return
  const lastKey = keys.pop()!
  let current: Record<string, unknown> = obj

  // Create nested objects as needed
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      // Check if next key is a number to create array vs object
      const nextKey = keys[keys.indexOf(key) + 1]
      current[key] = nextKey && /^\d+$/.test(nextKey) ? [] : {}
    }
    current = current[key] as Record<string, unknown>
  }

  current[lastKey] = value
}

/**
 * Delete value from object using dot notation path
 * @example unset({ user: { name: 'John' } }, 'user.name') => { user: {} }
 */
export function unset(obj: Record<string, unknown>, path: string): void {
  if (!path) return

  const keys = path.split('.')
  const lastKey = keys.pop()!
  let current: Record<string, unknown> = obj

  for (const key of keys) {
    if (!(key in current)) return
    current = current[key] as Record<string, unknown>
  }

  delete current[lastKey]
}

/**
 * Check if path exists in object
 */
export function has(obj: Record<string, unknown>, path: string): boolean {
  return get(obj, path) !== undefined
}

/**
 * Generate a unique ID for field array items
 */
let idCounter = 0
export function generateId(): string {
  return `field_${Date.now()}_${idCounter++}`
}

/**
 * Check if a path represents an array index
 * @example isArrayPath('users.0') => true
 * @example isArrayPath('users.name') => false
 */
export function isArrayPath(path: string): boolean {
  const lastSegment = path.split('.').pop()
  return /^\d+$/.test(lastSegment || '')
}

/**
 * Get parent path
 * @example getParentPath('user.addresses.0.street') => 'user.addresses.0'
 */
export function getParentPath(path: string): string | undefined {
  const segments = path.split('.')
  if (segments.length <= 1) return undefined
  segments.pop()
  return segments.join('.')
}

/**
 * Get field name from path
 * @example getFieldName('user.addresses.0.street') => 'street'
 */
export function getFieldName(path: string): string {
  return path.split('.').pop() || path
}
