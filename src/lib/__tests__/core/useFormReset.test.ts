import { describe, it, expect, vi } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

describe('useForm - reset', () => {
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
