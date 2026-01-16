import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { useForm } from '../../useForm'
import { z } from 'zod'
import { waitFor } from '../helpers/test-utils'

// Helper to wait for async validation to complete
async function flushValidation(): Promise<void> {
  await nextTick()
  await waitFor(0)
  await nextTick()
}

const schema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Username too short'),
  password: z.string().min(8, 'Password too short'),
})

describe('persistent errors', () => {
  describe('setError with persistent: true', () => {
    it('should create a persistent error', async () => {
      const { setError, formState } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      setError('email', { message: 'Email already taken', persistent: true })

      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.email).toBe('Email already taken')
    })

    it('should preserve persistent error across field-specific validation', async () => {
      const { setError, formState, trigger } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      // Set a persistent server-side error
      setError('email', { message: 'Email already taken', persistent: true })

      expect(formState.value.errors.email).toBe('Email already taken')

      // Trigger field-specific validation - persistent error should survive
      await trigger('email')
      await flushValidation()

      // The persistent error should still be there
      expect(formState.value.errors.email).toBe('Email already taken')
    })

    it('should preserve persistent error when other fields change', async () => {
      const { setError, formState, setValue } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      // Set a persistent error on email
      setError('email', { message: 'Email already taken', persistent: true })

      // Change another field with validation
      setValue('username', 'newuser', { shouldValidate: true })
      await flushValidation()

      // Email's persistent error should still be there
      expect(formState.value.errors.email).toBe('Email already taken')
    })
  })

  describe('clearErrors removes persistent errors', () => {
    it('should clear persistent error when clearErrors is called for that field', async () => {
      const { setError, clearErrors, formState } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      setError('email', { message: 'Email already taken', persistent: true })
      expect(formState.value.errors.email).toBe('Email already taken')

      clearErrors('email')

      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should clear all persistent errors when clearErrors is called without arguments', async () => {
      const { setError, clearErrors, formState } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      setError('email', { message: 'Email already taken', persistent: true })
      setError('username', { message: 'Username already taken', persistent: true })

      expect(formState.value.errors.email).toBe('Email already taken')
      expect(formState.value.errors.username).toBe('Username already taken')

      clearErrors()

      expect(formState.value.errors.email).toBeUndefined()
      expect(formState.value.errors.username).toBeUndefined()
    })

    it('should allow new validation errors after clearing persistent error', async () => {
      const { setError, clearErrors, formState, setValue } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      // Set persistent error
      setError('email', { message: 'Email already taken', persistent: true })

      // Clear it
      clearErrors('email')

      // Set invalid value and trigger validation
      setValue('email', 'invalid-email', { shouldValidate: true })
      await flushValidation()

      // Should now have schema validation error
      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.email).not.toBe('Email already taken')
    })
  })

  describe('non-persistent errors (default behavior)', () => {
    it('should clear non-persistent errors on validation', async () => {
      const { setError, formState, trigger } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      // Set a non-persistent error (default)
      setError('email', { message: 'Some temporary error' })

      expect(formState.value.errors.email).toBe('Some temporary error')

      // Trigger validation - non-persistent error should be cleared
      await trigger('email')
      await flushValidation()

      // Non-persistent error should be replaced/cleared
      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should replace non-persistent error with schema error', async () => {
      const { setError, formState, trigger } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: { email: 'invalid', username: 'user', password: 'password123' },
      })

      // Set a non-persistent error
      setError('email', { message: 'Custom error' })

      expect(formState.value.errors.email).toBe('Custom error')

      // Trigger validation with invalid data
      await trigger('email')
      await flushValidation()

      // Should now have schema validation error, not our custom error
      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.email).toBe('Invalid email')
    })
  })

  describe('multiple persistent errors', () => {
    it('should support multiple persistent errors on different fields', async () => {
      const { setError, formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      setError('email', { message: 'Email taken', persistent: true })
      setError('username', { message: 'Username taken', persistent: true })

      expect(formState.value.errors.email).toBe('Email taken')
      expect(formState.value.errors.username).toBe('Username taken')

      // Trigger field-specific validations
      await trigger('email')
      await trigger('username')
      await flushValidation()

      // Both should survive field-level validation
      expect(formState.value.errors.email).toBe('Email taken')
      expect(formState.value.errors.username).toBe('Username taken')
    })

    it('should allow clearing individual persistent errors', async () => {
      const { setError, clearErrors, formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      setError('email', { message: 'Email taken', persistent: true })
      setError('username', { message: 'Username taken', persistent: true })

      // Clear only email
      clearErrors('email')

      expect(formState.value.errors.email).toBeUndefined()
      expect(formState.value.errors.username).toBe('Username taken')

      // Trigger field-specific validation
      await trigger('username')
      await flushValidation()

      // Username persistent error should still survive
      expect(formState.value.errors.username).toBe('Username taken')
    })
  })

  describe('persistent errors with error type', () => {
    it('should support persistent error with custom type', async () => {
      const { setError, formState } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      setError('email', { type: 'server', message: 'Email taken', persistent: true })

      expect(formState.value.errors.email).toBeDefined()
    })
  })

  describe('persistent errors and form reset', () => {
    it('should clear persistent errors on form reset', async () => {
      const { setError, formState, reset } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      setError('email', { message: 'Email taken', persistent: true })
      expect(formState.value.errors.email).toBe('Email taken')

      reset()

      expect(formState.value.errors.email).toBeUndefined()
      expect(formState.value.errors).toEqual({})
    })
  })

  describe('root-level persistent errors', () => {
    it('should support persistent root-level errors', async () => {
      const { setError, formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      setError('root', { message: 'Form submission failed', persistent: true })

      expect(formState.value.errors.root).toBeDefined()
      expect(formState.value.errors.root).toBe('Form submission failed')

      // Trigger field-specific validation
      await trigger('email')
      await flushValidation()

      // Root error should survive field-level validation
      expect(formState.value.errors.root).toBe('Form submission failed')
    })

    it('should clear root persistent error with clearErrors', async () => {
      const { setError, clearErrors, formState } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      setError('root', { message: 'Form error', persistent: true })
      expect(formState.value.errors.root).toBe('Form error')

      clearErrors('root')

      expect(formState.value.errors.root).toBeUndefined()
    })
  })
})
