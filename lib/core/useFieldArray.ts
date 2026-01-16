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
import { updateFieldDirtyState } from './fieldState'
import { shouldValidateOnChange } from '../utils/modeChecks'

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

    /**
     * Clear validation cache for this array field and all its children.
     * Must be called before mutations to prevent stale cache entries.
     */
    const clearValidationCache = () => {
      // Cache keys have format: `${fieldPath}:partial` or `${fieldPath}:full`
      // We need to clear entries for this array and all child paths
      for (const key of ctx.validationCache.keys()) {
        // Extract field path by removing the strategy suffix
        const colonIndex = key.lastIndexOf(':')
        const fieldPath = colonIndex > 0 ? key.slice(0, colonIndex) : key
        // Clear if it's the array field itself or a child path
        if (fieldPath === name || fieldPath.startsWith(`${name}.`)) {
          ctx.validationCache.delete(key)
        }
      }
    }

    /**
     * Validate the array field based on form validation mode.
     * Centralizes validation logic for all field array operations.
     */
    const validateIfNeeded = () => {
      const isTouched = ctx.touchedFields.value[name] === true
      const hasSubmitted = ctx.submitCount.value > 0
      const shouldValidate = shouldValidateOnChange(
        ctx.options.mode ?? 'onSubmit',
        isTouched,
        ctx.options.reValidateMode,
        hasSubmitted,
      )
      if (shouldValidate) {
        validate(name)
      }
    }

    /**
     * Verify sync between items array and formData.
     * Rebuilds items array if out of sync (e.g., external mutation via setValue).
     * Returns the current values array for convenience.
     */
    const ensureSync = (): unknown[] => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]
      if (fa.items.value.length !== currentValues.length) {
        if (__DEV__) {
          console.warn(
            `[vue-hook-form] Field array out of sync with formData. ` +
              `Rebuilding items array (items: ${fa.items.value.length}, formData: ${currentValues.length})`,
          )
        }
        fa.items.value = currentValues.map(() => createItem(generateId()))
        rebuildIndexCache()
      }
      return currentValues
    }

    const append = (value: unknown | unknown[], focusOptions?: FieldArrayFocusOptions): boolean => {
      // Clear stale validation cache before mutation
      clearValidationCache()

      const values = normalizeToArray(value)
      if (values.length === 0) return true

      // Ensure items array is in sync with formData before mutation
      const currentValues = ensureSync()
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
      const newItemsArray = [...fa.items.value, ...newItems]
      // Update cache BEFORE triggering Vue reactivity to prevent -1 index during render
      for (let i = insertIndex; i < newItemsArray.length; i++) {
        const item = newItemsArray[i]
        if (item) indexCache.set(item.key, i)
      }
      fa.items.value = newItemsArray

      // Mark dirty (optimized - skips if already dirty)
      updateFieldDirtyState(
        ctx.dirtyFields,
        ctx.defaultValues,
        ctx.defaultValueHashes,
        name,
        get(ctx.formData, name),
      )

      validateIfNeeded()

      // Handle focus
      handleFocus(insertIndex, values.length, focusOptions)
      return true
    }

    const prepend = (
      value: unknown | unknown[],
      focusOptions?: FieldArrayFocusOptions,
    ): boolean => {
      // Clear stale validation cache before mutation
      clearValidationCache()

      const values = normalizeToArray(value)
      if (values.length === 0) return true

      // Ensure items array is in sync with formData before mutation
      const currentValues = ensureSync()

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
      const newItemsArray = [...newItems, ...fa.items.value]
      // Update cache BEFORE triggering Vue reactivity to prevent -1 index during render
      for (let i = 0; i < newItemsArray.length; i++) {
        const item = newItemsArray[i]
        if (item) indexCache.set(item.key, i)
      }
      fa.items.value = newItemsArray

      // Mark dirty (optimized)
      updateFieldDirtyState(
        ctx.dirtyFields,
        ctx.defaultValues,
        ctx.defaultValueHashes,
        name,
        get(ctx.formData, name),
      )

      validateIfNeeded()

      // Handle focus (items added at index 0)
      handleFocus(0, values.length, focusOptions)
      return true
    }

    const update = (index: number, value: unknown): boolean => {
      // Clear stale validation cache before mutation
      clearValidationCache()

      // Ensure items array is in sync with formData before mutation
      const currentValues = ensureSync()
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
      updateFieldDirtyState(
        ctx.dirtyFields,
        ctx.defaultValues,
        ctx.defaultValueHashes,
        name,
        get(ctx.formData, name),
      )

      validateIfNeeded()
      return true
    }

    const removeAt = (index: number): boolean => {
      // Clear stale validation cache before mutation
      clearValidationCache()

      // Ensure items array is in sync with formData before mutation
      const currentValues = ensureSync()

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

      updateFieldDirtyState(
        ctx.dirtyFields,
        ctx.defaultValues,
        ctx.defaultValueHashes,
        name,
        get(ctx.formData, name),
      )

      validateIfNeeded()
      return true
    }

    const insert = (
      index: number,
      value: unknown | unknown[],
      focusOptions?: FieldArrayFocusOptions,
    ): boolean => {
      // Clear stale validation cache before mutation
      clearValidationCache()

      const values = normalizeToArray(value)
      if (values.length === 0) return true

      // Ensure items array is in sync with formData before mutation
      const currentValues = ensureSync()

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

      // Bounds validation: reject invalid indices (consistent with swap/move)
      if (index < 0 || index > currentValues.length) {
        if (__DEV__) {
          warnArrayIndexOutOfBounds('insert', name, index, currentValues.length)
        }
        return false
      }

      // Update form data (batch)
      const newValues = [...currentValues.slice(0, index), ...values, ...currentValues.slice(index)]
      set(ctx.formData, name, newValues)

      // Create items with unique keys (batch)
      const newItems = values.map(() => createItem(generateId()))
      const newItemsArray = [
        ...fa.items.value.slice(0, index),
        ...newItems,
        ...fa.items.value.slice(index),
      ]
      // Update cache BEFORE triggering Vue reactivity to prevent -1 index during render
      for (let i = index; i < newItemsArray.length; i++) {
        const item = newItemsArray[i]
        if (item) indexCache.set(item.key, i)
      }
      fa.items.value = newItemsArray

      updateFieldDirtyState(
        ctx.dirtyFields,
        ctx.defaultValues,
        ctx.defaultValueHashes,
        name,
        get(ctx.formData, name),
      )

      validateIfNeeded()

      // Handle focus
      handleFocus(index, values.length, focusOptions)
      return true
    }

    const swap = (indexA: number, indexB: number): boolean => {
      // Clear stale validation cache before mutation
      clearValidationCache()

      // Ensure items array is in sync with formData before mutation
      const currentValues = ensureSync()

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

      updateFieldDirtyState(
        ctx.dirtyFields,
        ctx.defaultValues,
        ctx.defaultValueHashes,
        name,
        get(ctx.formData, name),
      )

      validateIfNeeded()
      return true
    }

    const move = (from: number, to: number): boolean => {
      // Clear stale validation cache before mutation
      clearValidationCache()

      // Ensure items array is in sync with formData before mutation
      const currentValues = ensureSync()

      // Bounds validation: reject invalid indices (consistent with swap)
      if (from < 0 || from >= currentValues.length || to < 0 || to >= currentValues.length) {
        if (__DEV__) {
          const invalidIndex = from < 0 || from >= currentValues.length ? from : to
          warnArrayIndexOutOfBounds('move', name, invalidIndex, currentValues.length)
        }
        return false // Invalid indices
      }

      const newValues = [...currentValues]
      const [removed] = newValues.splice(from, 1)
      if (removed !== undefined) {
        // No clamping needed: validation ensures to < currentValues.length,
        // and after removal newValues.length = currentValues.length - 1,
        // so to <= newValues.length is always valid for splice
        newValues.splice(to, 0, removed)
        set(ctx.formData, name, newValues)
      }

      // Move item in array
      const newItems = [...fa.items.value]
      const [removedItem] = newItems.splice(from, 1)
      if (removedItem) {
        newItems.splice(to, 0, removedItem)
        fa.items.value = newItems
        // Update affected range in cache (from min to max of from/to)
        const minIdx = Math.min(from, to)
        const maxIdx = Math.max(from, to)
        const items = fa.items.value
        for (let i = minIdx; i <= maxIdx; i++) {
          const item = items[i]
          if (item) indexCache.set(item.key, i)
        }
      }

      updateFieldDirtyState(
        ctx.dirtyFields,
        ctx.defaultValues,
        ctx.defaultValueHashes,
        name,
        get(ctx.formData, name),
      )

      validateIfNeeded()
      return true
    }

    const replace = (newValues: unknown[]): boolean => {
      // Clear stale validation cache before mutation
      clearValidationCache()

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

      updateFieldDirtyState(
        ctx.dirtyFields,
        ctx.defaultValues,
        ctx.defaultValueHashes,
        name,
        get(ctx.formData, name),
      )

      validateIfNeeded()
      return true
    }

    const removeAll = (): boolean => {
      // Clear stale validation cache before mutation
      clearValidationCache()

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

      updateFieldDirtyState(
        ctx.dirtyFields,
        ctx.defaultValues,
        ctx.defaultValueHashes,
        name,
        get(ctx.formData, name),
      )

      validateIfNeeded()
      return true
    }

    const removeMany = (indices: number[]): boolean => {
      // Clear stale validation cache before mutation
      clearValidationCache()

      // Ensure items array is in sync with formData before mutation
      const currentValues = ensureSync()

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

      updateFieldDirtyState(
        ctx.dirtyFields,
        ctx.defaultValues,
        ctx.defaultValueHashes,
        name,
        get(ctx.formData, name),
      )

      validateIfNeeded()
      return true
    }

    return {
      get value() {
        return fa.items.value
      },
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
