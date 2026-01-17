import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useForm } from '../../useForm'
import { z } from 'zod'
import { schemas } from '../helpers/test-utils'

const schema = schemas.basic

describe('useForm - values', () => {
  describe('getValues', () => {
    it('should return all form values', () => {
      const defaultValues = {
        email: 'test@example.com',
        name: 'John',
        password: 'password123',
      }
      const { getValues } = useForm({ schema, defaultValues })

      const values = getValues()

      expect(values).toEqual(defaultValues)
    })

    it('should return value for a specific field', () => {
      const { getValues } = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John', password: 'pass1234' },
      })

      expect(getValues('email')).toBe('test@example.com')
    })

    it('should return object with specified field values', () => {
      const { getValues } = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John', password: 'pass1234' },
      })

      const values = getValues(['email', 'name'])

      expect(values).toEqual({
        email: 'test@example.com',
        name: 'John',
      })
    })

    it('should return updated values after setValue', () => {
      const { getValues, setValue } = useForm({ schema })

      setValue('email', 'new@example.com')

      expect(getValues('email')).toBe('new@example.com')
    })
  })

  describe('getFieldState', () => {
    it('should return clean state for untouched field', () => {
      const { getFieldState } = useForm({ schema })

      const state = getFieldState('email')

      expect(state).toEqual({
        isDirty: false,
        isTouched: false,
        invalid: false,
        error: undefined,
      })
    })

    it('should return isDirty: true after setValue', () => {
      const { getFieldState, setValue } = useForm({ schema })

      setValue('email', 'test@example.com')

      expect(getFieldState('email').isDirty).toBe(true)
    })

    it('should track dirty state independently per field', () => {
      const { getFieldState, setValue } = useForm({ schema })

      setValue('email', 'test@example.com')

      expect(getFieldState('email').isDirty).toBe(true)
      expect(getFieldState('password').isDirty).toBe(false)
    })

    it('should return invalid: true and error message when field has error', async () => {
      const { getFieldState, validate } = useForm({ schema })

      await validate()

      const state = getFieldState('email')
      expect(state.invalid).toBe(true)
      expect(state.error).toBeDefined()
      expect(typeof state.error).toBe('string')
    })

    it('should update after setError', () => {
      const { getFieldState, setError } = useForm({ schema })

      setError('email', { message: 'Custom error' })

      const state = getFieldState('email')
      expect(state.invalid).toBe(true)
      expect(state.error).toBe('Custom error')
    })

    it('should update after clearErrors', async () => {
      const { getFieldState, validate, clearErrors } = useForm({ schema })

      await validate()
      expect(getFieldState('email').invalid).toBe(true)

      clearErrors('email')

      expect(getFieldState('email').invalid).toBe(false)
      expect(getFieldState('email').error).toBeUndefined()
    })
  })

  describe('getFieldState reactivity (non-reactive behavior)', () => {
    it('should demonstrate that getFieldState returns snapshots, not reactive refs', async () => {
      const { getFieldState, setValue } = useForm({
        schema,
        mode: 'onChange',
      })

      // Get initial state (snapshot #1)
      const initialState = getFieldState('email')
      expect(initialState.invalid).toBe(false)
      expect(initialState.error).toBeUndefined()

      // Set invalid value and validate
      setValue('email', 'invalid-email', { shouldValidate: true })
      await new Promise((resolve) => setTimeout(resolve, 10))

      // The SAME object still shows old values (not reactive)
      expect(initialState.invalid).toBe(false)
      expect(initialState.error).toBeUndefined()

      // But calling getFieldState AGAIN returns new snapshot with updated values
      const updatedState = getFieldState('email')
      expect(updatedState.invalid).toBe(true)
      expect(updatedState.error).toBeDefined()
    })

    it('should show that error persists in snapshot even after fixing the input', async () => {
      const { getFieldState, setValue } = useForm({
        schema,
        mode: 'onChange',
      })

      // Set invalid value and validate
      setValue('email', 'invalid', { shouldValidate: true })
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Get error state (snapshot with error)
      const stateWithError = getFieldState('email')
      expect(stateWithError.invalid).toBe(true)
      expect(stateWithError.error).toBeDefined()

      // Fix the value
      setValue('email', 'valid@example.com', { shouldValidate: true })
      await new Promise((resolve) => setTimeout(resolve, 10))

      // The snapshot still shows the OLD error (not reactive!)
      expect(stateWithError.invalid).toBe(true) // Still true!
      expect(stateWithError.error).toBeDefined() // Still has error!

      // But calling getFieldState again returns correct state
      const fixedState = getFieldState('email')
      expect(fixedState.invalid).toBe(false)
      expect(fixedState.error).toBeUndefined()
    })

    it('should demonstrate correct reactive pattern using formState.value.errors', async () => {
      const { formState, setValue } = useForm({
        schema,
        mode: 'onChange',
      })

      // Initially no errors
      expect(formState.value.errors.email).toBeUndefined()

      // Set invalid value
      setValue('email', 'invalid', { shouldValidate: true })
      await new Promise((resolve) => setTimeout(resolve, 10))

      // formState.value.errors is reactive - shows error
      expect(formState.value.errors.email).toBeDefined()

      // Fix the value
      setValue('email', 'valid@example.com', { shouldValidate: true })
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Error is automatically cleared (reactive!)
      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should show formState reactively updates dirty state', () => {
      const { formState, setValue } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      // Store reference to formState.value (accessing computed)
      expect(formState.value.dirtyFields.email).toBeUndefined()
      expect(formState.value.isDirty).toBe(false)

      // Make changes
      setValue('email', 'test@example.com')

      // formState.value updates reactively
      expect(formState.value.dirtyFields.email).toBe(true)
      expect(formState.value.isDirty).toBe(true)
    })

    it('should show formState reactively updates touched state', async () => {
      const { register, formState } = useForm({ schema })

      const mockInput = document.createElement('input')
      const emailField = register('email')
      emailField.ref(mockInput)

      // Initially not touched
      expect(formState.value.touchedFields.email).toBeUndefined()

      // Trigger blur event
      await emailField.onBlur(new Event('blur'))

      // formState.value updates reactively
      expect(formState.value.touchedFields.email).toBe(true)
    })
  })

  describe('setFocus', () => {
    let mockInput: HTMLInputElement
    let focusSpy: ReturnType<typeof vi.spyOn>
    let selectSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      mockInput = document.createElement('input')
      mockInput.type = 'text'
      document.body.appendChild(mockInput)

      focusSpy = vi.spyOn(mockInput, 'focus')
      selectSpy = vi.spyOn(mockInput, 'select')
    })

    afterEach(() => {
      document.body.removeChild(mockInput)
      vi.restoreAllMocks()
    })

    it('should focus the specified field', () => {
      const { register, setFocus } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      setFocus('email')

      expect(focusSpy).toHaveBeenCalled()
    })

    it('should not throw when field ref is null', () => {
      const { setFocus } = useForm({ schema })

      expect(() => setFocus('email')).not.toThrow()
    })

    it('should select text when shouldSelect is true', () => {
      const { register, setFocus } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      setFocus('email', { shouldSelect: true })

      expect(focusSpy).toHaveBeenCalled()
      expect(selectSpy).toHaveBeenCalled()
    })

    it('should not select text when shouldSelect is false', () => {
      const { register, setFocus } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      setFocus('email', { shouldSelect: false })

      expect(focusSpy).toHaveBeenCalled()
      expect(selectSpy).not.toHaveBeenCalled()
    })
  })

  describe('setValue options', () => {
    let mockInput: HTMLInputElement
    let cleanup: () => void

    beforeEach(() => {
      mockInput = document.createElement('input')
      mockInput.type = 'text'
      document.body.appendChild(mockInput)
      cleanup = () => document.body.removeChild(mockInput)
    })

    afterEach(() => {
      cleanup()
    })

    it('should mark field dirty by default', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'test@test.com')
      expect(formState.value.dirtyFields.email).toBe(true)
    })

    it('should not mark dirty when shouldDirty: false', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'test@test.com', { shouldDirty: false })
      expect(formState.value.dirtyFields.email).toBeUndefined()
    })

    it('should trigger validation when shouldValidate: true', async () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'invalid-email', { shouldValidate: true })

      // Wait for async validation to complete
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(formState.value.errors.email).toBeDefined()
    })

    it('should not trigger validation by default', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'invalid-email')
      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should mark touched when shouldTouch: true', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'test@test.com', { shouldTouch: true })
      expect(formState.value.touchedFields.email).toBe(true)
    })

    it('should not mark touched by default', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'test@test.com')
      expect(formState.value.touchedFields.email).toBeUndefined()
    })

    it('should update silently with all options false', () => {
      const { setValue, getValues, formState } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      setValue('email', 'silent@test.com', {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      })

      // Value should be updated
      expect(getValues('email')).toBe('silent@test.com')
      // But no state changes
      expect(formState.value.dirtyFields.email).toBeUndefined()
      expect(formState.value.touchedFields.email).toBeUndefined()
      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should update DOM element for uncontrolled inputs', () => {
      const { register, setValue } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      setValue('email', 'updated@test.com')
      expect(mockInput.value).toBe('updated@test.com')
    })

    it('should update DOM for Vue component with $el as input', () => {
      const { register, setValue } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      // Simulate PrimeVue InputText: component.$el = <input>
      const actualInput = document.createElement('input')
      const mockVueComponent = { $el: actualInput }

      const emailField = register('email')
      emailField.ref(mockVueComponent)

      setValue('email', 'primevue@test.com')
      expect(actualInput.value).toBe('primevue@test.com')
    })

    it('should find input inside wrapped Vue component container', () => {
      const { register, setValue } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      // Simulate wrapper component: component.$el = <div><input></div>
      const container = document.createElement('div')
      const actualInput = document.createElement('input')
      container.appendChild(actualInput)
      const mockWrapperComponent = { $el: container }

      const emailField = register('email')
      emailField.ref(mockWrapperComponent)

      setValue('email', 'wrapped@test.com')
      expect(actualInput.value).toBe('wrapped@test.com')
    })
  })

  describe('values prop', () => {
    it('should sync external values to form', async () => {
      const valuesSchema = z.object({
        name: z.string(),
        email: z.string(),
      })
      const externalValues = ref({ name: 'Initial', email: 'test@example.com' })

      const { getValues } = useForm({
        schema: valuesSchema,
        values: externalValues,
      })

      expect(getValues('name')).toBe('Initial')
      expect(getValues('email')).toBe('test@example.com')
    })

    it('should update form when external values change', async () => {
      const valuesSchema = z.object({
        name: z.string(),
      })
      const externalValues = ref({ name: 'Initial' })

      const { getValues } = useForm({
        schema: valuesSchema,
        values: externalValues,
      })

      expect(getValues('name')).toBe('Initial')

      // Update external values
      externalValues.value = { name: 'Updated' }
      await nextTick()

      expect(getValues('name')).toBe('Updated')
    })

    it('should not mark fields as dirty when values prop updates', async () => {
      const valuesSchema = z.object({
        name: z.string(),
      })
      const externalValues = ref({ name: 'Initial' })

      const { formState, getValues } = useForm({
        schema: valuesSchema,
        values: externalValues,
      })

      expect(formState.value.isDirty).toBe(false)

      // Update external values
      externalValues.value = { name: 'Updated' }
      await nextTick()

      // Form should not be dirty from external sync
      expect(formState.value.isDirty).toBe(false)
      expect(getValues('name')).toBe('Updated')
    })
  })

  describe('errors prop', () => {
    it('should merge external errors with validation errors', async () => {
      const errorsSchema = z.object({
        email: z.email('Invalid email'),
        username: z.string().min(3, 'Too short'),
      })
      const externalErrors = ref({
        username: 'Username already taken',
      })

      const { formState, setValue, validate } = useForm({
        schema: errorsSchema,
        errors: externalErrors,
      })

      // Set invalid email to trigger validation error
      setValue('email', 'invalid')
      await validate()

      // Both validation and external errors should be present
      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.username).toBe('Username already taken')
    })

    it('should update when external errors change', async () => {
      const errorsSchema = z.object({
        username: z.string(),
      })
      const externalErrors = ref<Record<string, string>>({})

      const { formState } = useForm({
        schema: errorsSchema,
        errors: externalErrors,
      })

      expect(formState.value.errors.username).toBeUndefined()

      // Add external error
      externalErrors.value = { username: 'Server error' }
      await nextTick()

      expect(formState.value.errors.username).toBe('Server error')

      // Clear external error
      externalErrors.value = {}
      await nextTick()

      expect(formState.value.errors.username).toBeUndefined()
    })

    it('should allow external errors to override validation errors', async () => {
      const errorsSchema = z.object({
        email: z.email('Invalid email format'),
      })
      const externalErrors = ref({
        email: 'Email already registered',
      })

      const { formState, setValue, validate } = useForm({
        schema: errorsSchema,
        errors: externalErrors,
      })

      setValue('email', 'invalid')
      await validate()

      // External error should take precedence (appears after merge)
      expect(formState.value.errors.email).toBe('Email already registered')
    })
  })
})
