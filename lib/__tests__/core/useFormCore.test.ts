import { describe, it, expect, vi } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'
import { schemas } from '../helpers/test-utils'

const schema = schemas.basic

describe('useForm - core', () => {
  describe('core functionality', () => {
    it('should create a form with default values', () => {
      const { formState, getValues } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      expect(formState.value.isDirty).toBe(false)
      expect(getValues()).toEqual({
        email: 'test@example.com',
        password: 'password123',
        name: 'John',
      })
    })

    it('should track form state correctly', () => {
      const { formState } = useForm({ schema })

      expect(formState.value.isDirty).toBe(false)
      expect(formState.value.isSubmitting).toBe(false)
      expect(formState.value.submitCount).toBe(0)
      expect(formState.value.errors).toEqual({})
      expect(formState.value.touchedFields).toEqual({})
      expect(formState.value.dirtyFields).toEqual({})
    })
  })

  describe('per-field dirty tracking', () => {
    it('should reset dirty fields on form reset', () => {
      const { formState, setValue, reset } = useForm({ schema })

      setValue('email', 'test@example.com')
      expect(formState.value.isDirty).toBe(true)

      reset()

      expect(formState.value.dirtyFields).toEqual({})
      expect(formState.value.isDirty).toBe(false)
    })
  })

  describe('per-field touched tracking', () => {
    it('should reset touched fields on form reset', async () => {
      const { register, formState, reset } = useForm({ schema })

      const emailField = register('email')
      await emailField.onBlur(new Event('blur'))

      expect(formState.value.touchedFields.email).toBe(true)

      reset()

      expect(formState.value.touchedFields).toEqual({})
    })
  })

  describe('async defaultValues', () => {
    it('should set isLoading to true initially when defaultValues is async', async () => {
      const { formState } = useForm({
        schema,
        defaultValues: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          return { email: 'async@test.com', password: 'password123', name: 'Test' }
        },
      })

      // Initially loading
      expect(formState.value.isLoading).toBe(true)

      // Wait for async completion
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(formState.value.isLoading).toBe(false)
    })

    it('should populate form data after async defaultValues resolve', async () => {
      const { formState, getValues } = useForm({
        schema,
        defaultValues: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return { email: 'async@test.com', password: 'password123', name: 'Async User' }
        },
      })

      expect(formState.value.isLoading).toBe(true)
      expect(getValues('email')).toBeUndefined()

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(formState.value.isLoading).toBe(false)
      expect(getValues('email')).toBe('async@test.com')
      expect(getValues('name')).toBe('Async User')
    })

    it('should not set isLoading for sync defaultValues', () => {
      const { formState } = useForm({
        schema,
        defaultValues: { email: 'sync@test.com', password: 'password123', name: 'Sync User' },
      })

      expect(formState.value.isLoading).toBe(false)
    })

    it('should not set isLoading when no defaultValues provided', () => {
      const { formState } = useForm({ schema })

      expect(formState.value.isLoading).toBe(false)
    })

    it('should handle async defaultValues error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { formState } = useForm({
        schema,
        defaultValues: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          throw new Error('Failed to fetch defaults')
        },
      })

      expect(formState.value.isLoading).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(formState.value.isLoading).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should have isReady true immediately for sync defaultValues', () => {
      const { formState } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', password: 'password123', name: 'John' },
      })

      expect(formState.value.isReady).toBe(true)
      expect(formState.value.isLoading).toBe(false)
    })

    it('should have isReady false while loading async defaultValues', async () => {
      const { formState } = useForm({
        schema,
        defaultValues: async () => {
          await new Promise((r) => setTimeout(r, 50))
          return { email: 'async@test.com', password: 'password123', name: 'Async John' }
        },
      })

      expect(formState.value.isReady).toBe(false)
      expect(formState.value.isLoading).toBe(true)

      // Wait for async defaultValues to load
      await new Promise((r) => setTimeout(r, 100))

      expect(formState.value.isReady).toBe(true)
      expect(formState.value.isLoading).toBe(false)
    })
  })

  describe('nested fields', () => {
    const nestedSchema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string().min(2),
          email: z.email(),
        }),
      }),
    })

    it('should track dirty state for nested fields', () => {
      const { formState, setValue } = useForm({ schema: nestedSchema })

      setValue('user.profile.name', 'John')

      expect(formState.value.dirtyFields['user.profile.name']).toBe(true)
    })

    it('should get field state for nested fields', async () => {
      const { getFieldState, setValue, validate } = useForm({ schema: nestedSchema })

      setValue('user.profile.email', 'invalid')
      await validate()

      const state = getFieldState('user.profile.email')
      expect(state.isDirty).toBe(true)
      expect(state.invalid).toBe(true)
    })

    it('should clear nested field errors', async () => {
      const { clearErrors, formState, validate } = useForm({ schema: nestedSchema })

      await validate()

      clearErrors('user.profile.name')

      expect(
        formState.value.errors['user.profile.name' as keyof typeof formState.value.errors],
      ).toBeUndefined()
    })
  })
})
