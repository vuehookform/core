import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { waitFor } from '../helpers/test-utils'

// Helper to wait for async validation to complete
async function flushValidation(): Promise<void> {
  await nextTick()
  await waitFor(0)
  await nextTick()
}
import { z } from 'zod'
import { useForm } from '../../useForm'
import { useWatch } from '../../useWatch'
import { useController } from '../../useController'
import { useFormState } from '../../useFormState'
import { useFieldError } from '../../useFieldError'

const schema = z.object({
  email: z.email(),
  name: z.string().min(2),
  age: z.number().optional(),
  address: z
    .object({
      street: z.string(),
      city: z.string(),
    })
    .optional(),
})

describe('useWatch', () => {
  describe('with explicit control', () => {
    it('should watch a single field', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const email = useWatch({ control: form, name: 'email' })

      expect(email.value).toBe('test@example.com')
    })

    it('should watch multiple fields', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const fields = useWatch({ control: form, name: ['email', 'name'] })

      expect(fields.value).toEqual({
        email: 'test@example.com',
        name: 'John',
      })
    })

    it('should watch all fields when name is not provided', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const allValues = useWatch({ control: form })

      expect(allValues.value).toEqual({
        email: 'test@example.com',
        name: 'John',
      })
    })

    it('should return default value when field is undefined', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const age = useWatch({ control: form, name: 'age', defaultValue: 25 })

      expect(age.value).toBe(25)
    })

    it('should reactively update when field changes', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const email = useWatch({ control: form, name: 'email' })

      expect(email.value).toBe('test@example.com')

      form.setValue('email', 'new@example.com')

      expect(email.value).toBe('new@example.com')
    })

    it('should apply defaultValue fallback for multiple fields', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const fields = useWatch({
        control: form,
        name: ['age', 'email'],
        defaultValue: 'fallback',
      })

      expect(fields.value).toEqual({
        age: 'fallback',
        email: 'test@example.com',
      })
    })

    it('should reactively update in watch-all mode', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const all = useWatch({ control: form })
      expect(all.value).toEqual({ email: 'test@example.com', name: 'John' })

      form.setValue('name', 'Jane')
      expect(all.value).toEqual({ email: 'test@example.com', name: 'Jane' })
    })
  })

  describe('exports', () => {
    it('should export useWatch from index', async () => {
      const exports = await import('../../index')
      expect(exports.useWatch).toBeDefined()
    })
  })
})

describe('useController', () => {
  describe('with explicit control', () => {
    it('should return field props', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const { field } = useController({ control: form, name: 'email' })

      expect(field.name).toBe('email')
      expect(field.value.value).toBe('test@example.com')
      expect(typeof field.onChange).toBe('function')
      expect(typeof field.onBlur).toBe('function')
      expect(typeof field.ref).toBe('function')
    })

    it('should return field state', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const { fieldState } = useController({ control: form, name: 'email' })

      expect(fieldState.value).toEqual({
        isDirty: false,
        isTouched: false,
        invalid: false,
        error: undefined,
      })
    })

    it('should update value via onChange', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const { field } = useController({ control: form, name: 'email' })

      field.onChange('new@example.com')

      expect(field.value.value).toBe('new@example.com')
      expect(form.getValues('email')).toBe('new@example.com')
    })

    it('should initialize with default value when field is undefined', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const { field } = useController({
        control: form,
        name: 'age',
        defaultValue: 25,
      })

      expect(field.value.value).toBe(25)
    })

    it('should support bidirectional value binding', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const { field } = useController({ control: form, name: 'email' })

      // Change via controller
      field.value.value = 'changed@example.com'
      expect(form.getValues('email')).toBe('changed@example.com')

      // Change via form
      form.setValue('email', 'another@example.com')
      expect(field.value.value).toBe('another@example.com')
    })

    it('should reflect dirty state after change', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const { field, fieldState } = useController({ control: form, name: 'email' })

      expect(fieldState.value.isDirty).toBe(false)

      field.onChange('new@example.com')

      expect(fieldState.value.isDirty).toBe(true)
    })
  })

  describe('exports', () => {
    it('should export useController from index', async () => {
      const exports = await import('../../index')
      expect(exports.useController).toBeDefined()
    })
  })

  describe('validation modes', () => {
    describe('mode: onChange', () => {
      it('should validate on onChange when mode is onChange', async () => {
        const form = useForm({
          schema,
          mode: 'onChange',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        field.onChange('invalid')
        await flushValidation()

        expect(fieldState.value.error).toBeDefined()
      })

      it('should clear error when value becomes valid', async () => {
        const form = useForm({
          schema,
          mode: 'onChange',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        // Make invalid
        field.onChange('invalid')
        await flushValidation()
        expect(fieldState.value.error).toBeDefined()

        // Make valid
        field.onChange('valid@test.com')
        await flushValidation()
        expect(fieldState.value.error).toBeUndefined()
      })

      it('should not validate on onChange when mode is onSubmit', async () => {
        const form = useForm({
          schema,
          mode: 'onSubmit',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        field.onChange('invalid')
        await flushValidation()

        expect(fieldState.value.error).toBeUndefined()
      })
    })

    describe('mode: onBlur', () => {
      it('should validate on onBlur when mode is onBlur', async () => {
        const form = useForm({
          schema,
          mode: 'onBlur',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        field.onChange('invalid')
        await flushValidation()
        expect(fieldState.value.error).toBeUndefined()

        field.onBlur()
        await flushValidation()
        expect(fieldState.value.error).toBeDefined()
      })

      it('should not validate on onBlur when mode is onChange', async () => {
        const form = useForm({
          schema,
          mode: 'onChange',
          defaultValues: { email: 'valid@test.com', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        // onBlur shouldn't trigger validation in onChange mode (only change does)
        field.onBlur()
        await flushValidation()

        expect(fieldState.value.error).toBeUndefined()
      })

      it('should not validate on onChange when mode is onBlur', async () => {
        const form = useForm({
          schema,
          mode: 'onBlur',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        field.onChange('invalid')
        await flushValidation()

        expect(fieldState.value.error).toBeUndefined()
      })
    })

    describe('mode: onTouched', () => {
      it('should validate on blur (first touch)', async () => {
        const form = useForm({
          schema,
          mode: 'onTouched',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        field.onChange('invalid')
        await flushValidation()
        expect(fieldState.value.error).toBeUndefined() // Not touched yet

        field.onBlur()
        await flushValidation()
        expect(fieldState.value.error).toBeDefined() // Now touched and validated
      })

      it('should validate on change after field is touched', async () => {
        const form = useForm({
          schema,
          mode: 'onTouched',
          defaultValues: { email: 'valid@test.com', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        // Touch the field first
        field.onBlur()
        await flushValidation()
        expect(fieldState.value.isTouched).toBe(true)

        // Now onChange should validate
        field.onChange('invalid')
        await flushValidation()

        expect(fieldState.value.error).toBeDefined()
      })

      it('should not validate on change before field is touched', async () => {
        const form = useForm({
          schema,
          mode: 'onTouched',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        field.onChange('invalid')
        await flushValidation()

        expect(fieldState.value.error).toBeUndefined()
      })
    })

    describe('mode: onSubmit', () => {
      it('should not validate on onChange', async () => {
        const form = useForm({
          schema,
          mode: 'onSubmit',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        field.onChange('invalid')
        await flushValidation()

        expect(fieldState.value.error).toBeUndefined()
      })

      it('should not validate on onBlur', async () => {
        const form = useForm({
          schema,
          mode: 'onSubmit',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        field.onChange('invalid')
        field.onBlur()
        await flushValidation()

        expect(fieldState.value.error).toBeUndefined()
      })
    })

    describe('reValidateMode', () => {
      it('should use reValidateMode: onChange after submit', async () => {
        const form = useForm({
          schema,
          mode: 'onSubmit',
          reValidateMode: 'onChange',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        // Before submit, onChange should not validate
        field.onChange('invalid')
        await flushValidation()
        expect(fieldState.value.error).toBeUndefined()

        // Submit (which will fail validation)
        const submitHandler = form.handleSubmit(vi.fn())
        await submitHandler(new Event('submit'))
        expect(form.formState.value.errors.email).toBeDefined()

        // Touch the field (reValidateMode: 'onChange' requires isTouched)
        field.onBlur()
        await flushValidation()

        // Now onChange should validate due to reValidateMode
        field.onChange('valid@test.com')
        await flushValidation()

        expect(fieldState.value.error).toBeUndefined()
      })

      it('should use reValidateMode: onBlur after submit', async () => {
        const form = useForm({
          schema,
          mode: 'onSubmit',
          reValidateMode: 'onBlur',
          defaultValues: { email: '', name: 'John' },
        })

        const { field, fieldState } = useController({ control: form, name: 'email' })

        // Submit first
        const submitHandler = form.handleSubmit(vi.fn())
        await submitHandler(new Event('submit'))
        expect(form.formState.value.errors.email).toBeDefined()

        // Fix the value
        field.onChange('valid@test.com')
        await flushValidation()

        // Error might still be there (depends on implementation)
        // Blur should trigger revalidation
        field.onBlur()
        await flushValidation()

        expect(fieldState.value.error).toBeUndefined()
      })
    })
  })
})

describe('useFormState', () => {
  describe('with explicit control', () => {
    it('should return all form state when name is not provided', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const state = useFormState({ control: form })

      expect(state.value).toHaveProperty('errors')
      expect(state.value).toHaveProperty('isDirty')
      expect(state.value).toHaveProperty('isValid')
      expect(state.value).toHaveProperty('isSubmitting')
      expect(state.value).toHaveProperty('isLoading')
      expect(state.value).toHaveProperty('touchedFields')
      expect(state.value).toHaveProperty('dirtyFields')
      expect(state.value).toHaveProperty('submitCount')
    })

    it('should return specific state properties', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const state = useFormState({
        control: form,
        name: ['isSubmitting', 'isDirty'],
      })

      expect(state.value).toHaveProperty('isSubmitting')
      expect(state.value).toHaveProperty('isDirty')
      expect(state.value).not.toHaveProperty('errors')
    })

    it('should return single state property', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const state = useFormState({ control: form, name: 'isSubmitting' })

      expect(state.value).toEqual({ isSubmitting: false })
    })

    it('should reactively update when state changes', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      const state = useFormState({ control: form, name: 'isDirty' })

      expect(state.value.isDirty).toBe(false)

      form.setValue('email', 'new@example.com')

      expect(state.value.isDirty).toBe(true)
    })
  })

  describe('exports', () => {
    it('should export useFormState from index', async () => {
      const exports = await import('../../index')
      expect(exports.useFormState).toBeDefined()
    })
  })
})

describe('useFieldError', () => {
  describe('with explicit control', () => {
    it('should return undefined when no error exists', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'valid@test.com', name: 'John' },
      })

      const error = useFieldError({ control: form, name: 'email' })
      expect(error.value).toBeUndefined()
    })

    it('should return error message string after validation fails', async () => {
      const form = useForm({
        schema,
        defaultValues: { email: '', name: '' },
      })

      const emailError = useFieldError({ control: form, name: 'email' })

      const onSubmit = form.handleSubmit(() => {})
      await onSubmit(new Event('submit'))

      expect(emailError.value).toBeDefined()
      expect(typeof emailError.value).toBe('string')
    })

    it('should clear when error is resolved', async () => {
      const form = useForm({
        schema,
        defaultValues: { email: '', name: 'John' },
      })

      const emailError = useFieldError({ control: form, name: 'email' })

      const onSubmit = form.handleSubmit(() => {})
      await onSubmit(new Event('submit'))
      expect(emailError.value).toBeDefined()

      form.setValue('email', 'valid@test.com')
      await onSubmit(new Event('submit'))
      expect(emailError.value).toBeUndefined()
    })

    it('should handle setError with structured FieldError', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'a@b.com', name: 'John' },
      })

      const emailError = useFieldError({ control: form, name: 'email' })

      form.setError('email', { type: 'custom', message: 'Already taken' })
      expect(emailError.value).toBe('Already taken')
    })

    it('should handle setError with simple message', () => {
      const form = useForm({
        schema,
        defaultValues: { email: 'a@b.com', name: 'John' },
      })

      const emailError = useFieldError({ control: form, name: 'email' })

      form.setError('email', { message: 'Server error' })
      expect(emailError.value).toBe('Server error')
    })
  })

  describe('exports', () => {
    it('should export useFieldError from index', async () => {
      const exports = await import('../../index')
      expect(exports.useFieldError).toBeDefined()
    })
  })
})
