/**
 * Development-mode warning utilities
 * All exports are designed to be tree-shaken in production
 */
import type { ZodType, ZodObject, ZodArray } from 'zod'

/**
 * DEV flag for tree-shaking
 * In production builds, this becomes `false` and all warning code is eliminated
 */
export const __DEV__: boolean =
  typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true

// Track warnings already shown to avoid console spam
const warnedMessages = new Set<string>()

/**
 * Warn once per unique message (prevents spam on re-renders)
 */
export function warnOnce(message: string, key?: string): void {
  if (!__DEV__) return

  const cacheKey = key ?? message
  if (warnedMessages.has(cacheKey)) return

  warnedMessages.add(cacheKey)
  console.warn(`[vue-hook-form] ${message}`)
}

/**
 * Warn every time (for errors that should always be shown)
 */
export function warn(message: string): void {
  if (!__DEV__) return
  console.warn(`[vue-hook-form] ${message}`)
}

/**
 * Clear warning cache (useful for testing)
 */
export function clearWarningCache(): void {
  if (!__DEV__) return
  warnedMessages.clear()
}

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Validate a dot-notation path string for common syntax errors
 * @returns Error message or null if valid
 */
export function validatePathSyntax(path: string): string | null {
  if (!__DEV__) return null

  // Empty path
  if (!path || path.trim() === '') {
    return 'Path cannot be empty'
  }

  // Empty segments (e.g., "user..name" or ".name" or "name.")
  if (path.startsWith('.') || path.endsWith('.') || path.includes('..')) {
    return `Invalid path "${path}": contains empty segments`
  }

  // Bracket notation (common mistake from JS/React)
  if (path.includes('[')) {
    return `Invalid path "${path}": use dot notation (e.g., "items.0") instead of bracket notation (e.g., "items[0]")`
  }

  // Whitespace
  if (/\s/.test(path)) {
    return `Invalid path "${path}": paths cannot contain whitespace`
  }

  return null
}

/**
 * Traverse a Zod schema following a dot-notation path
 * Returns the schema at the end of the path, or error info if invalid
 */
function traverseSchemaPath(
  schema: ZodType,
  path: string,
): { schema: ZodType } | { error: string; availableFields?: string[]; segmentIndex: number } {
  const segments = path.split('.')
  let currentSchema: ZodType = schema

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (!segment) continue

    currentSchema = unwrapSchema(currentSchema)

    if (isZodObject(currentSchema)) {
      const shape = currentSchema.shape as Record<string, ZodType>
      if (segment in shape) {
        const nextSchema = shape[segment]
        if (nextSchema) {
          currentSchema = nextSchema
          continue
        }
      }
      return {
        error: `Field "${segments.slice(0, i + 1).join('.')}" does not exist in schema`,
        availableFields: Object.keys(shape),
        segmentIndex: i,
      }
    }

    if (isZodArray(currentSchema) && /^\d+$/.test(segment)) {
      currentSchema = currentSchema.element
      continue
    }

    return {
      error: `Cannot navigate path "${path}" at segment "${segment}"`,
      segmentIndex: i,
    }
  }

  return { schema: currentSchema }
}

/**
 * Check if a path exists in a Zod schema
 * This is a runtime check to validate paths against the schema structure
 */
export function validatePathAgainstSchema(
  schema: ZodType,
  path: string,
): { valid: boolean; reason?: string; availableFields?: string[] } {
  if (!__DEV__) return { valid: true }

  try {
    const result = traverseSchemaPath(schema, path)
    if ('error' in result) {
      return {
        valid: false,
        reason: result.error,
        availableFields: result.availableFields,
      }
    }
    return { valid: true }
  } catch {
    return { valid: true }
  }
}

/**
 * Check if a path points to an array field in the schema
 */
export function isArrayFieldInSchema(schema: ZodType, path: string): boolean | null {
  if (!__DEV__) return null

  try {
    const result = traverseSchemaPath(schema, path)
    if ('error' in result) return null
    return isZodArray(unwrapSchema(result.schema))
  } catch {
    return null
  }
}

// ============================================================================
// Specialized Warning Functions
// ============================================================================

/**
 * Warn about registering an invalid path
 */
export function warnInvalidPath(fnName: string, path: string, reason: string): void {
  if (!__DEV__) return
  warnOnce(`${fnName}("${path}"): ${reason}`, `invalid-path:${fnName}:${path}`)
}

/**
 * Warn about path not in schema
 */
export function warnPathNotInSchema(
  fnName: string,
  path: string,
  availableFields?: string[],
): void {
  if (!__DEV__) return
  let message = `${fnName}("${path}"): Path does not exist in your Zod schema.`
  if (availableFields && availableFields.length > 0) {
    message += ` Available fields at this level: ${availableFields.join(', ')}`
  }
  warnOnce(message, `path-not-in-schema:${fnName}:${path}`)
}

/**
 * Warn about calling fields() on non-array path
 */
export function warnFieldsOnNonArray(path: string): void {
  if (!__DEV__) return
  warnOnce(
    `fields("${path}"): Expected an array field, but this path does not point to an array in your schema. ` +
      `The fields() method is only for array fields. Use register() for non-array fields.`,
    `fields-non-array:${path}`,
  )
}

/**
 * Warn about silent field array operation failures
 */
export function warnArrayOperationRejected(
  operation: string,
  path: string,
  reason: 'maxLength' | 'minLength',
  details?: { current: number; limit: number },
): void {
  if (!__DEV__) return

  const messages: Record<string, string> = {
    maxLength: details
      ? `Would exceed maxLength (current: ${details.current}, max: ${details.limit})`
      : 'Would exceed maxLength rule',
    minLength: details
      ? `Would violate minLength (current: ${details.current}, min: ${details.limit})`
      : 'Would violate minLength rule',
  }

  warn(`${operation}() on "${path}": ${messages[reason]}. Operation was silently ignored.`)
}

/**
 * Warn about array operation with out of bounds index
 */
export function warnArrayIndexOutOfBounds(
  operation: string,
  path: string,
  index: number,
  length: number,
): void {
  if (!__DEV__) return
  warn(
    `${operation}() on "${path}": Index ${index} is out of bounds (array length: ${length}). ` +
      `Operation was silently ignored.`,
  )
}

// ============================================================================
// Type Guards for Zod Schema Introspection
// ============================================================================

// Helper to safely access Zod internal def properties
function getDefProp(schema: ZodType, prop: string): unknown {
  return (schema.def as unknown as Record<string, unknown>)[prop]
}

function getTypeName(schema: ZodType): string | undefined {
  return getDefProp(schema, 'typeName') as string | undefined
}

function isZodObject(schema: ZodType): schema is ZodObject<Record<string, ZodType>> {
  return getTypeName(schema) === 'ZodObject'
}

function isZodArray(schema: ZodType): schema is ZodArray<ZodType> {
  return getTypeName(schema) === 'ZodArray'
}

function unwrapSchema(schema: ZodType): ZodType {
  const typeName = getTypeName(schema)
  const innerType = getDefProp(schema, 'innerType') as ZodType | undefined
  const schemaType = getDefProp(schema, 'schema') as ZodType | undefined

  // Unwrap ZodOptional, ZodNullable, ZodDefault
  if (
    (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') &&
    innerType
  ) {
    return unwrapSchema(innerType)
  }

  // Unwrap ZodEffects (refinements, transforms)
  if (typeName === 'ZodEffects' && schemaType) {
    return unwrapSchema(schemaType)
  }

  return schema
}
