import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { useForm } from '../../useForm'

describe('Field Array Performance', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const arraySchema = z.object({
    items: z.array(
      z.object({
        name: z.string().min(1),
        value: z.number(),
      }),
    ),
  })

  it('should handle large arrays efficiently - append operations', () => {
    const { fields } = useForm({
      schema: arraySchema,
      defaultValues: { items: [] },
    })

    const items = fields('items')
    const iterations = 100

    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      items.append({ name: `Item ${i}`, value: i })
    }
    const duration = performance.now() - start
    const avgPerAppend = duration / iterations

    console.log(`Field array append benchmark (${iterations} items):`)
    console.log(`  Total: ${duration.toFixed(2)}ms`)
    console.log(`  Average: ${avgPerAppend.toFixed(3)}ms per append`)

    // Get fresh reference to check items (standard pattern for field arrays)
    const freshItems = fields('items')
    expect(freshItems.value.length).toBe(iterations)
    expect(avgPerAppend).toBeLessThan(5) // Under 5ms per append
  })

  it('should handle remove operations efficiently', () => {
    const { fields } = useForm({
      schema: arraySchema,
      defaultValues: {
        items: Array.from({ length: 100 }, (_, i) => ({ name: `Item ${i}`, value: i })),
      },
    })

    const items = fields('items')
    expect(items.value.length).toBe(100)

    const removeCount = 50
    const start = performance.now()

    // Remove from middle (stress test) - get fresh reference each time for current length
    for (let i = 0; i < removeCount; i++) {
      const currentItems = fields('items')
      items.remove(Math.floor(currentItems.value.length / 2))
    }

    const duration = performance.now() - start
    const avgPerRemove = duration / removeCount

    console.log(`Field array remove benchmark (${removeCount} removes from middle):`)
    console.log(`  Total: ${duration.toFixed(2)}ms`)
    console.log(`  Average: ${avgPerRemove.toFixed(3)}ms per remove`)

    // Get fresh reference for final assertion
    const freshItems = fields('items')
    expect(freshItems.value.length).toBe(100 - removeCount)
    expect(avgPerRemove).toBeLessThan(5)
  })

  it('should handle swap operations in O(1)', () => {
    const { fields } = useForm({
      schema: arraySchema,
      defaultValues: {
        items: Array.from({ length: 100 }, (_, i) => ({ name: `Item ${i}`, value: i })),
      },
    })

    const items = fields('items')
    const initialLength = items.value.length
    const iterations = 100

    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      items.swap(0, initialLength - 1)
    }
    const duration = performance.now() - start
    const avgPerSwap = duration / iterations

    console.log(`Field array swap benchmark (${iterations} swaps):`)
    console.log(`  Total: ${duration.toFixed(2)}ms`)
    console.log(`  Average: ${avgPerSwap.toFixed(4)}ms per swap`)

    // Swap should be O(1) - very fast
    expect(avgPerSwap).toBeLessThan(1)
  })

  it('should handle move operations', () => {
    const { fields } = useForm({
      schema: arraySchema,
      defaultValues: {
        items: Array.from({ length: 50 }, (_, i) => ({ name: `Item ${i}`, value: i })),
      },
    })

    const items = fields('items')
    const initialLength = items.value.length
    const iterations = 50

    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      items.move(0, initialLength - 1)
    }
    const duration = performance.now() - start
    const avgPerMove = duration / iterations

    console.log(`Field array move benchmark (${iterations} moves):`)
    console.log(`  Total: ${duration.toFixed(2)}ms`)
    console.log(`  Average: ${avgPerMove.toFixed(3)}ms per move`)

    expect(avgPerMove).toBeLessThan(5)
  })

  it('should generate unique keys efficiently', () => {
    const { fields } = useForm({
      schema: arraySchema,
      defaultValues: { items: [] },
    })

    const items = fields('items')
    const iterations = 1000

    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      items.append({ name: '', value: 0 })
    }
    const duration = performance.now() - start

    // Get fresh reference for verification
    const freshItems = fields('items')
    // Verify all keys are unique
    const keys = new Set(freshItems.value.map((f) => f.key))

    console.log(`Field array key generation benchmark (${iterations} items):`)
    console.log(`  Total: ${duration.toFixed(2)}ms`)
    console.log(`  Unique keys: ${keys.size}/${iterations}`)

    expect(keys.size).toBe(iterations)
    expect(duration).toBeLessThan(1000) // Under 1 second for 1000 items
  })

  it('should handle batch operations efficiently', () => {
    const { fields } = useForm({
      schema: arraySchema,
      defaultValues: {
        items: Array.from({ length: 100 }, (_, i) => ({ name: `Item ${i}`, value: i })),
      },
    })

    const items = fields('items')

    // Test replace (batch operation)
    const newItems = Array.from({ length: 100 }, (_, i) => ({
      name: `New Item ${i}`,
      value: i * 2,
    }))

    const start = performance.now()
    items.replace(newItems)
    const duration = performance.now() - start

    console.log(`Field array replace benchmark (100 items):`)
    console.log(`  Duration: ${duration.toFixed(2)}ms`)

    expect(items.value.length).toBe(100)
    expect(items.value[0].key).toBeDefined()
    expect(duration).toBeLessThan(50) // Under 50ms for full replace
  })

  it('should handle prepend operations', () => {
    const { fields } = useForm({
      schema: arraySchema,
      defaultValues: { items: [{ name: 'Initial', value: 0 }] },
    })

    const items = fields('items')
    const iterations = 50

    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      items.prepend({ name: `Prepended ${i}`, value: i })
    }
    const duration = performance.now() - start
    const avgPerPrepend = duration / iterations

    console.log(`Field array prepend benchmark (${iterations} prepends):`)
    console.log(`  Total: ${duration.toFixed(2)}ms`)
    console.log(`  Average: ${avgPerPrepend.toFixed(3)}ms per prepend`)

    // Get fresh reference for assertions
    const freshItems = fields('items')
    expect(freshItems.value.length).toBe(iterations + 1)
    expect(avgPerPrepend).toBeLessThan(5)
  })

  it('should handle insert operations', () => {
    const { fields } = useForm({
      schema: arraySchema,
      defaultValues: {
        items: Array.from({ length: 10 }, (_, i) => ({ name: `Item ${i}`, value: i })),
      },
    })

    const items = fields('items')
    const initialLength = items.value.length
    const iterations = 50

    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      items.insert(5, { name: `Inserted ${i}`, value: i })
    }
    const duration = performance.now() - start
    const avgPerInsert = duration / iterations

    console.log(`Field array insert benchmark (${iterations} inserts at index 5):`)
    console.log(`  Total: ${duration.toFixed(2)}ms`)
    console.log(`  Average: ${avgPerInsert.toFixed(3)}ms per insert`)

    // Get fresh reference for assertions
    const freshItems = fields('items')
    expect(freshItems.value.length).toBe(initialLength + iterations)
    expect(avgPerInsert).toBeLessThan(5)
  })
})
