import { describe, it, expect } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'

const schema = z.object({
  users: z.array(
    z.object({
      name: z.string().min(1),
      email: z.email(),
    }),
  ),
})

const simpleArraySchema = z.object({
  tags: z.array(z.string()),
})

describe('field arrays - mutations', () => {
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
})
