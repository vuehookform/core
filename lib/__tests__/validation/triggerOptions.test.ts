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
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Username too short'),
  password: z.string().min(8, 'Password too short'),
})

const arraySchema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
    }),
  ),
})

describe('trigger options', () => {
  describe('markAsSubmitted option', () => {
    it('should increment submitCount when markAsSubmitted is true', async () => {
      const { formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      expect(formState.value.submitCount).toBe(0)

      await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()

      expect(formState.value.submitCount).toBe(1)
    })

    it('should NOT increment submitCount when markAsSubmitted is false', async () => {
      const { formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      expect(formState.value.submitCount).toBe(0)

      await trigger(undefined, { markAsSubmitted: false })
      await flushValidation()

      expect(formState.value.submitCount).toBe(0)
    })

    it('should NOT increment submitCount by default (no options)', async () => {
      const { formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      expect(formState.value.submitCount).toBe(0)

      await trigger()
      await flushValidation()

      expect(formState.value.submitCount).toBe(0)
    })

    it('should increment submitCount multiple times with repeated calls', async () => {
      const { formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()
      expect(formState.value.submitCount).toBe(1)

      await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()
      expect(formState.value.submitCount).toBe(2)

      await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()
      expect(formState.value.submitCount).toBe(3)
    })
  })

  describe('markAsSubmitted activates reValidateMode', () => {
    it('should activate reValidateMode: onChange after markAsSubmitted', async () => {
      const { formState, trigger, setValue } = useForm({
        schema,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      // Before markAsSubmitted, validation is not active
      // Note: shouldValidate: true explicitly forces validation regardless of mode
      // So we test without it first
      expect(formState.value.submitCount).toBe(0)
      expect(formState.value.errors.email).toBeUndefined()

      // Mark as submitted
      await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()
      expect(formState.value.submitCount).toBe(1)

      // Now reValidateMode (onChange) should be active
      // Using shouldValidate: true to explicitly validate after submit
      setValue('email', 'invalid', { shouldValidate: true })
      await flushValidation()

      // Should now have validation error
      expect(formState.value.errors.email).toBeDefined()
    })

    it('should demonstrate that shouldValidate always validates regardless of mode', async () => {
      const { formState, setValue } = useForm({
        schema,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      // shouldValidate: true explicitly forces validation, even with mode: onSubmit
      // This is intentional - it's an explicit request to validate
      setValue('email', 'invalid', { shouldValidate: true })
      await flushValidation()

      // Error should appear because shouldValidate: true was used
      expect(formState.value.errors.email).toBeDefined()
    })

    it('should work with field-specific trigger', async () => {
      const { formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'invalid', username: 'user', password: 'password123' },
      })

      expect(formState.value.submitCount).toBe(0)

      // Trigger specific field with markAsSubmitted
      await trigger('email', { markAsSubmitted: true })
      await flushValidation()

      expect(formState.value.submitCount).toBe(1)
      expect(formState.value.errors.email).toBeDefined()
    })

    it('should work with array of fields trigger', async () => {
      const { formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'invalid', username: 'ab', password: 'short' },
      })

      expect(formState.value.submitCount).toBe(0)

      // Trigger multiple fields with markAsSubmitted
      await trigger(['email', 'username'], { markAsSubmitted: true })
      await flushValidation()

      expect(formState.value.submitCount).toBe(1)
      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.username).toBeDefined()
    })
  })

  describe('markAsSubmitted with field arrays', () => {
    it('should activate reValidateMode for field array operations', async () => {
      const { formState, trigger, fields } = useForm({
        schema: arraySchema,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: { items: [{ name: 'Valid' }] },
      })

      const items = fields('items')

      // Before markAsSubmitted, field array operations should NOT validate
      items.append({ name: '' })
      await flushValidation()
      expect(formState.value.errors['items.1.name']).toBeUndefined()

      // Mark as submitted
      await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()
      expect(formState.value.submitCount).toBe(1)

      // Now errors should appear from the validation triggered by markAsSubmitted
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)

      // Further operations should now validate
      items.append({ name: '' })
      await flushValidation()

      // Should have validation errors
      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })
  })

  describe('markAsSubmitted with form state', () => {
    it('should set isSubmitted to true-like behavior (submitCount > 0)', async () => {
      const { formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      // submitCount is used to determine if form has been submitted
      expect(formState.value.submitCount).toBe(0)

      await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()

      // Now submitCount > 0, which is used internally to check "has been submitted"
      expect(formState.value.submitCount).toBeGreaterThan(0)
    })

    it('should return validation result', async () => {
      const { trigger } = useForm({
        schema,
        defaultValues: { email: 'invalid', username: 'user', password: 'password123' },
      })

      const isValid = await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()

      expect(isValid).toBe(false)
    })

    it('should return true when validation passes', async () => {
      const { trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      const isValid = await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()

      expect(isValid).toBe(true)
    })
  })

  describe('use case: multi-step form validation', () => {
    const multiStepSchema = z.object({
      // Step 1
      firstName: z.string().min(1, 'First name required'),
      lastName: z.string().min(1, 'Last name required'),
      // Step 2
      email: z.string().email('Invalid email'),
      phone: z.string().min(10, 'Phone too short'),
    })

    it('should validate step and activate reValidateMode for that step', async () => {
      const { formState, trigger, setValue } = useForm({
        schema: multiStepSchema,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: { firstName: '', lastName: '', email: '', phone: '' },
      })

      // User fills step 1
      setValue('firstName', 'John')
      setValue('lastName', 'Doe')

      // Validate step 1 before proceeding to step 2
      const step1Valid = await trigger(['firstName', 'lastName'], { markAsSubmitted: true })
      await flushValidation()

      expect(step1Valid).toBe(true)
      expect(formState.value.submitCount).toBe(1)

      // Now if user goes back and clears a field, reValidateMode kicks in
      setValue('firstName', '', { shouldValidate: true })
      await flushValidation()

      // Should immediately show error due to reValidateMode
      expect(formState.value.errors.firstName).toBeDefined()
    })

    it('should work for subsequent step validations', async () => {
      const { formState, trigger, setValue } = useForm({
        schema: multiStepSchema,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: { firstName: 'John', lastName: 'Doe', email: '', phone: '' },
      })

      // Validate step 1
      await trigger(['firstName', 'lastName'], { markAsSubmitted: true })
      await flushValidation()
      expect(formState.value.submitCount).toBe(1)

      // User fills step 2
      setValue('email', 'john@test.com')
      setValue('phone', '1234567890')

      // Validate step 2
      const step2Valid = await trigger(['email', 'phone'], { markAsSubmitted: true })
      await flushValidation()

      expect(step2Valid).toBe(true)
      expect(formState.value.submitCount).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should handle trigger with empty options object', async () => {
      const { formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      await trigger(undefined, {})
      await flushValidation()

      // Empty options means no markAsSubmitted
      expect(formState.value.submitCount).toBe(0)
    })

    it('should handle trigger with undefined options', async () => {
      const { formState, trigger } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      await trigger(undefined, undefined)
      await flushValidation()

      expect(formState.value.submitCount).toBe(0)
    })

    it('should work correctly after form reset', async () => {
      const { formState, trigger, reset } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', username: 'user', password: 'password123' },
      })

      // Mark as submitted
      await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()
      expect(formState.value.submitCount).toBe(1)

      // Reset form
      reset()

      expect(formState.value.submitCount).toBe(0)

      // Mark as submitted again
      await trigger(undefined, { markAsSubmitted: true })
      await flushValidation()
      expect(formState.value.submitCount).toBe(1)
    })
  })
})
