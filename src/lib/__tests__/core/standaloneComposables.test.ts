import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { useForm } from '../../useForm'
import { useWatch } from '../../useWatch'
import { useController } from '../../useController'
import { useFormState } from '../../useFormState'

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
      expect(form.getValue('email')).toBe('new@example.com')
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
      expect(form.getValue('email')).toBe('changed@example.com')

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
