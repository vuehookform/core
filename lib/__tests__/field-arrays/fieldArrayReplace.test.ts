import { describe, it, expect } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'

/**
 * Field Array replace() Tests
 *
 * Tests for the replace() method on field arrays:
 * - Replace all items with new values
 * - Clear all items with empty array
 * - Generate new unique keys
 * - Mark array as dirty
 * - Handle complex item structures
 * - Ignore invalid input
 */

// Schema for field array tests
const arraySchema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1),
      price: z.number(),
    }),
  ),
})

describe('field array replace', () => {
  it('should replace all items with new values', () => {
    const { fields, getValues } = useForm({
      schema: arraySchema,
      defaultValues: {
        items: [
          { name: 'Original', price: 5 },
          { name: 'Item', price: 10 },
        ],
      },
    })

    const itemsArray = fields('items')

    itemsArray.replace([
      { name: 'New Item 1', price: 100 },
      { name: 'New Item 2', price: 200 },
      { name: 'New Item 3', price: 300 },
    ])

    const values = getValues('items')
    expect(values).toHaveLength(3)
    expect(values[0]).toEqual({ name: 'New Item 1', price: 100 })
    expect(values[1]).toEqual({ name: 'New Item 2', price: 200 })
    expect(values[2]).toEqual({ name: 'New Item 3', price: 300 })
  })

  it('should clear all items when replacing with empty array', () => {
    const { fields, getValues } = useForm({
      schema: arraySchema,
      defaultValues: {
        items: [
          { name: 'Item 1', price: 10 },
          { name: 'Item 2', price: 20 },
        ],
      },
    })

    const itemsArray = fields('items')
    expect(itemsArray.value).toHaveLength(2)

    itemsArray.replace([])

    // Form data should be updated to empty array
    expect(getValues('items')).toHaveLength(0)
  })

  it('should generate new unique keys for replaced items', () => {
    const { fields } = useForm({
      schema: arraySchema,
      defaultValues: {
        items: [{ name: 'Original', price: 10 }],
      },
    })

    let itemsArray = fields('items')
    const oldKeys = itemsArray.value.map((item) => item.key)

    itemsArray.replace([
      { name: 'New 1', price: 100 },
      { name: 'New 2', price: 200 },
    ])

    // Get fresh reference after replace (value isn't reactive, need to call fields again)
    itemsArray = fields('items')
    const newKeys = itemsArray.value.map((item) => item.key)

    // All keys should be different from old keys
    oldKeys.forEach((oldKey) => {
      expect(newKeys).not.toContain(oldKey)
    })

    // All new keys should be unique
    const uniqueKeys = new Set(newKeys)
    expect(uniqueKeys.size).toBe(newKeys.length)
  })

  it('should mark array as dirty after replace', () => {
    const { fields, formState } = useForm({
      schema: arraySchema,
      defaultValues: {
        items: [{ name: 'Original', price: 10 }],
      },
    })

    const itemsArray = fields('items')

    expect(formState.value.dirtyFields.items).toBeUndefined()

    itemsArray.replace([{ name: 'New', price: 100 }])

    expect(formState.value.dirtyFields.items).toBe(true)
  })

  it('should work with various item structures', () => {
    const complexSchema = z.object({
      items: z.array(
        z.object({
          id: z.number(),
          data: z.object({
            value: z.string(),
          }),
        }),
      ),
    })

    const { fields, getValues } = useForm({
      schema: complexSchema,
      defaultValues: { items: [] },
    })

    const itemsArray = fields('items')

    itemsArray.replace([
      { id: 1, data: { value: 'a' } },
      { id: 2, data: { value: 'b' } },
    ])

    const values = getValues('items')
    expect(values[0]).toEqual({ id: 1, data: { value: 'a' } })
    expect(values[1]).toEqual({ id: 2, data: { value: 'b' } })
  })

  it('should ignore non-array input', () => {
    const { fields, getValues } = useForm({
      schema: arraySchema,
      defaultValues: {
        items: [{ name: 'Original', price: 10 }],
      },
    })

    const itemsArray = fields('items')

    // @ts-expect-error - Testing invalid input
    itemsArray.replace('not an array')

    // Items should be unchanged
    const values = getValues('items')
    expect(values).toHaveLength(1)
    expect(values[0]).toEqual({ name: 'Original', price: 10 })
  })
})
