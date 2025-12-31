import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { useForm } from '../../useForm'
import { createMockInput, createInputEvent } from '../helpers/test-utils'

describe('FormState Access Performance', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const basicSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2),
  })

  it('should access formState efficiently under rapid reads', () => {
    const { formState } = useForm({
      schema: basicSchema,
      defaultValues: { email: 'test@example.com', password: 'password123', name: 'John' },
    })

    const iterations = 10000
    const start = performance.now()

    // Rapid formState access
    for (let i = 0; i < iterations; i++) {
      const _ = formState.value.isDirty
      const __ = formState.value.isValid
      const ___ = formState.value.errors
      const ____ = formState.value.touchedFields
      const _____ = formState.value.dirtyFields
    }

    const duration = performance.now() - start
    const avgPerRead = (duration / iterations) * 1000 // Convert to microseconds

    console.log(`FormState read benchmark:`)
    console.log(`  Total: ${duration.toFixed(2)}ms for ${iterations} reads (5 properties each)`)
    console.log(`  Average: ${avgPerRead.toFixed(3)}μs per read cycle`)

    // Should be extremely fast (under 100ms for 10000 reads)
    expect(duration).toBeLessThan(100)
  })

  it('should have O(1) isDirty computation with counter optimization', async () => {
    // Mark many fields as dirty by setting values
    const fieldCount = 50

    // Create a larger schema for this test
    const largeSchema = z.object(
      Object.fromEntries(Array.from({ length: fieldCount }, (_, i) => [`field${i}`, z.string()])),
    )

    const { formState: largeFormState, setValue: largeSetValue } = useForm({
      schema: largeSchema,
      defaultValues: Object.fromEntries(
        Array.from({ length: fieldCount }, (_, i) => [`field${i}`, '']),
      ),
    })

    // Mark all fields dirty
    for (let i = 0; i < fieldCount; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      largeSetValue(`field${i}` as any, `dirty${i}`)
    }

    // Measure isDirty access time
    const iterations = 1000
    const start = performance.now()

    for (let i = 0; i < iterations; i++) {
      const _ = largeFormState.value.isDirty
    }

    const duration = performance.now() - start
    const avgPerAccess = duration / iterations

    console.log(`isDirty O(1) benchmark (${fieldCount} dirty fields):`)
    console.log(`  Total: ${duration.toFixed(2)}ms for ${iterations} isDirty checks`)
    console.log(`  Average: ${avgPerAccess.toFixed(4)}ms per check`)

    // O(1) counter-based check should be very fast
    expect(avgPerAccess).toBeLessThan(0.1) // Under 0.1ms per check
  })

  it('should efficiently handle getMergedErrors memoization', async () => {
    const { formState, trigger } = useForm({
      schema: basicSchema,
      defaultValues: { email: 'invalid', password: 'short', name: '' },
    })

    // Trigger validation to populate errors
    await trigger()
    await vi.runAllTimersAsync()

    // Multiple accesses to errors should return memoized result
    const iterations = 1000
    const start = performance.now()
    let lastErrors = null

    for (let i = 0; i < iterations; i++) {
      const errors = formState.value.errors
      if (lastErrors !== null) {
        // With memoization, the same object reference should be returned
        // when errors haven't changed
        expect(errors).toBe(lastErrors)
      }
      lastErrors = errors
    }

    const duration = performance.now() - start
    const avgPerAccess = duration / iterations

    console.log(`getMergedErrors memoization benchmark:`)
    console.log(`  Total: ${duration.toFixed(2)}ms for ${iterations} error accesses`)
    console.log(`  Average: ${avgPerAccess.toFixed(4)}ms per access`)

    // Memoized access should be very fast
    expect(avgPerAccess).toBeLessThan(0.1)
  })

  it('should handle formState updates efficiently during rapid input', async () => {
    const { register, formState } = useForm({
      schema: basicSchema,
      mode: 'onChange',
      defaultValues: { email: '', password: '', name: '' },
    })

    const emailField = register('email')
    const mockInput = createMockInput()
    emailField.ref(mockInput)

    const iterations = 50
    const formStateSnapshots: number[] = []

    const start = performance.now()

    for (let i = 0; i < iterations; i++) {
      mockInput.value = `test${i}@example.com`
      await emailField.onInput(createInputEvent(mockInput))
      await vi.runAllTimersAsync()

      // Access formState after each update
      const stateAccessStart = performance.now()
      const _ = formState.value.isDirty
      const __ = formState.value.errors
      const ___ = formState.value.isValid
      formStateSnapshots.push(performance.now() - stateAccessStart)
    }

    const totalDuration = performance.now() - start
    const avgStateAccess = formStateSnapshots.reduce((a, b) => a + b, 0) / formStateSnapshots.length

    console.log(`FormState during rapid updates:`)
    console.log(`  Total cycle time: ${totalDuration.toFixed(2)}ms for ${iterations} updates`)
    console.log(`  Avg state access: ${avgStateAccess.toFixed(4)}ms per access`)

    // State access should remain fast during updates
    expect(avgStateAccess).toBeLessThan(1)
  })
})
