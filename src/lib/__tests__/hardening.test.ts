import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../useForm'
import { z } from 'zod'
import { get, set, unset, generateId } from '../utils/paths'
import { waitFor, createInputEvent } from './test-utils'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

const arraySchema = z.object({
  users: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }),
  ),
})

describe('Hardening Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Fix #1: Double-Submit Prevention', () => {
    it('should prevent multiple simultaneous submissions', async () => {
      let resolveSubmit: () => void
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve
      })

      const onValid = vi.fn().mockImplementation(async () => {
        await submitPromise
      })

      const { handleSubmit } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const submitHandler = handleSubmit(onValid)

      // Start first submission (will block)
      const promise1 = submitHandler(new Event('submit'))

      // Try to submit again immediately (should be blocked because isSubmitting is true)
      const promise2 = submitHandler(new Event('submit'))

      // Resolve the first submission
      resolveSubmit!()

      await Promise.all([promise1, promise2])

      // Should only be called once
      expect(onValid).toHaveBeenCalledTimes(1)
    })

    it('should allow submission after previous completes', async () => {
      const onValid = vi.fn()

      const { handleSubmit } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const submitHandler = handleSubmit(onValid)

      // First submission
      await submitHandler(new Event('submit'))

      // Second submission (should work because first completed)
      await submitHandler(new Event('submit'))

      expect(onValid).toHaveBeenCalledTimes(2)
    })
  })

  describe('Fix #5: unset() with null intermediate paths', () => {
    it('should not throw when intermediate path is null', () => {
      const obj: Record<string, unknown> = {
        user: null,
      }

      // Should not throw
      expect(() => unset(obj, 'user.name')).not.toThrow()
    })

    it('should not throw when intermediate path is undefined', () => {
      const obj: Record<string, unknown> = {
        user: undefined,
      }

      // Should not throw
      expect(() => unset(obj, 'user.name')).not.toThrow()
    })

    it('should not throw when intermediate path is primitive', () => {
      const obj: Record<string, unknown> = {
        user: 'string value',
      }

      // Should not throw
      expect(() => unset(obj, 'user.name')).not.toThrow()
    })

    it('should still work for valid paths', () => {
      const obj: Record<string, unknown> = {
        user: { name: 'John', email: 'john@test.com' },
      }

      unset(obj, 'user.name')
      expect(obj.user).toEqual({ email: 'john@test.com' })
    })
  })

  describe('Fix #6: Reset cancels stale validations', () => {
    it('should discard validation results after reset', async () => {
      let resolveValidation: (value: string | undefined) => void
      const validationPromise = new Promise<string | undefined>((resolve) => {
        resolveValidation = resolve
      })

      const slowValidate = vi.fn().mockImplementation(() => validationPromise)

      const { register, reset, formState } = useForm({
        schema,
        defaultValues: {
          email: '',
          password: '',
          name: '',
        },
      })

      const mockInput = document.createElement('input')
      mockInput.type = 'text'
      mockInput.value = 'test'

      const { ref, onInput } = register('email', {
        validate: slowValidate,
      })
      ref(mockInput)

      // Trigger validation (using proper input event)
      const inputEvent = createInputEvent(mockInput)
      const validationStart = onInput(inputEvent)

      // Reset before validation completes
      reset()

      // Now resolve the validation (after reset)
      resolveValidation!('Slow validation error')

      await validationStart

      // Errors should be empty (validation result discarded because reset happened)
      expect(formState.value.errors).toEqual({})
    })
  })

  describe('Fix #8: Async default values error handling', () => {
    it('should call onDefaultValuesError callback on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onError = vi.fn()
      const error = new Error('Failed to load')

      const { formState } = useForm({
        schema,
        defaultValues: async () => {
          throw error
        },
        onDefaultValuesError: onError,
      })

      // Wait for async operation (use real promise resolution)
      await waitFor(10)

      expect(onError).toHaveBeenCalledWith(error)
      expect(formState.value.defaultValuesError).toBe(error)
      expect(formState.value.isLoading).toBe(false)
      consoleSpy.mockRestore()
    })

    it('should set defaultValuesError in formState', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Network error')

      const { formState } = useForm({
        schema,
        defaultValues: async () => {
          throw error
        },
      })

      await waitFor(10)

      expect(formState.value.defaultValuesError).toBe(error)
      consoleSpy.mockRestore()
    })
  })

  describe('Fix #9: unregister removes form data', () => {
    it('should remove form data when unregistering', () => {
      const { register, unregister, getValues } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const mockInput = document.createElement('input')
      register('email').ref(mockInput)

      // Verify data exists
      expect(getValues('email')).toBe('test@example.com')

      // Unregister
      unregister('email')

      // Data should be removed
      expect(getValues('email')).toBeUndefined()
    })

    it('should clear errors when unregistering', async () => {
      const { register, unregister, formState, trigger } = useForm({
        schema,
        defaultValues: {
          email: 'invalid',
          password: 'password123',
          name: 'John',
        },
      })

      const mockInput = document.createElement('input')
      register('email').ref(mockInput)

      // Trigger validation to create error
      await trigger('email')

      expect(formState.value.errors.email).toBeDefined()

      // Unregister
      unregister('email')

      // Error should be cleared
      expect(formState.value.errors.email).toBeUndefined()
    })
  })

  describe('Fix #11: generateId uniqueness', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>()

      for (let i = 0; i < 1000; i++) {
        ids.add(generateId())
      }

      // All IDs should be unique
      expect(ids.size).toBe(1000)
    })

    it('should include random component for HMR safety', () => {
      const id = generateId()

      // Should contain underscore-separated parts including random
      const parts = id.split('_')
      expect(parts.length).toBeGreaterThanOrEqual(4) // field, timestamp, counter, random
    })
  })

  describe('Fix #14: reset uses deep clone', () => {
    it('should not share references with reset values', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
          }),
        }),
      })

      const { reset, getValues, setValue } = useForm({
        schema: nestedSchema,
        defaultValues: {
          user: {
            profile: {
              name: 'Initial',
            },
          },
        },
      })

      // Modify form data
      setValue('user.profile.name' as never, 'Changed' as never)

      // Create new reset values
      const resetValues = {
        user: {
          profile: {
            name: 'John',
          },
        },
      }

      // Reset to new values
      reset(resetValues)

      // Get form values
      const values = getValues()
      expect(values.user.profile.name).toBe('John')

      // Now modify the reset values object
      resetValues.user.profile.name = 'Modified After Reset'

      // Form values should NOT be affected (deep clone)
      const valuesAfter = getValues()
      expect(valuesAfter.user.profile.name).toBe('John')
    })
  })
})

describe('Field Array Hardening', () => {
  describe('Fix #4: Bounds validation', () => {
    it('swap should do nothing with out-of-bounds indices', () => {
      const { fields, getValues } = useForm({
        schema: arraySchema,
        defaultValues: {
          users: [
            { name: 'Alice', email: 'alice@test.com' },
            { name: 'Bob', email: 'bob@test.com' },
          ],
        },
      })

      const userFields = fields('users')

      // Try to swap with out-of-bounds index
      userFields.swap(0, 99)

      // Should be unchanged
      const values = getValues()
      expect(values.users[0].name).toBe('Alice')
      expect(values.users[1].name).toBe('Bob')
    })

    it('swap should do nothing with negative indices', () => {
      const { fields, getValues } = useForm({
        schema: arraySchema,
        defaultValues: {
          users: [
            { name: 'Alice', email: 'alice@test.com' },
            { name: 'Bob', email: 'bob@test.com' },
          ],
        },
      })

      const userFields = fields('users')
      userFields.swap(-1, 0)

      const values = getValues()
      expect(values.users[0].name).toBe('Alice')
      expect(values.users[1].name).toBe('Bob')
    })

    it('move should do nothing with invalid from index', () => {
      const { fields, getValues } = useForm({
        schema: arraySchema,
        defaultValues: {
          users: [
            { name: 'Alice', email: 'alice@test.com' },
            { name: 'Bob', email: 'bob@test.com' },
          ],
        },
      })

      const userFields = fields('users')
      userFields.move(99, 0)

      const values = getValues()
      expect(values.users.length).toBe(2)
      expect(values.users[0].name).toBe('Alice')
    })

    it('move should do nothing with negative from index', () => {
      const { fields, getValues } = useForm({
        schema: arraySchema,
        defaultValues: {
          users: [
            { name: 'Alice', email: 'alice@test.com' },
            { name: 'Bob', email: 'bob@test.com' },
          ],
        },
      })

      const userFields = fields('users')
      userFields.move(-1, 0)

      const values = getValues()
      expect(values.users.length).toBe(2)
    })

    it('insert should clamp index to valid range', () => {
      const { fields, getValues } = useForm({
        schema: arraySchema,
        defaultValues: {
          users: [{ name: 'Alice', email: 'alice@test.com' }],
        },
      })

      const userFields = fields('users')

      // Insert at out-of-bounds index should append
      userFields.insert(99, { name: 'Bob', email: 'bob@test.com' })

      const values = getValues()
      expect(values.users.length).toBe(2)
      expect(values.users[1].name).toBe('Bob')
    })

    it('insert with negative index should prepend', () => {
      const { fields, getValues } = useForm({
        schema: arraySchema,
        defaultValues: {
          users: [{ name: 'Alice', email: 'alice@test.com' }],
        },
      })

      const userFields = fields('users')
      userFields.insert(-5, { name: 'Bob', email: 'bob@test.com' })

      const values = getValues()
      expect(values.users.length).toBe(2)
      expect(values.users[0].name).toBe('Bob')
    })
  })

  describe('Fix #12: Index caching', () => {
    it('should return correct indices after append', () => {
      const { fields } = useForm({
        schema: arraySchema,
        defaultValues: {
          users: [],
        },
      })

      // Append items
      fields('users').append({ name: 'Alice', email: 'alice@test.com' })
      fields('users').append({ name: 'Bob', email: 'bob@test.com' })
      fields('users').append({ name: 'Charlie', email: 'charlie@test.com' })

      // Get fresh reference to check indices
      const userFields = fields('users')

      // Check indices (O(1) lookup via cache)
      expect(userFields.value[0].index).toBe(0)
      expect(userFields.value[1].index).toBe(1)
      expect(userFields.value[2].index).toBe(2)
    })

    it('should update indices after remove', () => {
      const { fields } = useForm({
        schema: arraySchema,
        defaultValues: {
          users: [],
        },
      })

      // Add items
      fields('users').append({ name: 'Alice', email: 'alice@test.com' })
      fields('users').append({ name: 'Bob', email: 'bob@test.com' })
      fields('users').append({ name: 'Charlie', email: 'charlie@test.com' })

      // Remove middle item
      fields('users').remove(1)

      // Get fresh reference
      const userFields = fields('users')

      // Check indices are updated
      expect(userFields.value.length).toBe(2)
      expect(userFields.value[0].index).toBe(0)
      expect(userFields.value[1].index).toBe(1)
    })

    it('should update indices after swap', () => {
      const { fields, getValues } = useForm({
        schema: arraySchema,
        defaultValues: {
          users: [],
        },
      })

      // Add items
      fields('users').append({ name: 'Alice', email: 'alice@test.com' })
      fields('users').append({ name: 'Bob', email: 'bob@test.com' })

      // Get keys before swap
      const keysBefore = fields('users').value.map((item) => item.key)

      // Swap
      fields('users').swap(0, 1)

      // Get fresh reference
      const userFields = fields('users')

      // Keys should be swapped
      expect(userFields.value[0].key).toBe(keysBefore[1])
      expect(userFields.value[1].key).toBe(keysBefore[0])

      // Indices should still be correct
      expect(userFields.value[0].index).toBe(0)
      expect(userFields.value[1].index).toBe(1)

      // Values should be swapped
      const values = getValues()
      expect(values.users[0].name).toBe('Bob')
      expect(values.users[1].name).toBe('Alice')
    })
  })
})

describe('Path Utils Hardening', () => {
  describe('Fix #13: set() overwrite warning', () => {
    it('should warn when overwriting primitive with object in development', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Temporarily set NODE_ENV
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const obj: Record<string, unknown> = { user: 'string value' }
      set(obj, 'user.name', 'John')

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy.mock.calls[0][0]).toContain('Overwriting primitive')

      process.env.NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })
  })
})
