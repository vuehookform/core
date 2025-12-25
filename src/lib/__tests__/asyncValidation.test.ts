import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../useForm'
import { z } from 'zod'
import {
  createMockInput,
  createInputEvent,
  mountElement,
} from './test-utils'

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
})

describe('async validation edge cases', () => {
  let mockInput: HTMLInputElement
  let cleanup: () => void

  beforeEach(() => {
    mockInput = createMockInput()
    cleanup = mountElement(mockInput)
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('concurrent validation requests', () => {
    it('should handle rapid sequential validation calls', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Simulate rapid typing
      const inputs = ['t', 'te', 'tes', 'test', 'test@', 'test@example.com']

      for (const value of inputs) {
        mockInput.value = value
        emailField.onInput(createInputEvent(mockInput))
      }

      // Wait for all validations to complete
      await vi.runAllTimersAsync()

      // Final state should reflect the last valid input
      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should handle overlapping async custom validators', async () => {
      let callCount = 0
      const validationOrder: number[] = []

      const slowValidator = vi.fn(async () => {
        const currentCall = ++callCount
        // Different delays to simulate race conditions
        await new Promise((resolve) =>
          setTimeout(resolve, currentCall === 1 ? 100 : 10),
        )
        validationOrder.push(currentCall)
        return undefined
      })

      const { register } = useForm({ schema })

      const usernameField = register('username', {
        validate: slowValidator,
      })
      usernameField.ref(mockInput)

      // First call (slower)
      mockInput.value = 'user1'
      usernameField.onInput(createInputEvent(mockInput))

      // Second call (faster) - should also be called
      mockInput.value = 'user2'
      usernameField.onInput(createInputEvent(mockInput))

      await vi.runAllTimersAsync()

      expect(slowValidator).toHaveBeenCalledTimes(2)
    })

    it('should handle validation during form submission', async () => {
      const { handleSubmit, setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', username: '' },
      })

      const onSubmit = vi.fn()
      const submitHandler = handleSubmit(onSubmit)

      // Set invalid value and immediately submit
      setValue('email', 'invalid')
      setValue('username', 'ab') // too short

      await submitHandler(new Event('submit'))

      expect(onSubmit).not.toHaveBeenCalled()
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })
  })

  describe('custom validator error handling', () => {
    it('should handle custom validator returning error string', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: () => 'Custom validation error',
      })
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBe('Custom validation error')
    })

    it('should handle custom validator returning undefined (valid)', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: () => undefined,
      })
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should handle async custom validator returning error', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return 'Async validation error'
        },
      })
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      emailField.onInput(createInputEvent(mockInput))

      await vi.runAllTimersAsync()

      expect(formState.value.errors.email).toBe('Async validation error')
    })

    it('should handle async custom validator returning undefined', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return undefined
        },
      })
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      emailField.onInput(createInputEvent(mockInput))

      await vi.runAllTimersAsync()

      expect(formState.value.errors.email).toBeUndefined()
    })
  })

  describe('validation timing', () => {
    it('should complete validation before form state is read', async () => {
      const delayedValidator = vi.fn(async (value: unknown) => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return (value as string).length < 5 ? 'Too short' : undefined
      })

      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: delayedValidator,
      })
      emailField.ref(mockInput)

      mockInput.value = 'ab'
      const inputPromise = emailField.onInput(createInputEvent(mockInput))

      // State might not be updated yet
      await vi.runAllTimersAsync()
      await inputPromise

      expect(formState.value.errors.email).toBe('Too short')
    })

    it('should handle multiple fields validating concurrently', async () => {
      const mockInput2 = createMockInput()
      const cleanup2 = mountElement(mockInput2)

      try {
        const { register, formState } = useForm({
          schema,
          mode: 'onChange',
        })

        const emailField = register('email')
        const usernameField = register('username')

        emailField.ref(mockInput)
        usernameField.ref(mockInput2)

        // Trigger both validations simultaneously
        mockInput.value = 'invalid'
        mockInput2.value = 'ab'

        const promise1 = emailField.onInput(createInputEvent(mockInput))
        const promise2 = usernameField.onInput(createInputEvent(mockInput2))

        await Promise.all([promise1, promise2])

        expect(formState.value.errors.email).toBeDefined()
        expect(formState.value.errors.username).toBeDefined()
      } finally {
        cleanup2()
      }
    })

    it('should handle unregister during pending validation', async () => {
      const { register, unregister } = useForm({ schema })

      const slowValidator = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return 'Error after delay'
      })

      const emailField = register('email', { validate: slowValidator })
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      emailField.onInput(createInputEvent(mockInput))

      // Unregister before validation completes (simulating unmount)
      unregister('email')

      await vi.runAllTimersAsync()

      // Validation was called
      expect(slowValidator).toHaveBeenCalled()
      // Error might or might not be set depending on implementation
      // The key is that it doesn't throw
    })
  })

  describe('Zod async schema validation', () => {
    // These tests need real timers because Zod's async parsing doesn't work well with fake timers
    it('should work with Zod async refinements', async () => {
      vi.useRealTimers() // Use real timers for this test

      const asyncSchema = z.object({
        email: z.string().email(),
        username: z.string().refine(
          async (val) => {
            // Simulate API call to check username availability
            await new Promise((resolve) => setTimeout(resolve, 10))
            return val !== 'taken'
          },
          { message: 'Username is already taken' },
        ),
      })

      const { validate, setValue, formState } = useForm({
        schema: asyncSchema,
        defaultValues: { email: 'test@example.com', username: '' },
      })

      setValue('username', 'taken')

      const isValid = await validate()

      expect(isValid).toBe(false)
      expect(formState.value.errors.username).toBe('Username is already taken')
    })

    it('should pass validation with valid async refinement', async () => {
      vi.useRealTimers() // Use real timers for this test

      const asyncSchema = z.object({
        email: z.string().email(),
        username: z.string().refine(
          async (val) => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            return val !== 'taken'
          },
          { message: 'Username is already taken' },
        ),
      })

      const { validate, setValue } = useForm({
        schema: asyncSchema,
        defaultValues: { email: 'test@example.com', username: '' },
      })

      setValue('username', 'available')
      const isValid = await validate()

      expect(isValid).toBe(true)
    })

    it('should validate schemas with transform operations', async () => {
      // Note: Transforms are applied during Zod parsing, but this library
      // passes raw form data to onSubmit (not transformed data)
      const transformSchema = z.object({
        email: z.string().email().transform((val) => val.toLowerCase()),
        code: z.string().min(4),
      })

      const { handleSubmit, setValue } = useForm({
        schema: transformSchema,
        defaultValues: { email: '', code: '' },
      })

      const onSubmit = vi.fn()
      const submitHandler = handleSubmit(onSubmit)

      setValue('email', 'TEST@EXAMPLE.COM')
      setValue('code', '1234')

      await submitHandler(new Event('submit'))

      // The library passes original form data, not Zod-transformed data
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'TEST@EXAMPLE.COM',
        code: '1234',
      })
    })
  })

  describe('debounced validation', () => {
    it('should debounce custom validation when validateDebounce is set', async () => {
      const validator = vi.fn(() => undefined)

      const { register } = useForm({ schema })

      const emailField = register('email', {
        validate: validator,
        validateDebounce: 300,
      })
      emailField.ref(mockInput)

      // Rapid typing
      mockInput.value = 'a'
      emailField.onInput(createInputEvent(mockInput))
      mockInput.value = 'ab'
      emailField.onInput(createInputEvent(mockInput))
      mockInput.value = 'abc'
      emailField.onInput(createInputEvent(mockInput))

      // Validator should not be called yet
      expect(validator).not.toHaveBeenCalled()

      // Advance time but not enough
      await vi.advanceTimersByTimeAsync(200)
      expect(validator).not.toHaveBeenCalled()

      // Advance past debounce time
      await vi.advanceTimersByTimeAsync(150)
      expect(validator).toHaveBeenCalledTimes(1)
      expect(validator).toHaveBeenCalledWith('abc')
    })

    it('should cancel previous debounce timer on new input', async () => {
      const validator = vi.fn(() => undefined)

      const { register } = useForm({ schema })

      const emailField = register('email', {
        validate: validator,
        validateDebounce: 100,
      })
      emailField.ref(mockInput)

      mockInput.value = 'first'
      emailField.onInput(createInputEvent(mockInput))

      // Wait 80ms (not enough for debounce)
      await vi.advanceTimersByTimeAsync(80)

      // New input - should reset the timer
      mockInput.value = 'second'
      emailField.onInput(createInputEvent(mockInput))

      // Wait another 80ms (160ms total, but only 80ms since last input)
      await vi.advanceTimersByTimeAsync(80)
      expect(validator).not.toHaveBeenCalled()

      // Wait past the debounce
      await vi.advanceTimersByTimeAsync(50)
      expect(validator).toHaveBeenCalledTimes(1)
      expect(validator).toHaveBeenCalledWith('second')
    })

    it('should run validation immediately when validateDebounce is 0 or not set', async () => {
      const validator = vi.fn(() => undefined)

      const { register } = useForm({ schema })

      const emailField = register('email', {
        validate: validator,
        // No validateDebounce - should run immediately
      })
      emailField.ref(mockInput)

      mockInput.value = 'test'
      await emailField.onInput(createInputEvent(mockInput))

      expect(validator).toHaveBeenCalledTimes(1)
    })

    it('should handle race conditions with debounced async validators', async () => {
      let callOrder: string[] = []

      const slowValidator = vi.fn(async (value: unknown) => {
        const val = value as string
        const delay = val === 'slow' ? 200 : 50
        await new Promise((resolve) => setTimeout(resolve, delay))
        callOrder.push(val)
        return val === 'invalid' ? 'Error' : undefined
      })

      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: slowValidator,
        validateDebounce: 100,
      })
      emailField.ref(mockInput)

      // First input - 'slow' will take 200ms to validate
      mockInput.value = 'slow'
      emailField.onInput(createInputEvent(mockInput))

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(100)

      // Start second input before first completes
      mockInput.value = 'fast'
      emailField.onInput(createInputEvent(mockInput))

      // Wait for second debounce
      await vi.advanceTimersByTimeAsync(100)

      // Run all async operations
      await vi.runAllTimersAsync()

      // Both validations should have run (debounced separately)
      expect(slowValidator).toHaveBeenCalledTimes(2)

      // Only the latest result should be applied (race condition handling)
      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should set error from debounced validation', async () => {
      const validator = vi.fn(() => 'Debounced error')

      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: validator,
        validateDebounce: 100,
      })
      emailField.ref(mockInput)

      mockInput.value = 'test'
      emailField.onInput(createInputEvent(mockInput))

      // Before debounce - no error
      expect(formState.value.errors.email).toBeUndefined()

      // After debounce - error should be set
      await vi.advanceTimersByTimeAsync(100)
      expect(formState.value.errors.email).toBe('Debounced error')
    })

    it('should clear error when debounced validation passes', async () => {
      let shouldFail = true
      const validator = vi.fn(() => (shouldFail ? 'Error' : undefined))

      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: validator,
        validateDebounce: 100,
      })
      emailField.ref(mockInput)

      // First input - fails
      mockInput.value = 'bad'
      emailField.onInput(createInputEvent(mockInput))
      await vi.advanceTimersByTimeAsync(100)
      expect(formState.value.errors.email).toBe('Error')

      // Second input - passes
      shouldFail = false
      mockInput.value = 'good'
      emailField.onInput(createInputEvent(mockInput))
      await vi.advanceTimersByTimeAsync(100)
      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should clean up debounce timer on unregister', async () => {
      const validator = vi.fn(() => 'Error')

      const { register, unregister } = useForm({ schema })

      const emailField = register('email', {
        validate: validator,
        validateDebounce: 100,
      })
      emailField.ref(mockInput)

      mockInput.value = 'test'
      emailField.onInput(createInputEvent(mockInput))

      // Unregister before debounce completes
      unregister('email')

      // Advance past debounce time
      await vi.advanceTimersByTimeAsync(150)

      // Validator should not have been called (timer was cleaned up)
      expect(validator).not.toHaveBeenCalled()
    })
  })

  describe('validation mode interactions', () => {
    it('should validate on blur in onBlur mode', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onBlur',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Input alone should not trigger validation
      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeUndefined()

      // Blur should trigger validation
      const blurEvent = new Event('blur', { bubbles: true })
      Object.defineProperty(blurEvent, 'target', {
        value: mockInput,
        writable: false,
      })
      await emailField.onBlur(blurEvent)

      expect(formState.value.errors.email).toBeDefined()
    })

    it('should validate on input in onChange mode after touched', async () => {
      const { register, formState } = useForm({
        schema,
        mode: 'onTouched',
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Input before touch should not validate
      mockInput.value = 'invalid'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeUndefined()

      // Touch the field
      const blurEvent = new Event('blur', { bubbles: true })
      Object.defineProperty(blurEvent, 'target', {
        value: mockInput,
        writable: false,
      })
      await emailField.onBlur(blurEvent)

      // Now should have error
      expect(formState.value.errors.email).toBeDefined()

      // Subsequent inputs should validate
      mockInput.value = 'still-invalid'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBeDefined()
    })
  })
})
