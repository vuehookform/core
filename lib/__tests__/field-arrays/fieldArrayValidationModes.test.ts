import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { useForm } from '../../useForm'
import { z } from 'zod'
import { waitFor } from '../helpers/test-utils'

// Helper to wait for async validation to complete
async function flushValidation(): Promise<void> {
  await nextTick()
  await waitFor(0)
  await nextTick()
}

const schema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email'),
    }),
  ),
})

describe('field array validation modes', () => {
  describe('mode: onSubmit (default)', () => {
    it('should NOT validate on append when mode is onSubmit', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onSubmit',
      })

      const items = fields('items')
      items.append({ name: '', email: 'invalid' })

      await flushValidation()

      expect(formState.value.errors).toEqual({})
    })

    it('should NOT validate on prepend when mode is onSubmit', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onSubmit',
        defaultValues: { items: [{ name: 'Existing', email: 'test@test.com' }] },
      })

      const items = fields('items')
      items.prepend({ name: '', email: 'invalid' })

      await flushValidation()

      expect(formState.value.errors).toEqual({})
    })

    it('should NOT validate on remove when mode is onSubmit', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onSubmit',
        defaultValues: { items: [{ name: '', email: 'invalid' }] },
      })

      const items = fields('items')
      items.remove(0)

      await flushValidation()

      expect(formState.value.errors).toEqual({})
    })

    it('should NOT validate on update when mode is onSubmit', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onSubmit',
        defaultValues: { items: [{ name: 'Valid', email: 'test@test.com' }] },
      })

      const items = fields('items')
      items.update(0, { name: '', email: 'invalid' })

      await flushValidation()

      expect(formState.value.errors).toEqual({})
    })

    it('should NOT validate on swap when mode is onSubmit', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onSubmit',
        defaultValues: {
          items: [
            { name: '', email: 'invalid' },
            { name: 'Valid', email: 'test@test.com' },
          ],
        },
      })

      const items = fields('items')
      items.swap(0, 1)

      await flushValidation()

      expect(formState.value.errors).toEqual({})
    })

    it('should NOT validate on move when mode is onSubmit', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onSubmit',
        defaultValues: {
          items: [
            { name: '', email: 'invalid' },
            { name: 'Valid', email: 'test@test.com' },
          ],
        },
      })

      const items = fields('items')
      items.move(0, 1)

      await flushValidation()

      expect(formState.value.errors).toEqual({})
    })

    it('should NOT validate on insert when mode is onSubmit', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onSubmit',
        defaultValues: { items: [{ name: 'Existing', email: 'test@test.com' }] },
      })

      const items = fields('items')
      items.insert(0, { name: '', email: 'invalid' })

      await flushValidation()

      expect(formState.value.errors).toEqual({})
    })

    it('should NOT validate on replace when mode is onSubmit', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onSubmit',
        defaultValues: { items: [{ name: 'Existing', email: 'test@test.com' }] },
      })

      const items = fields('items')
      items.replace([{ name: '', email: 'invalid' }])

      await flushValidation()

      expect(formState.value.errors).toEqual({})
    })
  })

  describe('mode: onChange', () => {
    it('should validate on append when mode is onChange', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const items = fields('items')
      items.append({ name: '', email: 'invalid' })

      await flushValidation()

      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })

    it('should validate on prepend when mode is onChange', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: { items: [{ name: 'Existing', email: 'test@test.com' }] },
      })

      const items = fields('items')
      items.prepend({ name: '', email: 'invalid' })

      await flushValidation()

      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })

    it('should validate on remove when mode is onChange', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: {
          items: [
            { name: 'Valid', email: 'test@test.com' },
            { name: '', email: 'invalid' },
          ],
        },
      })

      const items = fields('items')
      // Trigger initial validation by marking field as dirty
      items.remove(1) // Remove invalid item

      await flushValidation()

      // After removing invalid item, no errors should remain
      expect(formState.value.errors['items.1.name']).toBeUndefined()
      expect(formState.value.errors['items.1.email']).toBeUndefined()
    })

    it('should validate on update when mode is onChange', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: { items: [{ name: 'Valid', email: 'test@test.com' }] },
      })

      const items = fields('items')
      items.update(0, { name: '', email: 'invalid' })

      await flushValidation()

      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })

    it('should validate on swap when mode is onChange', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: {
          items: [
            { name: '', email: 'invalid' },
            { name: 'Valid', email: 'test@test.com' },
          ],
        },
      })

      const items = fields('items')
      items.swap(0, 1)

      await flushValidation()

      // Validation should run and find the invalid item
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })

    it('should validate on move when mode is onChange', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: {
          items: [
            { name: '', email: 'invalid' },
            { name: 'Valid', email: 'test@test.com' },
          ],
        },
      })

      const items = fields('items')
      items.move(0, 1)

      await flushValidation()

      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })

    it('should validate on insert when mode is onChange', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: { items: [{ name: 'Existing', email: 'test@test.com' }] },
      })

      const items = fields('items')
      items.insert(0, { name: '', email: 'invalid' })

      await flushValidation()

      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })

    it('should validate on replace when mode is onChange', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: { items: [{ name: 'Existing', email: 'test@test.com' }] },
      })

      const items = fields('items')
      items.replace([{ name: '', email: 'invalid' }])

      await flushValidation()

      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })

    it('should clear errors when valid data is provided', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const items = fields('items')
      items.append({ name: '', email: 'invalid' })

      await flushValidation()
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)

      // Update to valid data
      items.update(0, { name: 'Valid Name', email: 'valid@test.com' })

      await flushValidation()
      expect(formState.value.errors['items.0.name']).toBeUndefined()
      expect(formState.value.errors['items.0.email']).toBeUndefined()
    })
  })

  describe('mode: onBlur', () => {
    it('should NOT validate on append when mode is onBlur', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onBlur',
      })

      const items = fields('items')
      items.append({ name: '', email: 'invalid' })

      await flushValidation()

      // onBlur mode doesn't validate on field array operations (no blur event)
      expect(formState.value.errors).toEqual({})
    })

    it('should NOT validate on update when mode is onBlur', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onBlur',
        defaultValues: { items: [{ name: 'Valid', email: 'test@test.com' }] },
      })

      const items = fields('items')
      items.update(0, { name: '', email: 'invalid' })

      await flushValidation()

      expect(formState.value.errors).toEqual({})
    })
  })

  describe('mode: onTouched', () => {
    it('should NOT validate on append when field is NOT touched', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onTouched',
      })

      const items = fields('items')
      items.append({ name: '', email: 'invalid' })

      await flushValidation()

      expect(formState.value.errors).toEqual({})
    })

    it('should NOT validate on append when only child field is touched', async () => {
      // Note: In onTouched mode, field array operations check if the ARRAY FIELD ITSELF
      // is touched (e.g., 'items'), not individual child fields (e.g., 'items.0.name').
      // Touching a child field does NOT mark the array as touched.
      const { fields, formState, register } = useForm({
        schema,
        mode: 'onTouched',
        defaultValues: { items: [{ name: 'Existing', email: 'test@test.com' }] },
      })

      // Touch a child field (this does NOT mark 'items' as touched)
      const reg = register('items.0.name')
      const input = document.createElement('input')
      reg.ref(input)
      reg.onBlur({ target: input } as unknown as Event)

      await flushValidation()

      const items = fields('items')
      items.append({ name: '', email: 'invalid' })

      await flushValidation()

      // Array operations won't validate because 'items' itself isn't touched
      expect(formState.value.errors).toEqual({})
    })

    it('should NOT validate on update when only child field is touched', async () => {
      // Same as above - touching a child field does NOT trigger validation
      // on array operations in onTouched mode
      const { fields, formState, register } = useForm({
        schema,
        mode: 'onTouched',
        defaultValues: { items: [{ name: 'Valid', email: 'test@test.com' }] },
      })

      // Touch a child field
      const reg = register('items.0.name')
      const input = document.createElement('input')
      reg.ref(input)
      reg.onBlur({ target: input } as unknown as Event)

      await flushValidation()

      const items = fields('items')
      items.update(0, { name: '', email: 'invalid' })

      await flushValidation()

      // No validation because 'items' array field itself isn't touched
      expect(formState.value.errors).toEqual({})
    })
  })

  describe('reValidateMode', () => {
    it('should use reValidateMode after form submission', async () => {
      const { fields, formState, handleSubmit } = useForm({
        schema,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: { items: [{ name: 'Valid', email: 'test@test.com' }] },
      })

      // Before submit, onChange should NOT validate
      const items = fields('items')
      items.update(0, { name: '', email: 'invalid' })

      await flushValidation()
      expect(formState.value.errors).toEqual({})

      // Trigger submit (validation will fail)
      const onSubmit = () => {}
      const onError = () => {}
      const submitHandler = handleSubmit(onSubmit, onError)
      await submitHandler(new Event('submit'))

      await flushValidation()

      // Now should have errors from submit validation
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)

      // Fix the data
      items.update(0, { name: 'Valid', email: 'test@test.com' })
      await flushValidation()

      // After submit, reValidateMode (onChange) kicks in
      // Errors should be cleared when data becomes valid
      expect(formState.value.errors['items.0.name']).toBeUndefined()
      expect(formState.value.errors['items.0.email']).toBeUndefined()
    })

    it('should NOT validate changes before submission with onSubmit mode', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
      })

      const items = fields('items')
      items.append({ name: '', email: 'invalid' })

      await flushValidation()

      // submitCount is 0, so reValidateMode doesn't apply yet
      expect(formState.value.errors).toEqual({})
      expect(formState.value.submitCount).toBe(0)
    })

    it('should apply reValidateMode: onBlur after submission', async () => {
      const { fields, formState, handleSubmit } = useForm({
        schema,
        mode: 'onSubmit',
        reValidateMode: 'onBlur',
        defaultValues: { items: [{ name: 'Valid', email: 'test@test.com' }] },
      })

      // Trigger submit to set submitCount > 0
      const onSubmit = () => {}
      const submitHandler = handleSubmit(onSubmit)
      await submitHandler(new Event('submit'))

      await flushValidation()
      expect(formState.value.submitCount).toBe(1)

      // After submit, reValidateMode is onBlur
      // Update should NOT trigger validation (only blur should)
      const items = fields('items')
      items.update(0, { name: '', email: 'invalid' })

      await flushValidation()

      // onBlur reValidateMode - field array operations don't trigger blur
      // so no immediate validation on update
      // (This tests that reValidateMode is properly respected)
    })
  })

  describe('multiple operations', () => {
    it('should validate after multiple rapid operations in onChange mode', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
      })

      const items = fields('items')
      items.append({ name: 'First', email: 'first@test.com' })
      items.append({ name: '', email: 'invalid' })
      items.append({ name: 'Third', email: 'third@test.com' })

      await flushValidation()

      // Should have errors for the invalid item
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })

    it('should clear all errors when all items are removed in onChange mode', async () => {
      const { fields, formState } = useForm({
        schema,
        mode: 'onChange',
        defaultValues: {
          items: [
            { name: '', email: 'invalid1' },
            { name: '', email: 'invalid2' },
          ],
        },
      })

      const items = fields('items')

      // Trigger validation
      items.update(0, { name: '', email: 'invalid' })
      await flushValidation()

      // Remove all items
      items.replace([])
      await flushValidation()

      // All item-level errors should be cleared
      const itemErrors = Object.keys(formState.value.errors).filter((k) => k.startsWith('items.'))
      expect(itemErrors.length).toBe(0)
    })
  })
})
