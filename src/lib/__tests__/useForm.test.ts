import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../useForm'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

describe('useForm', () => {
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
    it('should track individual field dirty state', () => {
      const { formState, setValue } = useForm({ schema })

      expect(formState.value.dirtyFields).toEqual({})
      expect(formState.value.isDirty).toBe(false)

      setValue('email', 'test@example.com')

      expect(formState.value.dirtyFields).toEqual({ email: true })
      expect(formState.value.isDirty).toBe(true)
    })

    it('should track multiple dirty fields independently', () => {
      const { formState, setValue } = useForm({ schema })

      setValue('email', 'test@example.com')
      setValue('name', 'John')

      expect(formState.value.dirtyFields).toEqual({
        email: true,
        name: true,
      })
    })

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
    it('should track touched fields as Record', () => {
      const { formState } = useForm({ schema })

      expect(formState.value.touchedFields).toEqual({})
    })

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
  })

  describe('reset options', () => {
    it('should keep errors when keepErrors is true', async () => {
      const { formState, reset, validate } = useForm({ schema })

      await validate()
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
      const errorsBefore = { ...formState.value.errors }

      reset(undefined, { keepErrors: true })

      expect(formState.value.errors).toEqual(errorsBefore)
    })

    it('should keep dirty fields when keepDirty is true', () => {
      const { formState, setValue, reset } = useForm({ schema })

      setValue('email', 'test@example.com')
      expect(formState.value.isDirty).toBe(true)
      expect(formState.value.dirtyFields.email).toBe(true)

      reset(undefined, { keepDirty: true })

      expect(formState.value.dirtyFields.email).toBe(true)
      expect(formState.value.isDirty).toBe(true)
    })

    it('should keep touched fields when keepTouched is true', async () => {
      const { register, formState, reset } = useForm({ schema })

      const emailField = register('email')
      await emailField.onBlur(new Event('blur'))
      expect(formState.value.touchedFields.email).toBe(true)

      reset(undefined, { keepTouched: true })

      expect(formState.value.touchedFields.email).toBe(true)
    })

    it('should keep submit count when keepSubmitCount is true', async () => {
      const { handleSubmit, formState, reset } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', password: 'password123', name: 'Test' },
      })

      const mockSubmit = vi.fn()
      const onSubmit = handleSubmit(mockSubmit)
      await onSubmit(new Event('submit'))
      expect(formState.value.submitCount).toBe(1)

      reset(undefined, { keepSubmitCount: true })

      expect(formState.value.submitCount).toBe(1)
    })

    it('should reset submit count by default', async () => {
      const { handleSubmit, formState, reset } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', password: 'password123', name: 'Test' },
      })

      const mockSubmit = vi.fn()
      const onSubmit = handleSubmit(mockSubmit)
      await onSubmit(new Event('submit'))
      expect(formState.value.submitCount).toBe(1)

      reset()

      expect(formState.value.submitCount).toBe(0)
    })

    it('should update default values when new values provided', () => {
      const { reset, getValues } = useForm({
        schema,
        defaultValues: { email: 'old@test.com', password: '', name: '' },
      })

      reset({ email: 'new@test.com', password: 'newpass', name: 'New Name' })

      // After reset with values, getValues should return new values
      expect(getValues('email')).toBe('new@test.com')

      // Reset again without values should use the updated defaults
      reset()
      expect(getValues('email')).toBe('new@test.com')
    })

    it('should keep default values when keepDefaultValues is true', () => {
      const { reset, getValues } = useForm({
        schema,
        defaultValues: { email: 'old@test.com', password: 'oldpass', name: 'Old Name' },
      })

      // Reset with new values but keepDefaultValues
      reset({ email: 'new@test.com', password: 'newpass', name: 'New Name' }, { keepDefaultValues: true })

      // Values should be the new ones
      expect(getValues('email')).toBe('new@test.com')

      // Reset again without values - should go back to original defaults
      reset()
      expect(getValues('email')).toBe('old@test.com')
    })

    it('should support multiple keep options simultaneously', async () => {
      const { formState, setValue, validate, reset, register } = useForm({ schema })

      setValue('email', 'test@example.com')
      const emailField = register('email')
      await emailField.onBlur(new Event('blur'))
      await validate()

      const errorsBefore = { ...formState.value.errors }

      reset(undefined, {
        keepErrors: true,
        keepDirty: true,
        keepTouched: true,
      })

      expect(formState.value.errors).toEqual(errorsBefore)
      expect(formState.value.dirtyFields.email).toBe(true)
      expect(formState.value.touchedFields.email).toBe(true)
    })
  })

  describe('clearErrors', () => {
    it('should clear all errors when called without arguments', async () => {
      const { clearErrors, formState, validate } = useForm({ schema })

      await validate()
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)

      clearErrors()

      expect(formState.value.errors).toEqual({})
    })

    it('should clear error for a specific field', async () => {
      const { clearErrors, formState, validate } = useForm({ schema })

      await validate()
      expect(formState.value.errors.email).toBeDefined()

      clearErrors('email')

      expect(formState.value.errors.email).toBeUndefined()
      expect(formState.value.errors.password).toBeDefined()
    })

    it('should clear errors for multiple specified fields', async () => {
      const { clearErrors, formState, validate } = useForm({ schema })

      await validate()

      clearErrors(['email', 'password'])

      expect(formState.value.errors.email).toBeUndefined()
      expect(formState.value.errors.password).toBeUndefined()
    })

    it('should handle non-existent field gracefully', () => {
      const { clearErrors, formState } = useForm({ schema })

      expect(() => clearErrors('email')).not.toThrow()
      expect(formState.value.errors).toEqual({})
    })
  })

  describe('setError', () => {
    it('should set an error for a specific field', () => {
      const { setError, formState } = useForm({ schema })

      setError('email', { message: 'This email is already taken' })

      expect(formState.value.errors.email).toBe('This email is already taken')
    })

    it('should set error with type', () => {
      const { setError, formState } = useForm({ schema })

      setError('email', { type: 'server', message: 'Email already exists' })

      // With type provided, error is structured as { type, message }
      expect(formState.value.errors.email).toEqual({
        type: 'server',
        message: 'Email already exists',
      })
    })

    it('should override existing field error', async () => {
      const { setError, formState, validate } = useForm({ schema })

      await validate()
      const originalError = formState.value.errors.email

      setError('email', { message: 'Custom error' })

      expect(formState.value.errors.email).toBe('Custom error')
      expect(formState.value.errors.email).not.toBe(originalError)
    })

    it('should set root-level error', () => {
      const { setError, formState } = useForm({ schema })

      setError('root' as 'email', { type: 'server', message: 'Server error occurred' })

      // With type provided, error is structured as { type, message }
      expect((formState.value.errors as Record<string, unknown>).root).toEqual({
        type: 'server',
        message: 'Server error occurred',
      })
    })
  })

  describe('getValues', () => {
    it('should return all form values', () => {
      const defaultValues = {
        email: 'test@example.com',
        name: 'John',
        password: 'password123',
      }
      const { getValues } = useForm({ schema, defaultValues })

      const values = getValues()

      expect(values).toEqual(defaultValues)
    })

    it('should return value for a specific field', () => {
      const { getValues } = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John', password: 'pass1234' },
      })

      expect(getValues('email')).toBe('test@example.com')
    })

    it('should return object with specified field values', () => {
      const { getValues } = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John', password: 'pass1234' },
      })

      const values = getValues(['email', 'name'])

      expect(values).toEqual({
        email: 'test@example.com',
        name: 'John',
      })
    })

    it('should return updated values after setValue', () => {
      const { getValues, setValue } = useForm({ schema })

      setValue('email', 'new@example.com')

      expect(getValues('email')).toBe('new@example.com')
    })
  })

  describe('getFieldState', () => {
    it('should return clean state for untouched field', () => {
      const { getFieldState } = useForm({ schema })

      const state = getFieldState('email')

      expect(state).toEqual({
        isDirty: false,
        isTouched: false,
        invalid: false,
        error: undefined,
      })
    })

    it('should return isDirty: true after setValue', () => {
      const { getFieldState, setValue } = useForm({ schema })

      setValue('email', 'test@example.com')

      expect(getFieldState('email').isDirty).toBe(true)
    })

    it('should track dirty state independently per field', () => {
      const { getFieldState, setValue } = useForm({ schema })

      setValue('email', 'test@example.com')

      expect(getFieldState('email').isDirty).toBe(true)
      expect(getFieldState('password').isDirty).toBe(false)
    })

    it('should return invalid: true and error message when field has error', async () => {
      const { getFieldState, validate } = useForm({ schema })

      await validate()

      const state = getFieldState('email')
      expect(state.invalid).toBe(true)
      expect(state.error).toBeDefined()
      expect(typeof state.error).toBe('string')
    })

    it('should update after setError', () => {
      const { getFieldState, setError } = useForm({ schema })

      setError('email', { message: 'Custom error' })

      const state = getFieldState('email')
      expect(state.invalid).toBe(true)
      expect(state.error).toBe('Custom error')
    })

    it('should update after clearErrors', async () => {
      const { getFieldState, validate, clearErrors } = useForm({ schema })

      await validate()
      expect(getFieldState('email').invalid).toBe(true)

      clearErrors('email')

      expect(getFieldState('email').invalid).toBe(false)
      expect(getFieldState('email').error).toBeUndefined()
    })
  })

  describe('trigger', () => {
    it('should validate entire form and return true when valid', async () => {
      const { trigger } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const isValid = await trigger()

      expect(isValid).toBe(true)
    })

    it('should validate entire form and return false when invalid', async () => {
      const { trigger } = useForm({ schema })

      const isValid = await trigger()

      expect(isValid).toBe(false)
    })

    it('should validate only the specified field', async () => {
      const { trigger, formState, setValue } = useForm({ schema })

      setValue('email', 'invalid-email')

      const isValid = await trigger('email')

      expect(isValid).toBe(false)
      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.password).toBeUndefined()
    })

    it('should return true when single field is valid', async () => {
      const { trigger, setValue } = useForm({ schema })

      setValue('email', 'valid@example.com')

      const isValid = await trigger('email')

      expect(isValid).toBe(true)
    })

    it('should validate multiple specified fields', async () => {
      const { trigger, formState, setValue } = useForm({ schema })

      setValue('email', 'invalid')
      setValue('password', 'short')

      const isValid = await trigger(['email', 'password'])

      expect(isValid).toBe(false)
      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.password).toBeDefined()
    })

    it('should not affect submitCount', async () => {
      const { trigger, formState } = useForm({ schema })

      expect(formState.value.submitCount).toBe(0)

      await trigger()
      await trigger('email')
      await trigger(['email', 'password'])

      expect(formState.value.submitCount).toBe(0)
    })
  })

  describe('setFocus', () => {
    let mockInput: HTMLInputElement
    let focusSpy: ReturnType<typeof vi.spyOn>
    let selectSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      mockInput = document.createElement('input')
      mockInput.type = 'text'
      document.body.appendChild(mockInput)

      // Use vi.spyOn() to properly intercept prototype methods
      // This works consistently across JS engines (V8, JavaScriptCore)
      focusSpy = vi.spyOn(mockInput, 'focus')
      selectSpy = vi.spyOn(mockInput, 'select')
    })

    afterEach(() => {
      document.body.removeChild(mockInput)
      vi.restoreAllMocks()
    })

    it('should focus the specified field', () => {
      const { register, setFocus } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      setFocus('email')

      expect(focusSpy).toHaveBeenCalled()
    })

    it('should not throw when field ref is null', () => {
      const { setFocus } = useForm({ schema })

      expect(() => setFocus('email')).not.toThrow()
    })

    it('should select text when shouldSelect is true', () => {
      const { register, setFocus } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      setFocus('email', { shouldSelect: true })

      expect(focusSpy).toHaveBeenCalled()
      expect(selectSpy).toHaveBeenCalled()
    })

    it('should not select text when shouldSelect is false', () => {
      const { register, setFocus } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      setFocus('email', { shouldSelect: false })

      expect(focusSpy).toHaveBeenCalled()
      expect(selectSpy).not.toHaveBeenCalled()
    })
  })

  describe('nested fields', () => {
    const nestedSchema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string().min(2),
          email: z.string().email(),
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

  describe('integration', () => {
    it('should handle setError + clearErrors + getFieldState workflow', async () => {
      const { setError, clearErrors, getFieldState, formState } = useForm({ schema })

      expect(getFieldState('email').invalid).toBe(false)

      setError('email', { type: 'server', message: 'Email taken' })

      expect(getFieldState('email').invalid).toBe(true)
      // With type provided, error is structured as { type, message }
      expect(getFieldState('email').error).toEqual({ type: 'server', message: 'Email taken' })
      expect(formState.value.isValid).toBe(false)

      clearErrors('email')

      expect(getFieldState('email').invalid).toBe(false)
    })

    it('should handle complete form workflow with new features', async () => {
      const {
        setValue,
        getValues,
        getFieldState,
        trigger,
        setError,
        clearErrors,
        formState,
        reset,
      } = useForm({ schema })

      // 1. User enters invalid data
      setValue('email', 'invalid')
      setValue('password', 'short')

      // 2. Trigger validation
      let isValid = await trigger()
      expect(isValid).toBe(false)

      // 3. Check field states
      expect(getFieldState('email').isDirty).toBe(true)
      expect(getFieldState('email').invalid).toBe(true)

      // 4. Fix email, add server error
      setValue('email', 'test@example.com')
      await trigger('email')
      setError('email', { message: 'Email already taken' })

      expect(getFieldState('email').error).toBe('Email already taken')

      // 5. Clear server error and validate again
      clearErrors('email')
      setValue('password', 'validpassword123')
      setValue('name', 'John')

      isValid = await trigger()
      expect(isValid).toBe(true)

      // 6. Get all values
      const values = getValues()
      expect(values).toEqual({
        email: 'test@example.com',
        password: 'validpassword123',
        name: 'John',
      })

      // 7. Reset form
      reset()
      expect(formState.value.isDirty).toBe(false)
      expect(formState.value.dirtyFields).toEqual({})
      expect(getFieldState('email').isDirty).toBe(false)
    })
  })
})
