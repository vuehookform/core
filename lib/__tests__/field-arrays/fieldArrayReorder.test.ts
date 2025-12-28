import { describe, it, expect } from 'vitest'
import { useForm } from '../../useForm'
import { schemas } from '../helpers/test-utils'

const schema = schemas.withArray

describe('field arrays - reorder', () => {
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
})
