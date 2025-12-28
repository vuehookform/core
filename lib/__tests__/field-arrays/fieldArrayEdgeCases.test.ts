import { describe, it, expect } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'
import { schemas } from '../helpers/test-utils'

const schema = schemas.withArray

const itemsSchema = z.object({
  items: z.array(z.object({ name: z.string() })),
})

describe('field arrays - edge cases', () => {
  describe('swap edge cases', () => {
    it('should be a no-op when swapping same index', () => {
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
      const originalValues = JSON.parse(JSON.stringify(getValues('users')))
      const originalKeys = usersArray.value.map((item) => item.key)

      usersArray.swap(0, 0)

      const freshArray = fields('users')
      expect(getValues('users')).toEqual(originalValues)
      expect(freshArray.value.map((item) => item.key)).toEqual(originalKeys)
    })

    it('should handle swap with out-of-bounds first index', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')

      // Swap with out-of-bounds index - should not crash
      usersArray.swap(99, 0)
      expect(getValues('users')).toBeDefined()
    })

    it('should handle swap with out-of-bounds second index', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')

      usersArray.swap(0, 99)
      expect(getValues('users')).toBeDefined()
    })

    it('should handle swap with negative index', () => {
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
      const originalLength = getValues('users')?.length

      expect(() => usersArray.swap(-1, 0)).not.toThrow()
      expect(getValues('users')?.length).toBe(originalLength)
    })
  })

  describe('move edge cases', () => {
    it('should be a no-op when moving to same position', () => {
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
      const originalValues = JSON.parse(JSON.stringify(getValues('users')))

      usersArray.move(0, 0)

      expect(getValues('users')).toEqual(originalValues)
    })

    it('should handle move with out-of-bounds from index', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')
      const originalLength = getValues('users')?.length

      expect(() => usersArray.move(99, 0)).not.toThrow()
      expect(getValues('users')?.length).toBe(originalLength)
    })

    it('should handle move with out-of-bounds to index', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')

      expect(() => usersArray.move(0, 99)).not.toThrow()
      expect(getValues('users')?.length).toBeGreaterThan(0)
    })

    it('should handle move with negative index', () => {
      const { fields } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'John', email: 'john@test.com' },
            { name: 'Jane', email: 'jane@test.com' },
          ],
        },
      })

      const usersArray = fields('users')

      expect(() => usersArray.move(-1, 0)).not.toThrow()
    })
  })

  describe('insert edge cases', () => {
    it('should insert at end when index equals array length', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')
      usersArray.insert(1, { name: 'Last', email: 'last@test.com' })

      expect(getValues('users')?.length).toBe(2)
      expect(getValues('users')?.[1]).toEqual({
        name: 'Last',
        email: 'last@test.com',
      })
    })

    it('should handle insert at out-of-bounds index', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')

      expect(() => usersArray.insert(99, { name: 'Far', email: 'far@test.com' })).not.toThrow()

      expect(getValues('users')).toBeDefined()
    })

    it('should handle insert with negative index', () => {
      const { fields } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')

      expect(() => usersArray.insert(-1, { name: 'Negative', email: 'neg@test.com' })).not.toThrow()
    })

    it('should insert into empty array at index 0', () => {
      const { fields, getValues } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.insert(0, { name: 'First', email: 'first@test.com' })

      expect(getValues('users')?.length).toBe(1)
      expect(getValues('users')?.[0]).toEqual({
        name: 'First',
        email: 'first@test.com',
      })
    })
  })

  describe('remove edge cases', () => {
    it('should handle remove from single-item array', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')
      usersArray.remove(0)

      expect(getValues('users')?.length).toBe(0)
    })

    it('should handle remove with out-of-bounds index', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')

      expect(() => usersArray.remove(99)).not.toThrow()
      expect(getValues('users')?.length).toBe(1)
    })

    it('should handle remove with negative index', () => {
      const { fields } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')

      expect(() => usersArray.remove(-1)).not.toThrow()
    })

    it('should handle remove from empty array', () => {
      const { fields, getValues } = useForm({ schema })

      const usersArray = fields('users')

      expect(() => usersArray.remove(0)).not.toThrow()
      expect(getValues('users')).toEqual([])
    })
  })

  describe('sequential operations', () => {
    it('should handle append followed by immediate remove', () => {
      const { fields, getValues } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.append({ name: 'John', email: 'john@test.com' })
      usersArray.remove(0)

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(0)
      expect(getValues('users')).toEqual([])
    })

    it('should handle multiple operations in sequence', () => {
      const { fields, getValues } = useForm({ schema })

      const usersArray = fields('users')

      // Append 3 items
      usersArray.append({ name: 'A', email: 'a@test.com' })
      usersArray.append({ name: 'B', email: 'b@test.com' })
      usersArray.append({ name: 'C', email: 'c@test.com' })

      // Remove middle
      usersArray.remove(1)

      // Insert at beginning
      usersArray.insert(0, { name: 'First', email: 'first@test.com' })

      // Swap first and last
      usersArray.swap(0, 2)

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(3)

      // Verify order: C, A, First (after swap of First and C)
      const values = getValues('users')
      expect(values?.[0]?.name).toBe('C')
      expect(values?.[2]?.name).toBe('First')
    })

    it('should maintain correct indices after multiple removes', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'A', email: 'a@test.com' },
            { name: 'B', email: 'b@test.com' },
            { name: 'C', email: 'c@test.com' },
            { name: 'D', email: 'd@test.com' },
          ],
        },
      })

      const usersArray = fields('users')

      // Remove from middle multiple times
      usersArray.remove(1) // Remove B
      usersArray.remove(1) // Remove C (now at index 1)

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(2)
      expect(freshArray.value[0].index).toBe(0)
      expect(freshArray.value[1].index).toBe(1)

      expect(getValues('users')).toEqual([
        { name: 'A', email: 'a@test.com' },
        { name: 'D', email: 'd@test.com' },
      ])
    })

    it('should maintain key stability through multiple operations', () => {
      const { fields } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.append({ name: 'A', email: 'a@test.com' })
      usersArray.append({ name: 'B', email: 'b@test.com' })

      let freshArray = fields('users')
      const keyA = freshArray.value[0].key
      const keyB = freshArray.value[1].key

      // Move B to front
      usersArray.move(1, 0)

      freshArray = fields('users')
      // Keys should be preserved
      expect(freshArray.value[0].key).toBe(keyB)
      expect(freshArray.value[1].key).toBe(keyA)
    })
  })

  describe('batch operations', () => {
    it('should append multiple items at once', () => {
      const { fields, getValues } = useForm({
        schema: itemsSchema,
        defaultValues: { items: [] },
      })

      const itemsArray = fields('items')

      // Append multiple items
      itemsArray.append([{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }])

      // Get fresh reference to check updated state
      const freshArray = fields('items')
      expect(freshArray.value.length).toBe(3)
      expect(getValues('items')).toEqual([
        { name: 'Item 1' },
        { name: 'Item 2' },
        { name: 'Item 3' },
      ])
    })

    it('should prepend multiple items at once', () => {
      const { fields, getValues } = useForm({
        schema: itemsSchema,
        defaultValues: { items: [{ name: 'Existing' }] },
      })

      const itemsArray = fields('items')

      // Prepend multiple items
      itemsArray.prepend([{ name: 'First' }, { name: 'Second' }])

      // Get fresh reference to check updated state
      const freshArray = fields('items')
      expect(freshArray.value.length).toBe(3)
      expect(getValues('items')).toEqual([
        { name: 'First' },
        { name: 'Second' },
        { name: 'Existing' },
      ])
    })

    it('should insert multiple items at specific index', () => {
      const { fields, getValues } = useForm({
        schema: itemsSchema,
        defaultValues: { items: [{ name: 'First' }, { name: 'Last' }] },
      })

      const itemsArray = fields('items')

      // Insert multiple items at index 1
      itemsArray.insert(1, [{ name: 'Middle 1' }, { name: 'Middle 2' }])

      // Get fresh reference to check updated state
      const freshArray = fields('items')
      expect(freshArray.value.length).toBe(4)
      expect(getValues('items')).toEqual([
        { name: 'First' },
        { name: 'Middle 1' },
        { name: 'Middle 2' },
        { name: 'Last' },
      ])
    })

    it('should still accept single item (backward compatible)', () => {
      const { fields, getValues } = useForm({
        schema: itemsSchema,
        defaultValues: { items: [] },
      })

      const itemsArray = fields('items')

      // Single item (not array)
      itemsArray.append({ name: 'Single' })

      // Get fresh reference to check updated state
      const freshArray = fields('items')
      expect(freshArray.value.length).toBe(1)
      expect(getValues('items')).toEqual([{ name: 'Single' }])
    })
  })
})
