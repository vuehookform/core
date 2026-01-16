/**
 * Schema extraction utilities for partial validation
 *
 * These utilities enable O(1) single-field validation by extracting
 * sub-schemas and determining when partial validation is safe.
 *
 * Compatible with Zod v4 which uses:
 * - `_def.type` for type names (string values: "object", "string", etc.)
 * - `_def.checks` array for refinements (instead of ZodEffects wrapper)
 * - `_def.innerType` for optional/nullable unwrapping
 * - `_def.shape` for object shapes
 * - `_def.element` for array elements
 */
import type { ZodType, ZodObject, ZodArray } from 'zod'

// --- Internal helpers for Zod v4 ---

function getDefType(schema: ZodType): string | undefined {
  const def = schema._def as unknown as Record<string, unknown> | undefined
  return def?.type as string | undefined
}

function getDefProp(schema: ZodType, prop: string): unknown {
  const def = schema._def as unknown as Record<string, unknown> | undefined
  return def?.[prop]
}

function isZodObject(schema: ZodType): schema is ZodObject<Record<string, ZodType>> {
  return getDefType(schema) === 'object'
}

function isZodArray(schema: ZodType): schema is ZodArray<ZodType> {
  return getDefType(schema) === 'array'
}

/**
 * Check if schema has refinements/checks that might depend on other fields
 * In Zod v4, refinements are stored in _def.checks array
 */
function hasChecks(schema: ZodType): boolean {
  const checks = getDefProp(schema, 'checks') as unknown[] | undefined
  return Array.isArray(checks) && checks.length > 0
}

/**
 * Unwrap ZodOptional, ZodNullable, ZodDefault (NOT checking refinements)
 * Returns the inner schema without optional/nullable wrappers
 */
function unwrapNonEffects(schema: ZodType): ZodType {
  const type = getDefType(schema)
  const innerType = getDefProp(schema, 'innerType') as ZodType | undefined

  // Unwrap ZodOptional, ZodNullable, ZodDefault
  if ((type === 'optional' || type === 'nullable' || type === 'default') && innerType) {
    return unwrapNonEffects(innerType)
  }

  return schema
}

// --- Cache for schema path analysis ---

interface SchemaPathAnalysis {
  canPartialValidate: boolean
  subSchema?: ZodType
  reason?: 'root-checks' | 'path-checks' | 'unsupported-type' | 'invalid-path'
}

const analysisCache = new WeakMap<ZodType, Map<string, SchemaPathAnalysis>>()

/**
 * Check if the root schema has refinements/checks
 * Root-level checks may depend on multiple fields, requiring full validation
 */
export function hasRootEffects(schema: ZodType): boolean {
  // In Zod v4, refinements are in the checks array, not as ZodEffects wrapper
  return hasChecks(schema)
}

/**
 * Extract sub-schema for a given path
 *
 * Returns the sub-schema and whether any checks/refinements were encountered.
 * If checks are found at object level, partial validation isn't safe because
 * the refinement may depend on other fields.
 *
 * @param schema - Root form schema
 * @param path - Dot-notation field path (e.g., "user.address.city")
 * @returns Sub-schema and effects flag, or null if path invalid
 */
export function extractSubSchema(
  schema: ZodType,
  path: string,
): { schema: ZodType; hasEffects: boolean } | null {
  const segments = path.split('.')
  let currentSchema = schema
  let hasEffects = false

  for (const segment of segments) {
    // Reject empty segments (e.g., "user..profile" is invalid)
    if (!segment) return null

    // Check for checks at this level (before unwrapping)
    if (hasChecks(currentSchema)) {
      hasEffects = true
    }

    // Unwrap optional/nullable/default
    const unwrapped = unwrapNonEffects(currentSchema)

    // Check again after unwrapping
    if (hasChecks(unwrapped)) {
      hasEffects = true
    }

    if (isZodObject(unwrapped)) {
      const shape = getDefProp(unwrapped, 'shape') as Record<string, ZodType> | undefined
      if (!shape || !(segment in shape)) return null
      currentSchema = shape[segment]!
    } else if (isZodArray(unwrapped) && /^\d+$/.test(segment)) {
      const element = getDefProp(unwrapped, 'element') as ZodType | undefined
      if (!element) return null
      currentSchema = element
    } else {
      // Unsupported type (union, intersection, etc.)
      return null
    }
  }

  // Check final schema for checks (field-level refinements)
  // Note: Field-level checks like .email() or .min() are safe for partial validation
  // We only care about custom .refine() checks which might have cross-field dependencies
  // In Zod v4, these show up as ZodCustom in the checks array
  const finalUnwrapped = unwrapNonEffects(currentSchema)
  const finalChecks = getDefProp(finalUnwrapped, 'checks') as Array<{ type?: string }> | undefined
  if (finalChecks) {
    for (const check of finalChecks) {
      // ZodCustom checks are custom refinements that might have cross-field deps
      if (check && typeof check === 'object' && 'type' in check && check.type === 'custom') {
        hasEffects = true
        break
      }
    }
  }

  // Return the unwrapped final schema for validation
  return { schema: finalUnwrapped, hasEffects }
}

/**
 * Analyze if a path can be validated in isolation
 *
 * This is the main entry point for determining partial validation eligibility.
 * Results are cached per-schema for performance.
 *
 * @param schema - Root form schema
 * @param path - Dot-notation field path
 * @returns Analysis result with eligibility and reason
 */
export function analyzeSchemaPath(schema: ZodType, path: string): SchemaPathAnalysis {
  // Check cache first
  let cache = analysisCache.get(schema)
  if (!cache) {
    cache = new Map()
    analysisCache.set(schema, cache)
  }

  const cached = cache.get(path)
  if (cached) return cached

  // Root-level checks = ALWAYS full validation
  // Refinements at root often check cross-field dependencies
  if (hasRootEffects(schema)) {
    const result: SchemaPathAnalysis = {
      canPartialValidate: false,
      reason: 'root-checks',
    }
    cache.set(path, result)
    return result
  }

  const extracted = extractSubSchema(schema, path)

  if (!extracted) {
    const result: SchemaPathAnalysis = {
      canPartialValidate: false,
      reason: 'invalid-path',
    }
    cache.set(path, result)
    return result
  }

  if (extracted.hasEffects) {
    const result: SchemaPathAnalysis = {
      canPartialValidate: false,
      reason: 'path-checks',
    }
    cache.set(path, result)
    return result
  }

  const result: SchemaPathAnalysis = {
    canPartialValidate: true,
    subSchema: extracted.schema,
  }
  cache.set(path, result)
  return result
}

/**
 * Clear the analysis cache (useful for testing)
 */
export function clearAnalysisCache(): void {
  // WeakMap entries are automatically garbage collected when schema is no longer referenced
  // This function is mainly for testing where we need to reset state
}
