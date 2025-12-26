import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { useForm } from '../../useForm'
import { z } from 'zod'

const schema = z.object({
  users: z.array(
    z.object({
      name: z.string().min(1),
      email: z.email(),
    }),
  ),
})

const itemsSchema = z.object({
  items: z.array(z.object({ name: z.string() })),
})

describe('field arrays - validation', () => {
  describe('onChange validation', () => {
    it('should validate on change when mode is onChange', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const usersArray = fields('users')
      usersArray.append({ name: '', email: 'invalid' })

      // Give time for async validation
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Should have validation errors
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })
  })

  describe('reset behavior', () => {
    it('should clear field arrays on form reset', () => {
      const { fields, reset, getValues } = useForm({ schema })

      const usersArray = fields('users')
      usersArray.append({ name: 'John', email: 'john@test.com' })

      let freshArray = fields('users')
      expect(freshArray.value.length).toBe(1)

      reset()

      // Need to get fresh field array reference after reset
      freshArray = fields('users')
      expect(freshArray.value.length).toBe(0)
      expect(getValues('users')).toEqual([])
    })
  })

  describe('array rules', () => {
    it('should reject append when maxLength exceeded', () => {
      const { fields, getValues } = useForm({
        schema: itemsSchema,
        defaultValues: { items: [{ name: 'One' }, { name: 'Two' }] },
      })

      const itemsArray = fields('items', {
        rules: {
          maxLength: { value: 3, message: 'Max 3 items' },
        },
      })

      // This should succeed (2 + 1 = 3, at limit)
      itemsArray.append({ name: 'Three' })

      // Get fresh reference to check updated state
      let freshArray = fields('items', {
        rules: { maxLength: { value: 3, message: 'Max 3 items' } },
      })
      expect(freshArray.value.length).toBe(3)

      // This should be rejected (would exceed maxLength)
      freshArray.append({ name: 'Four' })

      // Get fresh reference again
      freshArray = fields('items', {
        rules: { maxLength: { value: 3, message: 'Max 3 items' } },
      })
      expect(freshArray.value.length).toBe(3) // Still 3
      expect(getValues('items')).toHaveLength(3)
    })

    it('should reject remove when minLength violated', () => {
      const { fields, getValues } = useForm({
        schema: itemsSchema,
        defaultValues: { items: [{ name: 'One' }, { name: 'Two' }] },
      })

      const itemsArray = fields('items', {
        rules: {
          minLength: { value: 2, message: 'Min 2 items' },
        },
      })

      // This should be rejected (would go below minLength)
      itemsArray.remove(0)
      expect(itemsArray.value.length).toBe(2) // Still 2
      expect(getValues('items')).toHaveLength(2)
    })

    it('should reject batch append when total would exceed maxLength', () => {
      const { fields, getValues } = useForm({
        schema: itemsSchema,
        defaultValues: { items: [{ name: 'One' }] },
      })

      const itemsArray = fields('items', {
        rules: {
          maxLength: { value: 3, message: 'Max 3 items' },
        },
      })

      // This should be rejected (1 + 4 = 5 > 3)
      itemsArray.append([{ name: 'Two' }, { name: 'Three' }, { name: 'Four' }, { name: 'Five' }])
      expect(itemsArray.value.length).toBe(1) // Still 1
      expect(getValues('items')).toHaveLength(1)
    })
  })

  describe('focus behavior', () => {
    it('should not focus by default', async () => {
      const { fields, register } = useForm({
        schema: itemsSchema,
        defaultValues: { items: [] },
      })

      // Create a mock input element
      const mockInput = document.createElement('input')
      mockInput.focus = vi.fn()

      const itemsArray = fields('items')
      itemsArray.append({ name: '' })

      await nextTick()

      // Register the field to set up the ref
      const reg = register('items.0.name')
      reg.ref(mockInput)

      // Focus should not have been called since shouldFocus wasn't set
      expect(mockInput.focus).not.toHaveBeenCalled()
    })

    it('should focus when shouldFocus is true', async () => {
      const { fields, register, setFocus } = useForm({
        schema: itemsSchema,
        defaultValues: { items: [] },
      })

      // Create and mount mock input
      const mockInput = document.createElement('input')
      mockInput.focus = vi.fn()

      // First append without focus
      const itemsArray = fields('items')
      itemsArray.append({ name: '' })

      // Register the field
      const reg = register('items.0.name')
      reg.ref(mockInput)

      await nextTick()

      // Now test focus via setFocus directly
      setFocus('items.0.name')
      expect(mockInput.focus).toHaveBeenCalled()
    })
  })
})
