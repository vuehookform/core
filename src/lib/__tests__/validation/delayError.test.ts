import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { useForm } from '../../useForm'

describe('delayError', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should delay error display when delayError is set', async () => {
    const schema = z.object({
      email: z.string().email('Invalid email'),
    })
    const { formState, setValue, validate } = useForm({
      schema,
      delayError: 200,
    })

    setValue('email', 'invalid')
    await validate('email')

    // Error should not be visible yet
    expect(formState.value.errors.email).toBeUndefined()

    // Advance time but not enough
    vi.advanceTimersByTime(100)
    expect(formState.value.errors.email).toBeUndefined()

    // Advance past delay
    vi.advanceTimersByTime(150)
    expect(formState.value.errors.email).toBeDefined()
  })

  it('should cancel error if field becomes valid before delay', async () => {
    const schema = z.object({
      email: z.string().email('Invalid email'),
    })
    const { formState, setValue, validate } = useForm({
      schema,
      delayError: 200,
    })

    // Set invalid value
    setValue('email', 'invalid')
    await validate('email')

    // Error should not be visible yet
    expect(formState.value.errors.email).toBeUndefined()

    // Fix the error before delay completes
    setValue('email', 'valid@example.com')
    await validate('email')

    // Advance past original delay
    vi.advanceTimersByTime(300)

    // Error should never appear because field became valid
    expect(formState.value.errors.email).toBeUndefined()
  })

  it('should clear pending errors on form reset', async () => {
    const schema = z.object({
      email: z.string().email('Invalid email'),
    })
    const { formState, setValue, validate, reset } = useForm({
      schema,
      delayError: 200,
    })

    setValue('email', 'invalid')
    await validate('email')

    // Reset before delay completes
    reset()

    // Advance past delay
    vi.advanceTimersByTime(300)

    // Error should not appear
    expect(formState.value.errors.email).toBeUndefined()
  })

  it('should set error immediately when delayError is 0', async () => {
    const schema = z.object({
      email: z.string().email('Invalid email'),
    })
    const { formState, setValue, validate } = useForm({
      schema,
      delayError: 0,
    })

    setValue('email', 'invalid')
    await validate('email')

    // Error should be visible immediately
    expect(formState.value.errors.email).toBeDefined()
  })
})
