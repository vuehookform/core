import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

describe('shouldUseNativeValidation', () => {
  let emailInput: HTMLInputElement
  let nameInput: HTMLInputElement

  beforeEach(() => {
    emailInput = document.createElement('input')
    emailInput.type = 'email'
    nameInput = document.createElement('input')
    nameInput.type = 'text'
    document.body.appendChild(emailInput)
    document.body.appendChild(nameInput)
  })

  afterEach(() => {
    document.body.removeChild(emailInput)
    document.body.removeChild(nameInput)
    vi.restoreAllMocks()
  })

  describe('when enabled', () => {
    it('should call setCustomValidity with error message on validation failure', async () => {
      const setCustomValiditySpy = vi.spyOn(emailInput, 'setCustomValidity')

      const { register, handleSubmit } = useForm({
        schema,
        shouldUseNativeValidation: true,
        defaultValues: {
          email: 'invalid',
          name: 'John',
        },
      })

      // Register the field and attach to mock input
      const emailProps = register('email')
      emailProps.ref(emailInput)

      // Trigger validation via submit
      await handleSubmit(vi.fn())(new Event('submit'))

      expect(setCustomValiditySpy).toHaveBeenCalledWith('Invalid email')
    })

    it('should clear custom validity when field becomes valid', async () => {
      const setCustomValiditySpy = vi.spyOn(emailInput, 'setCustomValidity')

      const { register, handleSubmit, setValue } = useForm({
        schema,
        shouldUseNativeValidation: true,
        defaultValues: {
          email: 'invalid',
          name: 'John',
        },
      })

      // Register the field
      const emailProps = register('email')
      emailProps.ref(emailInput)

      // First submit - should set error
      await handleSubmit(vi.fn())(new Event('submit'))
      expect(setCustomValiditySpy).toHaveBeenCalledWith('Invalid email')

      // Fix the value
      setValue('email', 'valid@example.com')

      // Second submit - should clear error
      await handleSubmit(vi.fn())(new Event('submit'))
      expect(setCustomValiditySpy).toHaveBeenLastCalledWith('')
    })

    it('should set native validation on multiple fields', async () => {
      const emailSetCustomValiditySpy = vi.spyOn(emailInput, 'setCustomValidity')
      const nameSetCustomValiditySpy = vi.spyOn(nameInput, 'setCustomValidity')

      const { register, handleSubmit } = useForm({
        schema,
        shouldUseNativeValidation: true,
        defaultValues: {
          email: 'invalid',
          name: 'J', // Too short
        },
      })

      // Register both fields
      register('email').ref(emailInput)
      register('name').ref(nameInput)

      // Submit
      await handleSubmit(vi.fn())(new Event('submit'))

      expect(emailSetCustomValiditySpy).toHaveBeenCalledWith('Invalid email')
      expect(nameSetCustomValiditySpy).toHaveBeenCalledWith('Name must be at least 2 characters')
    })

    it('should clear all native validation when form becomes valid', async () => {
      const emailSetCustomValiditySpy = vi.spyOn(emailInput, 'setCustomValidity')
      const nameSetCustomValiditySpy = vi.spyOn(nameInput, 'setCustomValidity')

      const { register, handleSubmit } = useForm({
        schema,
        shouldUseNativeValidation: true,
        defaultValues: {
          email: 'valid@example.com',
          name: 'John',
        },
      })

      // Register both fields
      register('email').ref(emailInput)
      register('name').ref(nameInput)

      // Submit with valid data
      await handleSubmit(vi.fn())(new Event('submit'))

      // Both should be cleared
      expect(emailSetCustomValiditySpy).toHaveBeenLastCalledWith('')
      expect(nameSetCustomValiditySpy).toHaveBeenLastCalledWith('')
    })
  })

  describe('when disabled (default)', () => {
    it('should not call setCustomValidity when shouldUseNativeValidation is false', async () => {
      const setCustomValiditySpy = vi.spyOn(emailInput, 'setCustomValidity')

      const { register, handleSubmit } = useForm({
        schema,
        shouldUseNativeValidation: false,
        defaultValues: {
          email: 'invalid',
          name: 'John',
        },
      })

      // Register the field
      register('email').ref(emailInput)

      // Submit
      await handleSubmit(vi.fn())(new Event('submit'))

      expect(setCustomValiditySpy).not.toHaveBeenCalled()
    })

    it('should not call setCustomValidity when option is not provided', async () => {
      const setCustomValiditySpy = vi.spyOn(emailInput, 'setCustomValidity')

      const { register, handleSubmit } = useForm({
        schema,
        defaultValues: {
          email: 'invalid',
          name: 'John',
        },
      })

      // Register the field
      register('email').ref(emailInput)

      // Submit
      await handleSubmit(vi.fn())(new Event('submit'))

      expect(setCustomValiditySpy).not.toHaveBeenCalled()
    })
  })

  describe('with field-level validation (onChange mode)', () => {
    it('should apply native validation on field change', async () => {
      const setCustomValiditySpy = vi.spyOn(emailInput, 'setCustomValidity')

      const { register } = useForm({
        schema,
        mode: 'onChange',
        shouldUseNativeValidation: true,
        defaultValues: {
          email: '',
          name: 'John',
        },
      })

      // Register the field
      const emailProps = register('email')
      emailProps.ref(emailInput)

      // Simulate input
      emailInput.value = 'invalid'
      await emailProps.onInput({ target: emailInput } as unknown as Event)

      // Should have called setCustomValidity with error
      expect(setCustomValiditySpy).toHaveBeenCalledWith('Invalid email')
    })

    it('should clear native validation when field becomes valid on change', async () => {
      const setCustomValiditySpy = vi.spyOn(emailInput, 'setCustomValidity')

      const { register } = useForm({
        schema,
        mode: 'onChange',
        shouldUseNativeValidation: true,
        defaultValues: {
          email: 'invalid',
          name: 'John',
        },
      })

      // Register the field
      const emailProps = register('email')
      emailProps.ref(emailInput)

      // Simulate input with valid value
      emailInput.value = 'valid@example.com'
      await emailProps.onInput({ target: emailInput } as unknown as Event)

      // Should have cleared the custom validity
      expect(setCustomValiditySpy).toHaveBeenCalledWith('')
    })
  })
})
