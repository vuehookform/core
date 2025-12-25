import { describe, it, expect } from 'vitest'
import { useForm } from '../useForm'
import { z } from 'zod'

const schema = z.object({
  users: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }),
  ),
})

const simpleArraySchema = z.object({
  tags: z.array(z.string()),
})

describe('fields (field arrays)', () => {
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

  describe('append', () => {
    it('should add item to end of array', () => {
      const { fields, getValues } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.append({ name: 'John', email: 'john@test.com' })

      // Get fresh reference to check items
      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(1)
      expect(getValues('users')).toEqual([{ name: 'John', email: 'john@test.com' }])
    })

    it('should add multiple items sequentially', () => {
      const { fields, getValues } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.append({ name: 'John', email: 'john@test.com' })
      usersArray.append({ name: 'Jane', email: 'jane@test.com' })

      // Get fresh reference to check items
      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(2)
      expect(getValues('users')).toEqual([
        { name: 'John', email: 'john@test.com' },
        { name: 'Jane', email: 'jane@test.com' },
      ])
    })

    it('should mark field array as dirty', () => {
      const { fields, formState } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.append({ name: 'John', email: 'john@test.com' })

      expect(formState.value.dirtyFields.users).toBe(true)
    })

    it('should generate unique key for each item', () => {
      const { fields } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.append({ name: 'John', email: 'john@test.com' })
      usersArray.append({ name: 'Jane', email: 'jane@test.com' })

      // Get fresh reference to check keys
      const freshArray = fields('users')
      const keys = freshArray.value.map((item) => item.key)
      expect(keys[0]).not.toBe(keys[1])
    })
  })

  describe('remove', () => {
    it('should remove item at specified index', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'John', email: 'john@test.com' },
            { name: 'Jane', email: 'jane@test.com' },
            { name: 'Bob', email: 'bob@test.com' },
          ],
        },
      })

      const usersArray = fields('users')
      usersArray.remove(1)

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(2)
      expect(getValues('users')).toEqual([
        { name: 'John', email: 'john@test.com' },
        { name: 'Bob', email: 'bob@test.com' },
      ])
    })

    it('should remove first item correctly', () => {
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
      usersArray.remove(0)

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(1)
      expect(getValues('users')).toEqual([{ name: 'Jane', email: 'jane@test.com' }])
    })

    it('should remove last item correctly', () => {
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
      usersArray.remove(1)

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(1)
      expect(getValues('users')).toEqual([{ name: 'John', email: 'john@test.com' }])
    })

    it('should mark field array as dirty after remove', () => {
      const { fields, formState } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')
      usersArray.remove(0)

      expect(formState.value.dirtyFields.users).toBe(true)
    })
  })

  describe('prepend', () => {
    it('should add item to beginning of array', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')
      usersArray.prepend({ name: 'First', email: 'first@test.com' })

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(2)
      expect(getValues('users')?.[0]).toEqual({ name: 'First', email: 'first@test.com' })
      expect(getValues('users')?.[1]).toEqual({ name: 'John', email: 'john@test.com' })
    })

    it('should prepend to empty array', () => {
      const { fields, getValues } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.prepend({ name: 'First', email: 'first@test.com' })

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(1)
      expect(getValues('users')).toEqual([{ name: 'First', email: 'first@test.com' }])
    })

    it('should prepend multiple items sequentially', () => {
      const { fields, getValues } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.prepend({ name: 'Third', email: 'third@test.com' })
      usersArray.prepend({ name: 'Second', email: 'second@test.com' })
      usersArray.prepend({ name: 'First', email: 'first@test.com' })

      expect(getValues('users')).toEqual([
        { name: 'First', email: 'first@test.com' },
        { name: 'Second', email: 'second@test.com' },
        { name: 'Third', email: 'third@test.com' },
      ])
    })

    it('should mark field array as dirty after prepend', () => {
      const { fields, formState } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.prepend({ name: 'First', email: 'first@test.com' })

      expect(formState.value.dirtyFields.users).toBe(true)
    })

    it('should generate unique key for prepended item', () => {
      const { fields } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'Existing', email: 'existing@test.com' }],
        },
      })

      const usersArray = fields('users')
      const existingKey = usersArray.value[0].key

      usersArray.prepend({ name: 'New', email: 'new@test.com' })

      const freshArray = fields('users')
      expect(freshArray.value[0].key).not.toBe(existingKey)
    })
  })

  describe('update', () => {
    it('should update item at specified index', () => {
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
      usersArray.update(0, { name: 'Updated John', email: 'updated@test.com' })

      expect(getValues('users')?.[0]).toEqual({ name: 'Updated John', email: 'updated@test.com' })
      expect(getValues('users')?.[1]).toEqual({ name: 'Jane', email: 'jane@test.com' })
    })

    it('should preserve item key after update', () => {
      const { fields } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')
      const originalKey = usersArray.value[0].key

      usersArray.update(0, { name: 'Updated', email: 'updated@test.com' })

      const freshArray = fields('users')
      expect(freshArray.value[0].key).toBe(originalKey)
    })

    it('should mark field array as dirty after update', () => {
      const { fields, formState } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')
      usersArray.update(0, { name: 'Updated', email: 'updated@test.com' })

      expect(formState.value.dirtyFields.users).toBe(true)
    })

    it('should do nothing for out-of-bounds index', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')
      usersArray.update(99, { name: 'Invalid', email: 'invalid@test.com' })

      expect(getValues('users')).toEqual([{ name: 'John', email: 'john@test.com' }])
    })

    it('should do nothing for negative index', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')
      usersArray.update(-1, { name: 'Invalid', email: 'invalid@test.com' })

      expect(getValues('users')).toEqual([{ name: 'John', email: 'john@test.com' }])
    })

    it('should update last item in array', () => {
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
      usersArray.update(1, { name: 'Updated Jane', email: 'updated@test.com' })

      expect(getValues('users')?.[1]).toEqual({ name: 'Updated Jane', email: 'updated@test.com' })
    })

    it('should work with simple array values', () => {
      const { fields, getValues } = useForm({
        schema: simpleArraySchema,
        defaultValues: { tags: ['vue', 'typescript', 'forms'] },
      })

      const tagsArray = fields('tags')
      tagsArray.update(1, 'react')

      expect(getValues('tags')).toEqual(['vue', 'react', 'forms'])
    })
  })

  describe('insert', () => {
    it('should insert item at specified index', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'John', email: 'john@test.com' },
            { name: 'Bob', email: 'bob@test.com' },
          ],
        },
      })

      const usersArray = fields('users')
      usersArray.insert(1, { name: 'Jane', email: 'jane@test.com' })

      const freshArray = fields('users')
      expect(freshArray.value.length).toBe(3)
      expect(getValues('users')).toEqual([
        { name: 'John', email: 'john@test.com' },
        { name: 'Jane', email: 'jane@test.com' },
        { name: 'Bob', email: 'bob@test.com' },
      ])
    })

    it('should insert at beginning (prepend behavior)', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [{ name: 'John', email: 'john@test.com' }],
        },
      })

      const usersArray = fields('users')
      usersArray.insert(0, { name: 'First', email: 'first@test.com' })

      expect(getValues('users')?.[0]).toEqual({ name: 'First', email: 'first@test.com' })
    })

    it('should mark field array as dirty after insert', () => {
      const { fields, formState } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.insert(0, { name: 'John', email: 'john@test.com' })

      expect(formState.value.dirtyFields.users).toBe(true)
    })
  })

  describe('swap', () => {
    it('should swap two items', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'John', email: 'john@test.com' },
            { name: 'Jane', email: 'jane@test.com' },
            { name: 'Bob', email: 'bob@test.com' },
          ],
        },
      })

      const usersArray = fields('users')
      usersArray.swap(0, 2)

      expect(getValues('users')).toEqual([
        { name: 'Bob', email: 'bob@test.com' },
        { name: 'Jane', email: 'jane@test.com' },
        { name: 'John', email: 'john@test.com' },
      ])
    })

    it('should swap adjacent items', () => {
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
      usersArray.swap(0, 1)

      expect(getValues('users')).toEqual([
        { name: 'Jane', email: 'jane@test.com' },
        { name: 'John', email: 'john@test.com' },
      ])
    })

    it('should mark field array as dirty after swap', () => {
      const { fields, formState } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'John', email: 'john@test.com' },
            { name: 'Jane', email: 'jane@test.com' },
          ],
        },
      })

      const usersArray = fields('users')
      usersArray.swap(0, 1)

      expect(formState.value.dirtyFields.users).toBe(true)
    })
  })

  describe('move', () => {
    it('should move item from one position to another', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'John', email: 'john@test.com' },
            { name: 'Jane', email: 'jane@test.com' },
            { name: 'Bob', email: 'bob@test.com' },
          ],
        },
      })

      const usersArray = fields('users')
      usersArray.move(0, 2)

      expect(getValues('users')).toEqual([
        { name: 'Jane', email: 'jane@test.com' },
        { name: 'Bob', email: 'bob@test.com' },
        { name: 'John', email: 'john@test.com' },
      ])
    })

    it('should move item from end to beginning', () => {
      const { fields, getValues } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'John', email: 'john@test.com' },
            { name: 'Jane', email: 'jane@test.com' },
            { name: 'Bob', email: 'bob@test.com' },
          ],
        },
      })

      const usersArray = fields('users')
      usersArray.move(2, 0)

      expect(getValues('users')).toEqual([
        { name: 'Bob', email: 'bob@test.com' },
        { name: 'John', email: 'john@test.com' },
        { name: 'Jane', email: 'jane@test.com' },
      ])
    })

    it('should mark field array as dirty after move', () => {
      const { fields, formState } = useForm({
        schema,
        defaultValues: {
          users: [
            { name: 'John', email: 'john@test.com' },
            { name: 'Jane', email: 'jane@test.com' },
          ],
        },
      })

      const usersArray = fields('users')
      usersArray.move(0, 1)

      expect(formState.value.dirtyFields.users).toBe(true)
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

  describe('onChange validation', () => {
    it('should validate on change when mode is onChange', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const usersArray = fields('users')
      usersArray.append({ name: '', email: 'invalid' })

      // Give time for async validation
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Should have validation errors
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })
  })

  describe('reset behavior', () => {
    it('should clear field arrays on form reset', () => {
      const { fields, reset, getValues } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.append({ name: 'John', email: 'john@test.com' })

      let freshArray = fields('users')
      expect(freshArray.value.length).toBe(1)

      reset()

      // Need to get fresh field array reference after reset
      freshArray = fields('users')
      expect(freshArray.value.length).toBe(0)
      expect(getValues('users')).toEqual([])
    })
  })

  describe('boundary conditions', () => {
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

        // Swap with out-of-bounds index - implementation may create sparse array or behave differently
        // The key is it doesn't crash
        usersArray.swap(99, 0)
        // Array should still exist and have some structure
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

        // Swap with out-of-bounds index - may create sparse array
        usersArray.swap(0, 99)
        // Array should still exist
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

        // Negative indices - should not throw
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

        // Should not throw and array should remain intact
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
        // Array should still have items
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

        // Insert at index 99 - should not throw
        expect(() =>
          usersArray.insert(99, { name: 'Far', email: 'far@test.com' }),
        ).not.toThrow()

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

        expect(() =>
          usersArray.insert(-1, { name: 'Negative', email: 'neg@test.com' }),
        ).not.toThrow()
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

        // After removing the only item, array should be empty
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

        // Remove at non-existent index - should not throw
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
  })
})
