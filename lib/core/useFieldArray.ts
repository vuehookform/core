import { ref, nextTick } from 'vue'
import type { FormContext } from './formContext'
import type {
  FieldArray,
  FieldArrayItem,
  FieldArrayOptions,
  FieldArrayFocusOptions,
  Path,
} from '../types'
import { get, set, generateId } from '../utils/paths'
import {
  __DEV__,
  validatePathSyntax,
  validatePathAgainstSchema,
  isArrayFieldInSchema,
  warnInvalidPath,
  warnPathNotInSchema,
  warnFieldsOnNonArray,
  warnArrayOperationRejected,
  warnArrayIndexOutOfBounds,
} from '../utils/devWarnings'
import { markFieldDirty } from './fieldState'

/**
 * Create field array management functions
 */
export function createFieldArrayManager<FormValues>(
  ctx: FormContext<FormValues>,
  validate: (fieldPath?: string) => Promise<boolean>,
  setFocus: (name: string) => void,
) {
  /**
   * Manage dynamic field arrays with stable keys for Vue reconciliation.
   *
   * @param name - Array field path (must be an array in schema)
   * @param options - Optional configuration including validation rules
   * @returns FieldArray API with all array manipulation methods
   *
   * @example Basic field array usage
   * ```ts
   * const schema = z.object({
   *   addresses: z.array(z.object({
   *     street: z.string(),
   *     city: z.string()
   *   })).min(1)
   * })
   *
   * const { fields, register } = useForm({
   *   schema,
   *   defaultValues: { addresses: [{ street: '', city: '' }] }
   * })
   *
   * const addressFields = fields('addresses')
   * ```
   *
   * @example Template usage with stable keys (CRITICAL)
   * ```vue
   * <template>
   *   <div v-for="field in addressFields.value" :key="field.key">
   *     <!-- IMPORTANT: Use field.key for :key, NOT the index! -->
   *     <!-- Using index causes inputs to show wrong values when items are reordered -->
   *
   *     <input v-bind="register(`addresses.${field.index}.street`)" />
   *     <input v-bind="register(`addresses.${field.index}.city`)" />
   *     <button @click="field.remove()">Remove</button>
   *   </div>
   *
   *   <button @click="addressFields.append({ street: '', city: '' })">
   *     Add Address
   *   </button>
   * </template>
   * ```
   *
   * @example With minLength/maxLength rules
   * ```ts
   * const items = fields('items', {
   *   rules: {
   *     minLength: { value: 1, message: 'At least one item required' },
   *     maxLength: { value: 10, message: 'Maximum 10 items' }
   *   }
   * })
   *
   * // Operations that violate rules are rejected with console warning in dev
   * items.removeAll()  // Rejected if minLength > 0
   * items.append(newItem)  // Rejected if already at maxLength
   * ```
   *
   * @example Array operations
   * ```ts
   * // Add to end
   * addressFields.append({ street: '', city: '' })
   *
   * // Add multiple at once
   * addressFields.append([
   *   { street: '123 Main St', city: 'NYC' },
   *   { street: '456 Oak Ave', city: 'LA' }
   * ])
   *
   * // Add to beginning
   * addressFields.prepend({ street: '', city: '' })
   *
   * // Insert at specific index
   * addressFields.insert(1, { street: '', city: '' })
   *
   * // Reorder items
   * addressFields.swap(0, 1)  // Swap first and second
   * addressFields.move(2, 0)  // Move third to first position
   *
   * // Update in place (preserves key)
   * addressFields.update(0, { street: 'Updated', city: 'Updated' })
   *
   * // Remove
   * addressFields.remove(0)  // Remove first
   * addressFields.removeMany([0, 2, 4])  // Remove multiple
   * addressFields.removeAll()  // Remove all (respects minLength)
   *
   * // Replace all
   * addressFields.replace([{ street: 'New', city: 'New' }])
   * ```
   *
   * @example Focus after adding (accessibility)
   * ```ts
   * // Focus first field of new item after append
   * addressFields.append({ street: '', city: '' }, {
   *   shouldFocus: true,
   *   focusName: 'street'  // Focus addresses.X.street
   * })
   * ```
   *
   * @see FieldArrayItem - Item metadata with key, index, remove()
   * @see FieldArrayFocusOptions - Auto-focus after append/prepend/insert
   */
  function fields<TPath extends Path<FormValues>>(
    name: TPath,
    options?: FieldArrayOptions,
  ): FieldArray {
    // Dev-mode path validation (tree-shaken in production)
    if (__DEV__) {
      // Check for syntax errors in the path
      const syntaxError = validatePathSyntax(name)
      if (syntaxError) {
        warnInvalidPath('fields', name, syntaxError)
      }

      // Validate path exists in schema
      const schemaResult = validatePathAgainstSchema(ctx.options.schema, name)
      if (!schemaResult.valid) {
        warnPathNotInSchema('fields', name, schemaResult.availableFields)
      }

      // Warn if path is not an array field
      const isArray = isArrayFieldInSchema(ctx.options.schema, name)
      if (isArray === false) {
        warnFieldsOnNonArray(name)
      }
    }

    // Get or create field array entry
    let fieldArray = ctx.fieldArrays.get(name)

    if (!fieldArray) {
      const existingValues = (get(ctx.formData, name) || []) as unknown[]
      fieldArray = {
        items: ref<FieldArrayItem[]>([]),
        values: existingValues,
        // Index cache stored on fieldArray for O(1) lookups, shared across fields() calls
        indexCache: new Map<string, number>(),
        // Store rules for validation
        rules: options?.rules,
      }
      ctx.fieldArrays.set(name, fieldArray)

      // Initialize form data if needed
      if (!get(ctx.formData, name)) {
        set(ctx.formData, name, [] as unknown[])
      }
    } else if (options?.rules) {
      // Update rules if provided on subsequent calls
      fieldArray.rules = options.rules
    }

    // Capture reference for closures
    const fa = fieldArray

    // Use the shared index cache from fieldArray state
    const indexCache = fa.indexCache

    /**
     * Rebuild the index cache from current items array.
     * Used when full rebuild is necessary (e.g., initial load, replace).
     */
    const rebuildIndexCache = () => {
      indexCache.clear()
      fa.items.value.forEach((item, idx) => {
        indexCache.set(item.key, idx)
      })
    }

    /**
     * Incrementally add new items to cache (for append).
     * Only updates the new entries - O(k) where k = number of new items.
     */
    const appendToCache = (startIndex: number) => {
      const items = fa.items.value
      for (let i = startIndex; i < items.length; i++) {
        const item = items[i]
        if (item) indexCache.set(item.key, i)
      }
    }

    /**
     * Update cache after prepend/insert: shift existing indices and add new.
     * O(n) but avoids clear() + full rebuild overhead.
     */
    const updateCacheAfterInsert = (insertIndex: number, _insertCount: number) => {
      const items = fa.items.value
      // Update indices for all items at and after insertIndex
      for (let i = insertIndex; i < items.length; i++) {
        const item = items[i]
        if (item) indexCache.set(item.key, i)
      }
    }

    /**
     * Update cache for swap: only update 2 entries - O(1).
     */
    const swapInCache = (indexA: number, indexB: number) => {
      const items = fa.items.value
      const itemA = items[indexA]
      const itemB = items[indexB]
      if (itemA) indexCache.set(itemA.key, indexA)
      if (itemB) indexCache.set(itemB.key, indexB)
    }

    /**
     * Update cache after remove: delete key and shift indices - O(n-k) worst case.
     */
    const updateCacheAfterRemove = (removedKey: string, startIndex: number) => {
      indexCache.delete(removedKey)
      const items = fa.items.value
      // Update indices for all items at and after startIndex
      for (let i = startIndex; i < items.length; i++) {
        const item = items[i]
        if (item) indexCache.set(item.key, i)
      }
    }

    /**
     * Helper to create items with cached index lookup
     */
    const createItem = (key: string): FieldArrayItem => ({
      key,
      get index() {
        // O(1) lookup instead of O(n) findIndex
        return indexCache.get(key) ?? -1
      },
      remove() {
        const currentIndex = indexCache.get(key) ?? -1
        if (currentIndex !== -1) {
          removeAt(currentIndex)
        }
      },
    })

    // Populate items if empty (first access after creation)
    if (fa.items.value.length === 0 && fa.values.length > 0) {
      fa.items.value = fa.values.map(() => createItem(generateId()))
      rebuildIndexCache()
    }

    /**
     * Handle focus after array operations
     */
    const handleFocus = async (
      baseIndex: number,
      addedCount: number,
      focusOptions?: FieldArrayFocusOptions,
    ) => {
      // Default shouldFocus to false (opt-in behavior)
      if (!focusOptions?.shouldFocus) return

      // Wait for DOM to update
      await nextTick()

      // Determine which item to focus (relative index within added items)
      const focusItemOffset = focusOptions?.focusIndex ?? 0
      const targetIndex = baseIndex + Math.min(focusItemOffset, addedCount - 1)

      // Build the full field path
      let fieldPath = `${name}.${targetIndex}`
      if (focusOptions?.focusName) {
        fieldPath = `${fieldPath}.${focusOptions.focusName}`
      }

      // Use setFocus from useForm
      setFocus(fieldPath)
    }

    /**
     * Normalize input to always be an array (supports batch operations)
     */
    const normalizeToArray = <T>(value: T | T[]): T[] => {
      return Array.isArray(value) ? value : [value]
    }

    const append = (value: unknown | unknown[], focusOptions?: FieldArrayFocusOptions): boolean => {
      const values = normalizeToArray(value)
      if (values.length === 0) return true

      const currentValues = (get(ctx.formData, name) || []) as unknown[]
      const insertIndex = currentValues.length // Items will be added starting at this index

      // Check maxLength rule before adding
      const rules = fa.rules
      if (rules?.maxLength && currentValues.length + values.length > rules.maxLength.value) {
        if (__DEV__) {
          warnArrayOperationRejected('append', name, 'maxLength', {
            current: currentValues.length,
            limit: rules.maxLength.value,
          })
        }
        return false // Reject operation - maxLength exceeded
      }

      // Update form data (batch)
      const newValues = [...currentValues, ...values]
      set(ctx.formData, name, newValues)

      // Create items with unique keys (batch)
      const newItems = values.map(() => createItem(generateId()))
      fa.items.value = [...fa.items.value, ...newItems]
      // Incremental cache update - only add new items O(k)
      appendToCache(insertIndex)

      // Mark dirty (optimized - skips if already dirty)
      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }

      // Handle focus
      handleFocus(insertIndex, values.length, focusOptions)
      return true
    }

    const prepend = (
      value: unknown | unknown[],
      focusOptions?: FieldArrayFocusOptions,
    ): boolean => {
      const values = normalizeToArray(value)
      if (values.length === 0) return true

      const currentValues = (get(ctx.formData, name) || []) as unknown[]

      // Check maxLength rule before adding
      const rules = fa.rules
      if (rules?.maxLength && currentValues.length + values.length > rules.maxLength.value) {
        if (__DEV__) {
          warnArrayOperationRejected('prepend', name, 'maxLength', {
            current: currentValues.length,
            limit: rules.maxLength.value,
          })
        }
        return false // Reject operation - maxLength exceeded
      }

      // Update form data (batch)
      const newValues = [...values, ...currentValues]
      set(ctx.formData, name, newValues)

      // Create items with unique keys (batch)
      const newItems = values.map(() => createItem(generateId()))
      fa.items.value = [...newItems, ...fa.items.value]
      // Update all indices since we prepended (need to shift all existing)
      updateCacheAfterInsert(0, values.length)

      // Mark dirty (optimized)
      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }

      // Handle focus (items added at index 0)
      handleFocus(0, values.length, focusOptions)
      return true
    }

    const update = (index: number, value: unknown): boolean => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]
      if (index < 0 || index >= currentValues.length) {
        if (__DEV__) {
          warnArrayIndexOutOfBounds('update', name, index, currentValues.length)
        }
        return false // Invalid index
      }
      const newValues = [...currentValues]
      newValues[index] = value
      set(ctx.formData, name, newValues)

      // Keep the same key - no items array change needed (preserves stable identity)
      // No cache update needed - indices haven't changed
      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
      return true
    }

    const removeAt = (index: number): boolean => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]

      // Bounds check
      if (index < 0 || index >= currentValues.length) {
        if (__DEV__) {
          warnArrayIndexOutOfBounds('remove', name, index, currentValues.length)
        }
        return false
      }

      // Check minLength rule before removing
      const rules = fa.rules
      if (rules?.minLength && currentValues.length - 1 < rules.minLength.value) {
        if (__DEV__) {
          warnArrayOperationRejected('remove', name, 'minLength', {
            current: currentValues.length,
            limit: rules.minLength.value,
          })
        }
        return false // Reject operation - minLength would be violated
      }

      const newValues = currentValues.filter((_: unknown, i: number) => i !== index)
      set(ctx.formData, name, newValues)

      // Remove item by current index, keep others
      const keyToRemove = fa.items.value[index]?.key
      fa.items.value = fa.items.value.filter((item) => item.key !== keyToRemove)
      // Incremental cache update - only shift indices after removed item
      if (keyToRemove) {
        updateCacheAfterRemove(keyToRemove, index)
      }

      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
      return true
    }

    const insert = (
      index: number,
      value: unknown | unknown[],
      focusOptions?: FieldArrayFocusOptions,
    ): boolean => {
      const values = normalizeToArray(value)
      if (values.length === 0) return true

      const currentValues = (get(ctx.formData, name) || []) as unknown[]

      // Check maxLength rule before adding
      const rules = fa.rules
      if (rules?.maxLength && currentValues.length + values.length > rules.maxLength.value) {
        if (__DEV__) {
          warnArrayOperationRejected('insert', name, 'maxLength', {
            current: currentValues.length,
            limit: rules.maxLength.value,
          })
        }
        return false // Reject operation - maxLength exceeded
      }

      // Bounds validation: clamp index to valid range [0, length]
      const clampedIndex = Math.max(0, Math.min(index, currentValues.length))

      // Update form data (batch)
      const newValues = [
        ...currentValues.slice(0, clampedIndex),
        ...values,
        ...currentValues.slice(clampedIndex),
      ]
      set(ctx.formData, name, newValues)

      // Create items with unique keys (batch)
      const newItems = values.map(() => createItem(generateId()))
      fa.items.value = [
        ...fa.items.value.slice(0, clampedIndex),
        ...newItems,
        ...fa.items.value.slice(clampedIndex),
      ]
      // Incremental cache update - shift indices at and after insert point
      updateCacheAfterInsert(clampedIndex, values.length)

      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }

      // Handle focus
      handleFocus(clampedIndex, values.length, focusOptions)
      return true
    }

    const swap = (indexA: number, indexB: number): boolean => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]

      // Bounds validation: reject invalid indices
      if (
        indexA < 0 ||
        indexB < 0 ||
        indexA >= currentValues.length ||
        indexB >= currentValues.length
      ) {
        if (__DEV__) {
          const invalidIndex = indexA < 0 || indexA >= currentValues.length ? indexA : indexB
          warnArrayIndexOutOfBounds('swap', name, invalidIndex, currentValues.length)
        }
        return false // Invalid indices
      }

      const newValues = [...currentValues]
      ;[newValues[indexA], newValues[indexB]] = [newValues[indexB], newValues[indexA]]
      set(ctx.formData, name, newValues)

      // Swap items in array
      const newItems = [...fa.items.value]
      const itemA = newItems[indexA]
      const itemB = newItems[indexB]
      if (itemA && itemB) {
        newItems[indexA] = itemB
        newItems[indexB] = itemA
        fa.items.value = newItems
        // O(1) cache update - only update 2 entries
        swapInCache(indexA, indexB)
      }

      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
      return true
    }

    const move = (from: number, to: number): boolean => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]

      // Bounds validation: reject invalid indices
      if (from < 0 || from >= currentValues.length || to < 0) {
        if (__DEV__) {
          const invalidIndex = from < 0 || from >= currentValues.length ? from : to
          warnArrayIndexOutOfBounds('move', name, invalidIndex, currentValues.length)
        }
        return false // Invalid indices
      }

      const newValues = [...currentValues]
      const [removed] = newValues.splice(from, 1)
      if (removed !== undefined) {
        // Clamp 'to' index to valid range after removal
        const clampedTo = Math.min(to, newValues.length)
        newValues.splice(clampedTo, 0, removed)
        set(ctx.formData, name, newValues)
      }

      // Move item in array
      const newItems = [...fa.items.value]
      const [removedItem] = newItems.splice(from, 1)
      if (removedItem) {
        const clampedTo = Math.min(to, newItems.length)
        newItems.splice(clampedTo, 0, removedItem)
        fa.items.value = newItems
        // Update affected range in cache (from min to max of from/to)
        const minIdx = Math.min(from, clampedTo)
        const maxIdx = Math.max(from, clampedTo)
        const items = fa.items.value
        for (let i = minIdx; i <= maxIdx; i++) {
          const item = items[i]
          if (item) indexCache.set(item.key, i)
        }
      }

      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
      return true
    }

    const replace = (newValues: unknown[]): boolean => {
      // Validate input is array
      if (!Array.isArray(newValues)) {
        return false
      }

      // Update form data with new values
      set(ctx.formData, name, newValues)

      // Create new items with fresh keys for each value
      fa.items.value = newValues.map(() => createItem(generateId()))
      // Full rebuild needed - completely new set of items
      rebuildIndexCache()

      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)

      // Validate if needed
      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
      return true
    }

    const removeAll = (): boolean => {
      // Check minLength rule - if minLength > 0, reject
      const rules = fa.rules
      if (rules?.minLength && rules.minLength.value > 0) {
        if (__DEV__) {
          warnArrayOperationRejected('removeAll', name, 'minLength', {
            current: fa.items.value.length,
            limit: rules.minLength.value,
          })
        }
        return false // Reject operation - minLength would be violated
      }

      // Clear form data array
      set(ctx.formData, name, [])

      // Clear items tracking and cache
      fa.items.value = []
      indexCache.clear()

      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
      return true
    }

    const removeMany = (indices: number[]): boolean => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]

      // Validate indices and filter to valid ones
      const validIndices = indices.filter((i) => i >= 0 && i < currentValues.length)

      if (validIndices.length === 0) return true

      // Check minLength rule
      const rules = fa.rules
      const remainingCount = currentValues.length - validIndices.length
      if (rules?.minLength && remainingCount < rules.minLength.value) {
        if (__DEV__) {
          warnArrayOperationRejected('removeMany', name, 'minLength', {
            current: currentValues.length,
            limit: rules.minLength.value,
          })
        }
        return false // Reject operation - minLength would be violated
      }

      // Sort descending to remove from highest index first (prevents shifting issues)
      const sortedIndices = [...new Set(validIndices)].sort((a, b) => b - a)

      // Create set of indices to remove for O(1) lookup
      const indicesToRemove = new Set(sortedIndices)

      // Collect keys to remove from cache
      const keysToRemove = fa.items.value
        .filter((_, i) => indicesToRemove.has(i))
        .map((item) => item.key)

      // Filter out removed values
      const newValues = currentValues.filter((_, i) => !indicesToRemove.has(i))
      set(ctx.formData, name, newValues)

      // Remove items by indices
      fa.items.value = fa.items.value.filter((_, i) => !indicesToRemove.has(i))

      // Update cache: remove deleted keys and rebuild remaining indices
      for (const key of keysToRemove) {
        indexCache.delete(key)
      }
      // Rebuild remaining indices (simpler than tracking individual shifts)
      fa.items.value.forEach((item, idx) => {
        indexCache.set(item.key, idx)
      })

      markFieldDirty(ctx.dirtyFields, ctx.dirtyFieldCount, name)

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
      return true
    }

    return {
      value: fa.items.value,
      append,
      prepend,
      remove: removeAt,
      removeAll,
      removeMany,
      insert,
      swap,
      move,
      update,
      replace,
    }
  }

  return { fields }
}
