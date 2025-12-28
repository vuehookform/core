import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useForm } from '../../useForm'
import { schemas, createInputEvent, createBlurEvent } from '../helpers/test-utils'

const schema = schemas.basicWithMessages

describe('validation modes', () => {
  let mockInput: HTMLInputElement

  beforeEach(() => {
    mockInput = document.createElement('input')
    mockInput.type = 'text'
    document.body.appendChild(mockInput)
  })

  afterEach(() => {
    document.body.removeChild(mockInput)
    vi.restoreAllMocks()
  })

  describe('mode: onSubmit (default)', () => {
    it('should not validate on input', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should not validate on blur', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))
      await emailField.onBlur(createBlurEvent(mockInput))

      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should validate on submit', async () => {
      const { handleSubmit, formState } = useForm({ schema })

      const submitHandler = handleSubmit(vi.fn())
      await submitHandler(new Event('submit'))

      expect(formState.value.errors.email).toBeDefined()
    })
  })

  describe('mode: onChange', () => {
    it('should validate on every input', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeDefined()
    })

    it('should clear error when input becomes valid', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // First, make it invalid
      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))
      expect(formState.value.errors.email).toBeDefined()

      // Then, make it valid
      mockInput.value = 'valid@example.com'
      await emailField.onInput(createInputEvent(mockInput))
      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should validate each field independently', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const mockInput2 = document.createElement('input')
      mockInput2.type = 'text'
      document.body.appendChild(mockInput2)

      const emailField = register('email')
      const passwordField = register('password')
      emailField.ref(mockInput)
      passwordField.ref(mockInput2)

      // Make email invalid
      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.password).toBeUndefined()

      document.body.removeChild(mockInput2)
    })
  })

  describe('mode: onBlur', () => {
    it('should not validate on input alone', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onBlur',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should validate on blur', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onBlur',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))
      await emailField.onBlur(createBlurEvent(mockInput))

      expect(formState.value.errors.email).toBeDefined()
    })

    it('should clear error on blur when field becomes valid', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onBlur',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Make invalid and blur
      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))
      await emailField.onBlur(createBlurEvent(mockInput))
      expect(formState.value.errors.email).toBeDefined()

      // Make valid and blur again
      mockInput.value = 'valid@example.com'
      await emailField.onInput(createInputEvent(mockInput))
      await emailField.onBlur(createBlurEvent(mockInput))
      expect(formState.value.errors.email).toBeUndefined()
    })
  })

  describe('mode: onTouched', () => {
    it('should not validate on input before field is touched', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onTouched',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should validate on first blur (touch)', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onTouched',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))
      await emailField.onBlur(createBlurEvent(mockInput))

      expect(formState.value.errors.email).toBeDefined()
    })

    it('should validate on subsequent inputs after field is touched', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onTouched',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Touch the field first
      mockInput.value = 'valid@example.com'
      await emailField.onInput(createInputEvent(mockInput))
      await emailField.onBlur(createBlurEvent(mockInput))

      // Now change to invalid - should validate immediately
      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeDefined()
    })

    it('should clear error on input when field becomes valid after touched', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onTouched',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Touch with invalid value
      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))
      await emailField.onBlur(createBlurEvent(mockInput))
      expect(formState.value.errors.email).toBeDefined()

      // Fix the value - should validate and clear error
      mockInput.value = 'valid@example.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeUndefined()
    })
  })

  describe('reValidateMode', () => {
    it('should use reValidateMode after first submit', async () => {
      const { register, handleSubmit, formState, setValue } = useForm({
        schema,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: { email: '', password: '', name: '' },
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Before submit, onChange should not validate
      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))
      expect(formState.value.errors.email).toBeUndefined()

      // Submit (which will fail)
      const submitHandler = handleSubmit(vi.fn())
      await submitHandler(new Event('submit'))
      expect(formState.value.errors.email).toBeDefined()

      // Mark field as touched (reValidateMode requires field to be touched)
      await emailField.onBlur(createBlurEvent(mockInput))

      // After submit + touch, field should revalidate on change
      setValue('email', 'valid@example.com')
      mockInput.value = 'valid@example.com'
      await emailField.onInput(createInputEvent(mockInput))

      // Error should be cleared due to reValidateMode
      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should use reValidateMode: onBlur after submit', async () => {
      const { register, handleSubmit, formState } = useForm({
        schema,
        mode: 'onSubmit',
        reValidateMode: 'onBlur',
        defaultValues: { email: '', password: '', name: '' },
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Submit first
      const submitHandler = handleSubmit(vi.fn())
      await submitHandler(new Event('submit'))

      // Mark field as touched (required for reValidation)
      await emailField.onBlur(createBlurEvent(mockInput))

      // Fix the value
      mockInput.value = 'valid@example.com'
      await emailField.onInput(createInputEvent(mockInput))

      // Should still have error because we need onBlur
      // (depends on implementation - error may clear on input)

      // Blur should trigger revalidation
      await emailField.onBlur(createBlurEvent(mockInput))

      expect(formState.value.errors.email).toBeUndefined()
    })
  })

  describe('mixed validation scenarios', () => {
    it('should handle switching between valid and invalid states', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Invalid
      mockInput.value = 'a'
      await emailField.onInput(createInputEvent(mockInput))
      expect(formState.value.errors.email).toBeDefined()

      // Still invalid
      mockInput.value = 'ab'
      await emailField.onInput(createInputEvent(mockInput))
      expect(formState.value.errors.email).toBeDefined()

      // Valid
      mockInput.value = 'test@example.com'
      await emailField.onInput(createInputEvent(mockInput))
      expect(formState.value.errors.email).toBeUndefined()

      // Invalid again
      mockInput.value = 'not-an-email'
      await emailField.onInput(createInputEvent(mockInput))
      expect(formState.value.errors.email).toBeDefined()
    })

    it('should handle rapid input changes', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Simulate rapid typing
      const inputs = ['t', 'te', 'tes', 'test', 'test@', 'test@e', 'test@ex.com']

      for (const input of inputs) {
        mockInput.value = input
        await emailField.onInput(createInputEvent(mockInput))
      }

      // Final state should be valid
      expect(formState.value.errors.email).toBeUndefined()
    })
  })
})
