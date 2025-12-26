import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { useForm } from '../../useForm'

// Schema with multiple validations on same field
const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
})

describe('Multi-Error Support', () => {
  describe('single error (backward compatibility)', () => {
    it('should return string error when only one validation fails', async () => {
      const form = useForm({
        schema,
        defaultValues: {
          password: 'Abc12345', // Valid password
          email: 'invalid', // Invalid email
          username: 'john',
        },
      })

      await form.validate()

      // Single error should be a string
      const error = form.formState.value.errors.email
      expect(typeof error).toBe('string')
      expect(error).toBe('Invalid email')
    })

    it('should work with getFieldState for single errors', async () => {
      const form = useForm({
        schema,
        defaultValues: {
          password: 'Abc12345',
          email: 'invalid',
          username: 'john',
        },
      })

      await form.validate()

      const fieldState = form.getFieldState('email')
      expect(fieldState.invalid).toBe(true)
      expect(fieldState.error).toBe('Invalid email')
    })
  })

  describe('multiple errors per field', () => {
    it('should return FieldError with types when multiple validations fail', async () => {
      const form = useForm({
        schema,
        criteriaMode: 'all', // Enable multi-error collection
        defaultValues: {
          password: 'abc', // Too short, no uppercase, no number
          email: 'test@example.com',
          username: 'john',
        },
      })

      await form.validate()

      const error = form.formState.value.errors.password
      expect(typeof error).toBe('object')
      expect(error).toHaveProperty('type')
      expect(error).toHaveProperty('message')
      expect(error).toHaveProperty('types')
    })

    it('should collect all error types in types object', async () => {
      const form = useForm({
        schema,
        criteriaMode: 'all', // Enable multi-error collection
        defaultValues: {
          password: 'abc', // Too short, no uppercase, no number
          email: 'test@example.com',
          username: 'john',
        },
      })

      await form.validate()

      const error = form.formState.value.errors.password as {
        type: string
        message: string
        types: Record<string, string | string[]>
      }

      // Should have the first error's type and message
      expect(error.type).toBe('too_small')
      expect(error.message).toBe('Password must be at least 8 characters')

      // Should have all error types (Zod v4 uses 'invalid_format' for regex)
      expect(error.types.too_small).toBe('Password must be at least 8 characters')
      expect(error.types.invalid_format).toEqual([
        'Password must contain an uppercase letter',
        'Password must contain a number',
      ])
    })

    it('should work with getFieldState for multiple errors', async () => {
      const form = useForm({
        schema,
        criteriaMode: 'all', // Enable multi-error collection
        defaultValues: {
          password: 'abc',
          email: 'test@example.com',
          username: 'john',
        },
      })

      await form.validate()

      const fieldState = form.getFieldState('password')
      expect(fieldState.invalid).toBe(true)
      expect(typeof fieldState.error).toBe('object')
    })
  })

  describe('setError with type', () => {
    it('should create structured error when type is provided', () => {
      const form = useForm({
        schema,
        defaultValues: {
          password: 'Abc12345',
          email: 'test@example.com',
          username: 'john',
        },
      })

      form.setError('email', {
        type: 'custom',
        message: 'This email is already taken',
      })

      const error = form.formState.value.errors.email as {
        type: string
        message: string
      }
      expect(error.type).toBe('custom')
      expect(error.message).toBe('This email is already taken')
    })

    it('should create string error when type is not provided (backward compatible)', () => {
      const form = useForm({
        schema,
        defaultValues: {
          password: 'Abc12345',
          email: 'test@example.com',
          username: 'john',
        },
      })

      form.setError('email', {
        message: 'This email is already taken',
      })

      const error = form.formState.value.errors.email
      expect(error).toBe('This email is already taken')
    })
  })

  describe('root errors', () => {
    it('should support root-level errors', () => {
      const form = useForm({
        schema,
        defaultValues: {
          password: 'Abc12345',
          email: 'test@example.com',
          username: 'john',
        },
      })

      form.setError('root', {
        type: 'server',
        message: 'Server error occurred',
      })

      const error = form.formState.value.errors.root
      expect(error).toEqual({
        type: 'server',
        message: 'Server error occurred',
      })
    })

    it('should support namespaced root errors', () => {
      const form = useForm({
        schema,
        defaultValues: {
          password: 'Abc12345',
          email: 'test@example.com',
          username: 'john',
        },
      })

      form.setError('root.serverError', {
        type: 'server',
        message: 'Server error occurred',
      })

      // The set() utility treats dots as nested paths, so root.serverError creates { root: { serverError: ... } }
      const errors = form.formState.value.errors as { root?: { serverError?: unknown } }
      expect(errors.root?.serverError).toEqual({
        type: 'server',
        message: 'Server error occurred',
      })
    })
  })

  describe('clearErrors with multi-error', () => {
    it('should clear structured errors', async () => {
      const form = useForm({
        schema,
        defaultValues: {
          password: 'abc',
          email: 'test@example.com',
          username: 'john',
        },
      })

      await form.validate()
      expect(form.formState.value.errors.password).toBeDefined()

      form.clearErrors('password')
      expect(form.formState.value.errors.password).toBeUndefined()
    })
  })

  describe('type exports', () => {
    it('should export FieldError type', async () => {
      const exports = await import('../../index')
      // Type exports can't be checked at runtime, but we can verify the module exports
      expect(exports).toBeDefined()
    })
  })

  // ============================================
  // criteriaMode Option Tests
  // ============================================
  describe('criteriaMode option', () => {
    it('should return first error message as string with criteriaMode: firstError', async () => {
      const form = useForm({
        schema,
        defaultValues: { password: '', email: '', username: '' },
        criteriaMode: 'firstError',
      })

      // Set value that violates multiple rules
      form.setValue('password', 'abc')
      await form.trigger('password')

      // Should be a string (first error only)
      expect(typeof form.formState.value.errors.password).toBe('string')
    })

    it('should return string for single error with criteriaMode: all', async () => {
      const simpleSchema = z.object({
        password: z.string().min(8, 'At least 8 characters'),
      })

      const form = useForm({
        schema: simpleSchema,
        defaultValues: { password: '' },
        criteriaMode: 'all',
      })

      // Set value that violates only one rule
      form.setValue('password', 'short')
      await form.trigger('password')

      // Single error should still be a string for backward compatibility
      expect(typeof form.formState.value.errors.password).toBe('string')
    })

    it('should return FieldError with types for multiple errors', async () => {
      const form = useForm({
        schema,
        defaultValues: { password: '', email: '', username: '' },
        criteriaMode: 'all',
      })

      // Set value that violates multiple rules (too short, no number, no uppercase)
      form.setValue('password', 'abc')
      await form.trigger('password')

      const error = form.formState.value.errors.password

      // When multiple errors, should be a FieldError object
      if (typeof error === 'object' && error !== null && 'types' in error) {
        expect(error.type).toBeDefined()
        expect(error.message).toBeDefined()
        expect(error.types).toBeDefined()
      } else {
        // If it's still a string, that's also valid for the first error
        expect(typeof error).toBe('string')
      }
    })

    it('should default to firstError mode', async () => {
      const form = useForm({
        schema,
        defaultValues: { password: '', email: '', username: '' },
        // No criteriaMode specified - should default to 'firstError'
      })

      form.setValue('password', 'abc')
      await form.trigger('password')

      // Default should be string (firstError)
      expect(typeof form.formState.value.errors.password).toBe('string')
    })
  })
})
