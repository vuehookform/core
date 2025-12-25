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
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i] as string
    const existing = current[key]

    if (existing !== undefined && existing !== null && typeof existing !== 'object') {
      // Warn when overwriting a primitive with an object structure (dev only)
      // Use try-catch to handle environments where process is not defined
      try {
        const proc = (globalThis as Record<string, unknown>).process as Record<string, Record<string, string>> | undefined
        if (proc?.env?.NODE_ENV !== 'production') {
          console.warn(
            `[vue-hook-form] set(): Overwriting primitive value at path "${keys.slice(0, i + 1).join('.')}" with an object. ` +
              `Previous value: ${JSON.stringify(existing)}`,
          )
        }
      } catch {
        // Silently ignore in environments where process doesn't exist
      }
    }

    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      // Check if next key is a number to create array vs object
      const nextKey = keys[i + 1]
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
    // Return early if path doesn't exist or intermediate value is null/non-object
    if (!(key in current)) return
    const next = current[key]
    if (next === null || typeof next !== 'object') return
    current = next as Record<string, unknown>
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
 * Uses timestamp + counter + random string for uniqueness across HMR reloads
 */
let idCounter = 0
export function generateId(): string {
  const random = Math.random().toString(36).substring(2, 11)
  return `field_${Date.now()}_${idCounter++}_${random}`
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
