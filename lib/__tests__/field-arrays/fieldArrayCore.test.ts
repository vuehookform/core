import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../../useForm'
import { schemas } from '../helpers/test-utils'

const schema = schemas.withArray
const simpleArraySchema = schemas.simpleArray

describe('field arrays - core', () => {
  describe('initialization', () => {
    it('should create field array manager', () => {
      const { fields } = useForm({ schema })

      const usersArray = fields('users')

      expect(usersArray).toHaveProperty('value')
      expect(usersArray).toHaveProperty('append')
      expect(usersArray).toHaveProperty('prepend')
      expect(usersArray).toHaveProperty('remove')
      expect(usersArray).toHaveProperty('insert')
      expect(usersArray).toHaveProperty('swap')
      expect(usersArray).toHaveProperty('move')
      expect(usersArray).toHaveProperty('update')
    })

    it('should initialize with existing default values', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'John', email: 'john@test.com' },
            { name: 'Jane', email: 'jane@test.com' },
          ],
        },
      })

      const usersArray = fields('users')

      expect(usersArray.value.length).toBe(2)
      expect(getValues('users')).toHaveLength(2)
    })

    it('should initialize empty array when no default values', () => {
      const { fields, getValues } = useForm({ schema })

      const usersArray = fields('users')

      expect(usersArray.value.length).toBe(0)
      expect(getValues('users')).toEqual([])
    })
  })

  describe('stable keys', () => {
    it('should maintain stable keys after operations', () => {
      const { fields } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.append({ name: 'John', email: 'john@test.com' })
      usersArray.append({ name: 'Jane', email: 'jane@test.com' })

      // Get fresh reference for original keys
      let freshArray = fields('users')
      const originalKeys = freshArray.value.map((item) => item.key)

      // Swap should preserve keys
      usersArray.swap(0, 1)

      // Get fresh reference for swapped keys
      freshArray = fields('users')
      const swappedKeys = freshArray.value.map((item) => item.key)

      // Keys should be the same, just in different order
      expect(swappedKeys).toContain(originalKeys[0])
      expect(swappedKeys).toContain(originalKeys[1])
    })

    it('should update index getter correctly after operations', () => {
      const { fields } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.append({ name: 'John', email: 'john@test.com' })
      usersArray.append({ name: 'Jane', email: 'jane@test.com' })
      usersArray.append({ name: 'Bob', email: 'bob@test.com' })

      // Get fresh reference
      let freshArray = fields('users')
      const firstItem = freshArray.value[0]
      expect(firstItem.index).toBe(0)

      // Remove first item
      usersArray.remove(0)

      // Get fresh reference - new first item should be at index 0
      freshArray = fields('users')
      const newFirstItem = freshArray.value[0]
      expect(newFirstItem.index).toBe(0)
    })
  })

  describe('item.remove()', () => {
    it('should remove item using item.remove() method', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'John', email: 'john@test.com' },
            { name: 'Jane', email: 'jane@test.com' },
          ],
        },
      })

      const usersArray = fields('users')
      const firstItem = usersArray.value[0]

      firstItem.remove()

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(1)
      expect(getValues('users')).toEqual([{ name: 'Jane', email: 'jane@test.com' }])
    })
  })

  describe('simple array (strings)', () => {
    it('should work with simple string arrays', () => {
      const { fields, getValues } = useForm({ schema: simpleArraySchema })

      const tagsArray = fields('tags')
      tagsArray.append('vue')
      tagsArray.append('typescript')
      tagsArray.append('forms')

      const freshArray = fields('tags')
      expect(freshArray.value.length).toBe(3)
      expect(getValues('tags')).toEqual(['vue', 'typescript', 'forms'])
    })

    it('should remove simple values correctly', () => {
      const { fields, getValues } = useForm({
        schema: simpleArraySchema,
        defaultValues: { tags: ['vue', 'typescript', 'forms'] },
      })

      const tagsArray = fields('tags')
      tagsArray.remove(1)

      expect(getValues('tags')).toEqual(['vue', 'forms'])
    })
  })

  describe('async defaultValues interaction', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should initialize empty when called before sync defaults are available', () => {
      const { fields, getValues } = useForm({
        schema,
        // No default values - array should start empty
      })

      const usersArray = fields('users')

      // Should be empty
      expect(usersArray.value.length).toBe(0)
      expect(getValues('users')).toEqual([])
    })

    it('should preserve operations performed on field arrays', async () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [],
        },
      })

      const usersArray = fields('users')

      // Add items
      usersArray.append({ name: 'First', email: 'first@test.com' })
      usersArray.append({ name: 'Second', email: 'second@test.com' })

      // Should have the appended items
      expect(getValues('users')).toEqual([
        { name: 'First', email: 'first@test.com' },
        { name: 'Second', email: 'second@test.com' },
      ])

      // Operations are preserved
      const values = getValues('users')
      expect(Array.isArray(values)).toBe(true)
      expect(values.length).toBe(2)
    })

    it('should handle reset with sync defaults', () => {
      const { fields, getValues, reset } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')

      // Modify the array
      usersArray.append({ name: 'New', email: 'new@test.com' })
      expect(getValues('users')).toHaveLength(2)

      // Reset should restore to the original defaults
      reset()

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(1)
      expect(getValues('users')).toEqual([{ name: 'John', email: 'john@test.com' }])
    })

    it('should handle fields() called multiple times returning same manager', () => {
      const { fields } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      // Call fields() multiple times
      const array1 = fields('users')
      const array2 = fields('users')
      const array3 = fields('users')

      // All should reference the same underlying data
      expect(array1.value).toBe(array2.value)
      expect(array2.value).toBe(array3.value)

      // All should have the same data
      expect(array1.value.length).toBe(1)
    })
  })
})
