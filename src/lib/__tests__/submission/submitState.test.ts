import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../../useForm'
import {
  createMockInput,
  mountElement,
  createSubmitEvent,
  schemas,
} from '../helpers/test-utils'

/**
 * Submit State Tests
 *
 * Tests for form submission state tracking:
 * - shouldFocusError: Auto-focus first error field on validation failure
 * - isSubmitted: Track whether form has been submitted
 * - isSubmitSuccessful: Track whether submission was successful
 */

describe('Submit State', () => {
  let mockInput: HTMLInputElement
  let cleanup: () => void

  beforeEach(() => {
    mockInput = createMockInput()
    cleanup = mountElement(mockInput)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // ============================================
  // shouldFocusError Tests
  // ============================================
  describe('shouldFocusError', () => {
    it('should focus first error field on submit fail by default', async () => {
      const { register, handleSubmit } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      const focusSpy = vi.spyOn(mockInput, 'focus')
      const onValid = vi.fn()

      await handleSubmit(onValid)(createSubmitEvent())

      expect(focusSpy).toHaveBeenCalled()
      expect(onValid).not.toHaveBeenCalled()
    })

    it('should focus first error when shouldFocusError: true', async () => {
      const { register, handleSubmit } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
        shouldFocusError: true,
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      const focusSpy = vi.spyOn(mockInput, 'focus')
      const onValid = vi.fn()

      await handleSubmit(onValid)(createSubmitEvent())

      expect(focusSpy).toHaveBeenCalled()
    })

    it('should not focus when shouldFocusError: false', async () => {
      const { register, handleSubmit } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
        shouldFocusError: false,
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      const focusSpy = vi.spyOn(mockInput, 'focus')
      const onValid = vi.fn()

      await handleSubmit(onValid)(createSubmitEvent())

      expect(focusSpy).not.toHaveBeenCalled()
    })

    it('should focus first error in error object order', async () => {
      const { register, handleSubmit } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      // Create multiple inputs
      const emailInput = createMockInput()
      const passwordInput = createMockInput()
      const nameInput = createMockInput()
      const cleanupEmail = mountElement(emailInput)
      const cleanupPassword = mountElement(passwordInput)
      const cleanupName = mountElement(nameInput)

      register('email').ref(emailInput)
      register('password').ref(passwordInput)
      register('name').ref(nameInput)

      const emailFocusSpy = vi.spyOn(emailInput, 'focus')
      const passwordFocusSpy = vi.spyOn(passwordInput, 'focus')
      const nameFocusSpy = vi.spyOn(nameInput, 'focus')

      await handleSubmit(vi.fn())(createSubmitEvent())

      // Email should be focused (first in error object)
      expect(emailFocusSpy).toHaveBeenCalled()
      // Others should not
      expect(passwordFocusSpy).not.toHaveBeenCalled()
      expect(nameFocusSpy).not.toHaveBeenCalled()

      cleanupEmail()
      cleanupPassword()
      cleanupName()
    })

    it('should not call focus when validation passes', async () => {
      const { register, handleSubmit, setValue } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Set valid values
      setValue('email', 'valid@test.com')
      setValue('password', 'password123')
      setValue('name', 'John Doe')

      const focusSpy = vi.spyOn(mockInput, 'focus')
      const onValid = vi.fn()

      await handleSubmit(onValid)(createSubmitEvent())

      expect(focusSpy).not.toHaveBeenCalled()
      expect(onValid).toHaveBeenCalled()
    })
  })

  // ============================================
  // isSubmitted Tests
  // ============================================
  describe('isSubmitted', () => {
    it('should be false initially', () => {
      const { formState } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      expect(formState.value.isSubmitted).toBe(false)
    })

    it('should be true after submit with validation errors', async () => {
      const { handleSubmit, formState } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      await handleSubmit(vi.fn())(createSubmitEvent())

      expect(formState.value.isSubmitted).toBe(true)
    })

    it('should be true after successful submit', async () => {
      const { handleSubmit, formState, setValue } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'valid@test.com')
      setValue('password', 'password123')
      setValue('name', 'John Doe')

      await handleSubmit(vi.fn())(createSubmitEvent())

      expect(formState.value.isSubmitted).toBe(true)
    })

    it('should be false after reset()', async () => {
      const { handleSubmit, formState, reset } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      await handleSubmit(vi.fn())(createSubmitEvent())
      expect(formState.value.isSubmitted).toBe(true)

      reset()
      expect(formState.value.isSubmitted).toBe(false)
    })

    it('should remain true when reset with keepSubmitCount: true', async () => {
      const { handleSubmit, formState, reset } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      await handleSubmit(vi.fn())(createSubmitEvent())
      expect(formState.value.isSubmitted).toBe(true)

      reset(undefined, { keepSubmitCount: true })
      expect(formState.value.isSubmitted).toBe(true)
    })
  })

  // ============================================
  // isSubmitSuccessful Tests
  // ============================================
  describe('isSubmitSuccessful', () => {
    it('should be false initially', () => {
      const { formState } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      expect(formState.value.isSubmitSuccessful).toBe(false)
    })

    it('should be true after successful submit', async () => {
      const { handleSubmit, formState, setValue } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'valid@test.com')
      setValue('password', 'password123')
      setValue('name', 'John Doe')

      await handleSubmit(vi.fn())(createSubmitEvent())

      expect(formState.value.isSubmitSuccessful).toBe(true)
    })

    it('should remain false when validation fails', async () => {
      const { handleSubmit, formState } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      await handleSubmit(vi.fn())(createSubmitEvent())

      expect(formState.value.isSubmitSuccessful).toBe(false)
    })

    it('should remain false when onValid throws', async () => {
      const { handleSubmit, formState, setValue } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'valid@test.com')
      setValue('password', 'password123')
      setValue('name', 'John Doe')

      const onValid = vi.fn(() => {
        throw new Error('Submit error')
      })

      // Error propagates from handleSubmit, catch it
      try {
        await handleSubmit(onValid)(createSubmitEvent())
      } catch {
        // Expected to throw
      }

      // isSubmitSuccessful should remain false because onValid threw
      expect(formState.value.isSubmitSuccessful).toBe(false)
    })

    it('should remain false when onValid returns rejected promise', async () => {
      const { handleSubmit, formState, setValue } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'valid@test.com')
      setValue('password', 'password123')
      setValue('name', 'John Doe')

      const onValid = vi.fn().mockRejectedValue(new Error('Async error'))

      // Error propagates from handleSubmit, catch it
      try {
        await handleSubmit(onValid)(createSubmitEvent())
      } catch {
        // Expected to throw
      }

      // isSubmitSuccessful should remain false because onValid rejected
      expect(formState.value.isSubmitSuccessful).toBe(false)
    })

    it('should reset to false at start of each submission', async () => {
      const { handleSubmit, formState, setValue } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'valid@test.com')
      setValue('password', 'password123')
      setValue('name', 'John Doe')

      // First successful submit
      await handleSubmit(vi.fn())(createSubmitEvent())
      expect(formState.value.isSubmitSuccessful).toBe(true)

      // Modify to invalid state for second submit
      setValue('email', 'invalid')

      // Track state during second submit
      let wasResetDuringSubmit = false
      const trackingHandler = async () => {
        // This runs during successful validation
        wasResetDuringSubmit = true
      }

      // Second submit (will fail validation)
      await handleSubmit(trackingHandler)(createSubmitEvent())

      // Should be false because validation failed
      expect(formState.value.isSubmitSuccessful).toBe(false)
    })

    it('should be false after reset()', async () => {
      const { handleSubmit, formState, setValue, reset } = useForm({
        schema: schemas.basic,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'valid@test.com')
      setValue('password', 'password123')
      setValue('name', 'John Doe')

      await handleSubmit(vi.fn())(createSubmitEvent())
      expect(formState.value.isSubmitSuccessful).toBe(true)

      reset()
      expect(formState.value.isSubmitSuccessful).toBe(false)
    })
  })
})
