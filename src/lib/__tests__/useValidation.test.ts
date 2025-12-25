import { describe, it, expect } from 'vitest'
import { useForm } from '../useForm'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

const nestedSchema = z.object({
  user: z.object({
    email: z.string().email(),
    profile: z.object({
      bio: z.string().min(10, 'Bio must be at least 10 characters'),
      age: z.number().min(0, 'Age must be positive').optional(),
    }),
  }),
})

const arraySchema = z.object({
  users: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email'),
    }),
  ),
})

describe('useValidation', () => {
  describe('validate function', () => {
    describe('full form validation', () => {
      it('should return true when form is valid', async () => {
        const { validate, setValue } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        setValue('email', 'test@example.com')
        setValue('password', 'password123')
        setValue('name', 'John Doe')

        const isValid = await validate()

        expect(isValid).toBe(true)
      })

      it('should return false when form is invalid', async () => {
        const { validate, setValue } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        setValue('email', 'invalid-email')
        setValue('password', 'short')
        setValue('name', 'J')

        const isValid = await validate()

        expect(isValid).toBe(false)
      })

      it('should populate errors object on validation failure', async () => {
        const { validate, setValue, formState } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        setValue('email', 'invalid-email')
        setValue('password', 'short')
        setValue('name', 'J')

        await validate()

        expect(formState.value.errors.email).toBe('Invalid email format')
        expect(formState.value.errors.password).toBe(
          'Password must be at least 8 characters',
        )
        expect(formState.value.errors.name).toBe(
          'Name must be at least 2 characters',
        )
      })

      it('should clear all errors when form becomes valid', async () => {
        const { validate, setValue, formState } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        // First, create some errors
        setValue('email', 'invalid')
        await validate()
        expect(formState.value.errors.email).toBeDefined()

        // Then fix all values
        setValue('email', 'test@example.com')
        setValue('password', 'password123')
        setValue('name', 'John Doe')

        await validate()

        expect(formState.value.errors.email).toBeUndefined()
        expect(formState.value.errors.password).toBeUndefined()
        expect(formState.value.errors.name).toBeUndefined()
      })
    })

    describe('single field validation', () => {
      it('should validate only the specified field', async () => {
        const { validate, setValue, formState } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        setValue('email', 'invalid-email')
        setValue('password', 'short')

        // Validate only email field
        await validate('email')

        expect(formState.value.errors.email).toBe('Invalid email format')
        // Password error should not be set since we only validated email
        expect(formState.value.errors.password).toBeUndefined()
      })

      it('should return true when single field is valid', async () => {
        const { validate, setValue } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        setValue('email', 'test@example.com')
        setValue('password', 'short') // Invalid but not being validated

        const isValid = await validate('email')

        expect(isValid).toBe(true)
      })

      it('should return false when single field is invalid', async () => {
        const { validate, setValue } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        setValue('email', 'invalid')

        const isValid = await validate('email')

        expect(isValid).toBe(false)
      })

      it('should clear error for field when it becomes valid', async () => {
        const { validate, setValue, formState } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        // Create error
        setValue('email', 'invalid')
        await validate('email')
        expect(formState.value.errors.email).toBeDefined()

        // Fix value
        setValue('email', 'valid@email.com')
        await validate('email')

        expect(formState.value.errors.email).toBeUndefined()
      })
    })

    describe('nested field validation', () => {
      it('should validate nested fields correctly', async () => {
        const { validate, setValue, formState } = useForm({
          schema: nestedSchema,
          defaultValues: {
            user: {
              email: '',
              profile: { bio: '', age: undefined },
            },
          },
        })

        setValue('user.email', 'invalid')
        setValue('user.profile.bio', 'short')

        await validate()

        // Errors are stored as nested objects via set()
        const errors = formState.value.errors as Record<string, unknown>
        expect((errors.user as Record<string, unknown>)?.email).toBeDefined()
        expect(
          ((errors.user as Record<string, unknown>)?.profile as Record<string, unknown>)?.bio,
        ).toBe('Bio must be at least 10 characters')
      })

      it('should validate single nested field', async () => {
        const { validate, setValue, formState } = useForm({
          schema: nestedSchema,
          defaultValues: {
            user: {
              email: '',
              profile: { bio: '', age: undefined },
            },
          },
        })

        setValue('user.email', 'invalid')
        setValue('user.profile.bio', 'short') // Invalid but not validated

        await validate('user.email')

        const errors = formState.value.errors as Record<string, unknown>
        expect((errors.user as Record<string, unknown>)?.email).toBeDefined()
        // Profile errors should not be set since we only validated user.email
        expect(
          ((errors.user as Record<string, unknown>)?.profile as Record<string, unknown>)?.bio,
        ).toBeUndefined()
      })

      it('should validate nested field after value change', async () => {
        const { validate, setValue, formState } = useForm({
          schema: nestedSchema,
          defaultValues: {
            user: {
              email: '',
              profile: { bio: '', age: undefined },
            },
          },
        })

        setValue('user.email', 'invalid')
        await validate('user.email')
        const errors = formState.value.errors as Record<string, unknown>
        expect((errors.user as Record<string, unknown>)?.email).toBeDefined()

        // Full form validation clears all errors when valid
        setValue('user.email', 'valid@email.com')
        setValue('user.profile.bio', 'A valid bio that is long enough')
        await validate() // Full form validation

        // After full validation with all valid values, errors should be cleared
        const errorsAfter = formState.value.errors as Record<string, unknown>
        expect(Object.keys(errorsAfter).length).toBe(0)
      })
    })

    describe('array field validation', () => {
      it('should validate array field items', async () => {
        const { validate, fields, formState } = useForm({
          schema: arraySchema,
          defaultValues: { users: [] },
        })

        const usersArray = fields('users')
        usersArray.append({ name: '', email: 'invalid' })

        await validate()

        // Errors are stored as nested objects
        const errors = formState.value.errors as Record<string, unknown>
        const users = errors.users as Array<Record<string, unknown>>
        expect(users?.[0]?.name).toBe('Name is required')
        expect(users?.[0]?.email).toBe('Invalid email')
      })

      it('should validate specific array item', async () => {
        const { validate, fields, formState } = useForm({
          schema: arraySchema,
          defaultValues: { users: [] },
        })

        const usersArray = fields('users')
        usersArray.append({ name: '', email: 'invalid' })
        usersArray.append({ name: '', email: 'also-invalid' })

        await validate('users.0.email')

        const errors = formState.value.errors as Record<string, unknown>
        const users = errors.users as Array<Record<string, unknown>>
        expect(users?.[0]?.email).toBe('Invalid email')
        // Second item should not be validated
        expect(users?.[1]?.email).toBeUndefined()
      })
    })
  })

  describe('error message extraction', () => {
    it('should use custom error messages from schema', async () => {
      const customSchema = z.object({
        email: z.string().email('Please enter a valid email address'),
        age: z.number().min(18, 'You must be at least 18 years old'),
      })

      const { validate, setValue, formState } = useForm({
        schema: customSchema,
        defaultValues: { email: '', age: 0 },
      })

      setValue('email', 'bad')
      setValue('age', 10)

      await validate()

      expect(formState.value.errors.email).toBe(
        'Please enter a valid email address',
      )
      expect(formState.value.errors.age).toBe(
        'You must be at least 18 years old',
      )
    })

    it('should handle multiple validation rules on same field', async () => {
      const strictSchema = z.object({
        password: z
          .string()
          .min(8, 'Too short')
          .max(20, 'Too long')
          .regex(/[A-Z]/, 'Must contain uppercase'),
      })

      const { validate, setValue, formState } = useForm({
        schema: strictSchema,
        defaultValues: { password: '' },
      })

      // Test min length - Zod returns first failing validation
      setValue('password', 'short')
      await validate()
      // Password "short" is too short AND missing uppercase, Zod returns first error
      expect(formState.value.errors.password).toBeDefined()

      // Test uppercase requirement (long enough but no uppercase)
      setValue('password', 'longenoughbutlower')
      await validate()
      expect(formState.value.errors.password).toBe('Must contain uppercase')

      // Valid password
      setValue('password', 'ValidPassword1')
      await validate()
      expect(formState.value.errors.password).toBeUndefined()
    })
  })

  describe('trigger method', () => {
    it('should trigger validation for entire form', async () => {
      const { trigger, setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'invalid')

      const isValid = await trigger()

      expect(isValid).toBe(false)
      expect(formState.value.errors.email).toBeDefined()
    })

    it('should trigger validation for specific field', async () => {
      const { trigger, setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'invalid')
      setValue('password', 'short')

      await trigger('email')

      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.password).toBeUndefined()
    })

    it('should trigger validation for multiple fields', async () => {
      const { trigger, setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'invalid')
      setValue('password', 'short')
      setValue('name', 'J')

      await trigger(['email', 'password'])

      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.password).toBeDefined()
      expect(formState.value.errors.name).toBeUndefined()
    })

    it('should not affect submitCount', async () => {
      const { trigger, setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'invalid')

      await trigger()

      expect(formState.value.submitCount).toBe(0)
    })
  })

  describe('clearErrors', () => {
    it('should clear all errors', async () => {
      const { validate, setValue, clearErrors, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'invalid')
      setValue('password', 'short')
      await validate()

      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)

      clearErrors()

      expect(Object.keys(formState.value.errors).length).toBe(0)
    })

    it('should clear error for specific field', async () => {
      const { validate, setValue, clearErrors, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'invalid')
      setValue('password', 'short')
      await validate()

      clearErrors('email')

      expect(formState.value.errors.email).toBeUndefined()
      expect(formState.value.errors.password).toBeDefined()
    })

    it('should clear errors for nested field and children', async () => {
      const { validate, clearErrors, formState } = useForm({
        schema: nestedSchema,
        defaultValues: {
          user: {
            email: 'invalid',
            profile: { bio: 'short', age: undefined },
          },
        },
      })

      await validate()

      // Errors are stored as nested objects
      const errors = formState.value.errors as Record<string, unknown>
      expect((errors.user as Record<string, unknown>)?.email).toBeDefined()
      expect(
        ((errors.user as Record<string, unknown>)?.profile as Record<string, unknown>)?.bio,
      ).toBeDefined()

      // Clear all user errors (including nested)
      clearErrors('user')

      const errorsAfter = formState.value.errors as Record<string, unknown>
      expect((errorsAfter.user as Record<string, unknown>)?.email).toBeUndefined()
      expect(
        ((errorsAfter.user as Record<string, unknown>)?.profile as Record<string, unknown>)?.bio,
      ).toBeUndefined()
    })
  })

  describe('setError', () => {
    it('should set error for specific field', () => {
      const { setError, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setError('email', { message: 'Custom error' })

      expect(formState.value.errors.email).toBe('Custom error')
    })

    it('should set root level error', () => {
      const { setError, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setError('root', { message: 'Form-level error' })

      expect(formState.value.errors.root).toBe('Form-level error')
    })

    it('should override existing error', () => {
      const { setError, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setError('email', { message: 'First error' })
      setError('email', { message: 'Second error' })

      expect(formState.value.errors.email).toBe('Second error')
    })

    it('should set error with type', () => {
      const { setError, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setError('email', { type: 'server', message: 'Email already exists' })

      // With type provided, error is structured as { type, message }
      expect(formState.value.errors.email).toEqual({
        type: 'server',
        message: 'Email already exists',
      })
    })
  })
})
