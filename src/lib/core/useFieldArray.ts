import { ref } from 'vue'
import type { FormContext } from './formContext'
import type { FieldArray, FieldArrayItem, Path } from '../types'
import { get, set, generateId } from '../utils/paths'

/**
 * Create field array management functions
 */
export function createFieldArrayManager<FormValues>(
  ctx: FormContext<FormValues>,
  validate: (fieldPath?: string) => Promise<boolean>,
) {
  /**
   * Manage dynamic field arrays
   */
  function fields<TPath extends Path<FormValues>>(name: TPath): FieldArray {
    // Get or create field array entry
    let fieldArray = ctx.fieldArrays.get(name)

    if (!fieldArray) {
      const existingValues = (get(ctx.formData, name) || []) as unknown[]
      fieldArray = {
        items: ref<FieldArrayItem[]>([]),
        values: existingValues,
        // Index cache stored on fieldArray for O(1) lookups, shared across fields() calls
        indexCache: new Map<string, number>(),
      }
      ctx.fieldArrays.set(name, fieldArray)

      // Initialize form data if needed
      if (!get(ctx.formData, name)) {
        set(ctx.formData, name, [] as unknown[])
      }
    }

    // Capture reference for closures
    const fa = fieldArray

    // Use the shared index cache from fieldArray state
    const indexCache = fa.indexCache

    /**
     * Rebuild the index cache from current items array
     */
    const rebuildIndexCache = () => {
      indexCache.clear()
      fa.items.value.forEach((item, idx) => {
        indexCache.set(item.key, idx)
      })
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

    const append = (value: unknown) => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]
      const newValues = [...currentValues, value]
      set(ctx.formData, name, newValues)

      fa.items.value = [...fa.items.value, createItem(generateId())]
      rebuildIndexCache()

      ctx.dirtyFields.value = { ...ctx.dirtyFields.value, [name]: true }

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
    }

    const prepend = (value: unknown) => {
      insert(0, value)
    }

    const update = (index: number, value: unknown) => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]
      if (index < 0 || index >= currentValues.length) {
        return // Invalid index, do nothing
      }
      const newValues = [...currentValues]
      newValues[index] = value
      set(ctx.formData, name, newValues)

      // Keep the same key - no items array change needed (preserves stable identity)
      ctx.dirtyFields.value = { ...ctx.dirtyFields.value, [name]: true }

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
    }

    const removeAt = (index: number) => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]
      const newValues = currentValues.filter((_: unknown, i: number) => i !== index)
      set(ctx.formData, name, newValues)

      // Remove item by current index, keep others
      const keyToRemove = fa.items.value[index]?.key
      fa.items.value = fa.items.value.filter((item) => item.key !== keyToRemove)
      rebuildIndexCache()

      ctx.dirtyFields.value = { ...ctx.dirtyFields.value, [name]: true }

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
    }

    const insert = (index: number, value: unknown) => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]

      // Bounds validation: clamp index to valid range [0, length]
      const clampedIndex = Math.max(0, Math.min(index, currentValues.length))

      const newValues = [
        ...currentValues.slice(0, clampedIndex),
        value,
        ...currentValues.slice(clampedIndex),
      ]
      set(ctx.formData, name, newValues)

      const newItem = createItem(generateId())
      fa.items.value = [
        ...fa.items.value.slice(0, clampedIndex),
        newItem,
        ...fa.items.value.slice(clampedIndex),
      ]
      rebuildIndexCache()

      ctx.dirtyFields.value = { ...ctx.dirtyFields.value, [name]: true }

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
    }

    const swap = (indexA: number, indexB: number) => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]

      // Bounds validation: reject invalid indices
      if (
        indexA < 0 ||
        indexB < 0 ||
        indexA >= currentValues.length ||
        indexB >= currentValues.length
      ) {
        return // Invalid indices, do nothing
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
        rebuildIndexCache()
      }

      ctx.dirtyFields.value = { ...ctx.dirtyFields.value, [name]: true }

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
    }

    const move = (from: number, to: number) => {
      const currentValues = (get(ctx.formData, name) || []) as unknown[]

      // Bounds validation: reject invalid indices
      if (from < 0 || from >= currentValues.length || to < 0) {
        return // Invalid indices, do nothing
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
        rebuildIndexCache()
      }

      ctx.dirtyFields.value = { ...ctx.dirtyFields.value, [name]: true }

      if (ctx.options.mode === 'onChange') {
        validate(name)
      }
    }

    return {
      value: fa.items.value,
      append,
      prepend,
      remove: removeAt,
      insert,
      swap,
      move,
      update,
    }
  }

  return { fields }
}
