import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { useForm } from '../../useForm'
import { createMockInput, createInputEvent } from '../helpers/test-utils'

describe('Validation Performance', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should handle rapid typing in onChange mode efficiently', async () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
    })

    const { register } = useForm({
      schema,
      mode: 'onChange',
      defaultValues: { email: '', password: '', name: '' },
    })

    const emailField = register('email')
    const mockInput = createMockInput()
    emailField.ref(mockInput)

    const start = performance.now()
    const iterations = 100

    // Simulate rapid typing
    for (let i = 0; i < iterations; i++) {
      mockInput.value = `test${i}@example.com`
      await emailField.onInput(createInputEvent(mockInput))
      await vi.runAllTimersAsync()
    }

    const duration = performance.now() - start
    const avgPerKeystroke = duration / iterations

    // Log performance metrics
    console.log(`Rapid typing benchmark:`)
    console.log(`  Total: ${duration.toFixed(2)}ms for ${iterations} keystrokes`)
    console.log(`  Average: ${avgPerKeystroke.toFixed(3)}ms per keystroke`)

    // Performance assertion - should be under 5ms per keystroke
    expect(avgPerKeystroke).toBeLessThan(5)
  })

  it('should benefit from validation caching', async () => {
    // Create a fresh schema for this test
    const testSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
    })

    // Track calls via a wrapper
    let schemaParseCount = 0
    const originalSafeParseAsync = testSchema.safeParseAsync
    testSchema.safeParseAsync = async function (
      ...args: Parameters<typeof originalSafeParseAsync>
    ) {
      schemaParseCount++
      return originalSafeParseAsync.apply(this, args)
    }

    const { trigger } = useForm({
      schema: testSchema,
      defaultValues: { email: 'test@example.com', password: 'password123', name: 'John' },
    })

    // First validation (cache miss - should call schema parse)
    await trigger('email')
    await vi.runAllTimersAsync()
    const countAfterFirst = schemaParseCount

    // Subsequent validations of same field with same value (cache hits)
    const iterations = 10
    for (let i = 0; i < iterations; i++) {
      await trigger('email')
      await vi.runAllTimersAsync()
    }
    const countAfterCached = schemaParseCount

    // Calculate cache efficiency
    const additionalParsesFromCached = countAfterCached - countAfterFirst

    console.log(`Validation caching benchmark:`)
    console.log(`  First validation parse count: ${countAfterFirst}`)
    console.log(`  After ${iterations} cached validations: ${countAfterCached}`)
    console.log(`  Additional parses (should be 0 for cached): ${additionalParsesFromCached}`)

    // With caching, repeated same-value validations should NOT call schema parse
    expect(additionalParsesFromCached).toBe(0)
  })

  it('should handle large form validation efficiently', async () => {
    // Create a schema with 50 fields
    const largeSchema = z.object(
      Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`field${i}`, z.string().min(1)])),
    )

    const defaultValues = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`field${i}`, '']),
    )

    const { register, trigger } = useForm({
      schema: largeSchema,
      defaultValues,
    })

    // Register all fields
    const fields = Array.from({ length: 50 }, (_, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const field = register(`field${i}` as any)
      const input = createMockInput()
      field.ref(input)
      input.value = `value${i}`
      return { field, input }
    })

    // Trigger input on all fields
    for (const { field, input } of fields) {
      await field.onInput(createInputEvent(input))
    }

    const start = performance.now()
    await trigger()
    await vi.runAllTimersAsync()
    const duration = performance.now() - start

    console.log(`Large form validation benchmark (50 fields):`)
    console.log(`  Full form validation: ${duration.toFixed(2)}ms`)

    // Should complete full form validation in reasonable time
    expect(duration).toBeLessThan(100)
  })

  it('should handle single-field validation efficiently in large forms', async () => {
    // Create a schema with 50 fields
    const largeSchema = z.object(
      Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`field${i}`, z.string().min(1)])),
    )

    const defaultValues = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`field${i}`, `value${i}`]),
    )

    const { trigger } = useForm({
      schema: largeSchema,
      defaultValues,
    })

    const iterations = 20
    const start = performance.now()

    // Validate single field multiple times
    for (let i = 0; i < iterations; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await trigger('field0' as any)
      await vi.runAllTimersAsync()
    }

    const duration = performance.now() - start
    const avgPerValidation = duration / iterations

    console.log(`Single-field validation in large form:`)
    console.log(`  Total: ${duration.toFixed(2)}ms for ${iterations} validations`)
    console.log(`  Average: ${avgPerValidation.toFixed(3)}ms per validation`)

    // Single field validation should be fast
    expect(avgPerValidation).toBeLessThan(10)
  })

  it('should efficiently handle validation with debounce option', async () => {
    // Create a fresh schema for this test
    const testSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
    })

    // Track calls via a wrapper
    let validationCount = 0
    const originalSafeParseAsync = testSchema.safeParseAsync
    testSchema.safeParseAsync = async function (
      ...args: Parameters<typeof originalSafeParseAsync>
    ) {
      validationCount++
      return originalSafeParseAsync.apply(this, args)
    }

    const { register } = useForm({
      schema: testSchema,
      mode: 'onChange',
      validationDebounce: 100,
      defaultValues: { email: '', password: '', name: '' },
    })

    const emailField = register('email')
    const mockInput = createMockInput()
    emailField.ref(mockInput)

    // Rapid typing - 10 keystrokes in quick succession
    for (let i = 0; i < 10; i++) {
      mockInput.value = `test${i}@example.com`
      await emailField.onInput(createInputEvent(mockInput))
      await vi.advanceTimersByTimeAsync(20) // 20ms between keystrokes
    }

    // Wait for debounce to complete
    await vi.advanceTimersByTimeAsync(200)
    await vi.runAllTimersAsync()

    console.log(`Validation debounce benchmark:`)
    console.log(`  Keystrokes: 10`)
    console.log(`  Validation calls: ${validationCount}`)

    // With 100ms debounce and 20ms between keystrokes, we should have fewer validations
    // The exact number depends on timing, but should be much less than 10
    expect(validationCount).toBeLessThan(5)
  })
})
