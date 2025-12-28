import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../../useForm'
import { nextTick } from 'vue'
import { schemas, createInputEvent, createBlurEvent } from '../helpers/test-utils'

const schema = schemas.basicWithAge
const nestedSchema = schemas.nestedWithMessages

describe('controlled inputs', () => {
  let mockInput: HTMLInputElement
  let mockInput2: HTMLInputElement
  let mockCheckbox: HTMLInputElement

  beforeEach(() => {
    mockInput = document.createElement('input')
    mockInput.type = 'text'
    document.body.appendChild(mockInput)

    mockInput2 = document.createElement('input')
    mockInput2.type = 'text'
    document.body.appendChild(mockInput2)

    mockCheckbox = document.createElement('input')
    mockCheckbox.type = 'checkbox'
    document.body.appendChild(mockCheckbox)
  })

  afterEach(() => {
    document.body.removeChild(mockInput)
    document.body.removeChild(mockInput2)
    document.body.removeChild(mockCheckbox)
    vi.restoreAllMocks()
  })

  describe('validation integration', () => {
    describe('onChange mode', () => {
      it('should validate controlled field on input event', async () => {
        const { register, formState } = useForm({
          schema,
          mode: 'onChange',
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        // Set value and trigger input event
        mockInput.value = 'invalid'
        await emailField.onInput(createInputEvent(mockInput))

        expect(formState.value.errors.email).toBe('Invalid email')
      })

      it('should clear error when controlled value becomes valid', async () => {
        const { register, formState } = useForm({
          schema,
          mode: 'onChange',
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        // Make invalid via input event
        mockInput.value = 'invalid'
        await emailField.onInput(createInputEvent(mockInput))
        expect(formState.value.errors.email).toBeDefined()

        // Make valid via input event
        mockInput.value = 'valid@example.com'
        await emailField.onInput(createInputEvent(mockInput))
        expect(formState.value.errors.email).toBeUndefined()
      })
    })

    describe('onBlur mode', () => {
      it('should validate controlled field on blur', async () => {
        const { register, formState } = useForm({
          schema,
          mode: 'onBlur',
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        // Set value via input (doesn't validate in onBlur mode)
        mockInput.value = 'invalid'
        await emailField.onInput(createInputEvent(mockInput))

        // No error before blur
        expect(formState.value.errors.email).toBeUndefined()

        await emailField.onBlur(createBlurEvent(mockInput))
        expect(formState.value.errors.email).toBe('Invalid email')
      })

      it('should not validate on input event alone in onBlur mode', async () => {
        const { register, formState } = useForm({
          schema,
          mode: 'onBlur',
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        // Input event should not trigger validation in onBlur mode
        mockInput.value = 'invalid'
        await emailField.onInput(createInputEvent(mockInput))

        expect(formState.value.errors.email).toBeUndefined()
      })
    })

    describe('trigger()', () => {
      it('should trigger validation for controlled fields', async () => {
        const { register, formState, trigger, setValue } = useForm({ schema })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        // Use setValue to update form data
        setValue('email', 'invalid')
        await nextTick()

        await trigger('email')

        expect(formState.value.errors.email).toBe('Invalid email')
      })

      it('should return validation result for controlled field', async () => {
        const { register, trigger, setValue } = useForm({ schema })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'invalid')
        await nextTick()

        const isValid = await trigger('email')
        expect(isValid).toBe(false)

        setValue('email', 'valid@example.com')
        await nextTick()

        const isValidNow = await trigger('email')
        expect(isValidNow).toBe(true)
      })
    })

    describe('error display', () => {
      it('should display errors for controlled fields', async () => {
        const { register, formState, validate, setValue } = useForm({ schema })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'invalid')
        await nextTick()
        await validate('email')

        expect(formState.value.errors.email).toBe('Invalid email')
      })

      it('should clear controlled field errors via clearErrors()', async () => {
        const { register, formState, validate, clearErrors, setValue } = useForm({
          schema,
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'invalid')
        await nextTick()
        await validate('email')
        expect(formState.value.errors.email).toBeDefined()

        clearErrors('email')
        expect(formState.value.errors.email).toBeUndefined()
      })
    })
  })

  describe('reset operations', () => {
    it('should reset controlled field to default value', async () => {
      const { register, getValues, reset, setValue } = useForm({
        schema,
        defaultValues: { email: 'initial@test.com', password: '', name: '' },
      })

      const emailField = register('email', { controlled: true })
      emailField.ref(mockInput)

      setValue('email', 'changed@test.com')
      await nextTick()
      expect(getValues('email')).toBe('changed@test.com')

      reset()
      await nextTick()

      expect(getValues('email')).toBe('initial@test.com')
      expect(emailField.value!.value).toBe('initial@test.com')
    })

    it('should reset controlled field to new values via reset(newValues)', async () => {
      const { register, getValues, reset } = useForm({
        schema,
        defaultValues: { email: 'initial@test.com', password: '', name: '' },
      })

      const emailField = register('email', { controlled: true })
      emailField.ref(mockInput)

      reset({ email: 'new@test.com', password: 'newpassword', name: 'John' })
      await nextTick()

      expect(getValues('email')).toBe('new@test.com')
      expect(emailField.value!.value).toBe('new@test.com')
    })

    describe('resetField()', () => {
      it('should reset individual controlled field', async () => {
        const { register, getValues, resetField, setValue } = useForm({
          schema,
          defaultValues: { email: 'initial@test.com', password: '', name: '' },
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'changed@test.com')
        await nextTick()

        resetField('email')
        await nextTick()

        expect(getValues('email')).toBe('initial@test.com')
      })

      it('should preserve error when keepError: true for controlled field', async () => {
        const { register, formState, validate, resetField, setValue } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'invalid')
        await nextTick()
        await validate('email')
        expect(formState.value.errors.email).toBeDefined()

        resetField('email', { keepError: true })
        await nextTick()

        expect(formState.value.errors.email).toBeDefined()
      })

      it('should preserve dirty state when keepDirty: true for controlled field', async () => {
        const { register, formState, resetField, setValue } = useForm({
          schema,
          defaultValues: { email: 'initial@test.com', password: '', name: '' },
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'changed@test.com', { shouldDirty: true })
        await nextTick()
        expect(formState.value.dirtyFields.email).toBe(true)

        resetField('email', { keepDirty: true })
        await nextTick()

        expect(formState.value.dirtyFields.email).toBe(true)
      })

      it('should update default value for controlled field', async () => {
        const { register, getValues, resetField, reset, setValue } = useForm({
          schema,
          defaultValues: { email: 'initial@test.com', password: '', name: '' },
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        resetField('email', { defaultValue: 'newdefault@test.com' })
        await nextTick()

        expect(getValues('email')).toBe('newdefault@test.com')

        // After a full reset, should use the new default
        setValue('email', 'something@test.com')
        await nextTick()

        reset()
        await nextTick()

        expect(getValues('email')).toBe('newdefault@test.com')
      })
    })
  })

  describe('form method integration', () => {
    describe('getValues()', () => {
      it('should return controlled field value via getValues()', async () => {
        const { register, getValues, setValue } = useForm({ schema })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'test@example.com')
        await nextTick()

        expect(getValues('email')).toBe('test@example.com')
      })

      it('should include controlled fields in getValues() without args', async () => {
        const { register, getValues, setValue } = useForm({
          schema,
          defaultValues: { email: '', password: 'secret', name: 'John' },
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'controlled@test.com')
        await nextTick()

        const values = getValues()
        expect(values.email).toBe('controlled@test.com')
        expect(values.password).toBe('secret')
        expect(values.name).toBe('John')
      })
    })

    describe('setValue()', () => {
      it('should update controlled field via setValue()', async () => {
        const { register, setValue, getValues } = useForm({ schema })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'set@test.com')
        await nextTick()

        expect(getValues('email')).toBe('set@test.com')
        expect(emailField.value!.value).toBe('set@test.com')
      })

      it('should not update DOM for controlled inputs', async () => {
        const { register, setValue } = useForm({ schema })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        // Set initial DOM value
        mockInput.value = 'dom@test.com'

        setValue('email', 'controlled@test.com')
        await nextTick()

        // DOM should not be updated for controlled inputs
        // (controlled inputs use v-model, not DOM manipulation)
        expect(emailField.value!.value).toBe('controlled@test.com')
      })

      it('should trigger validation when shouldValidate: true', async () => {
        const { register, setValue, formState } = useForm({ schema })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'invalid', { shouldValidate: true })

        // Wait for async validation to complete
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(formState.value.errors.email).toBe('Invalid email')
      })
    })

    describe('watch()', () => {
      it('should track controlled field changes', async () => {
        const { register, watch, setValue } = useForm({
          schema,
          defaultValues: { email: 'initial@test.com', password: '', name: '' },
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        const watchedEmail = watch('email')
        expect(watchedEmail.value).toBe('initial@test.com')

        setValue('email', 'changed@test.com')
        await nextTick()

        expect(watchedEmail.value).toBe('changed@test.com')
      })

      it('should react to setValue changes', async () => {
        const { register, watch, setValue } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        const watchedEmail = watch('email')

        // Watch for changes
        const values: string[] = []
        values.push(watchedEmail.value as string)

        setValue('email', 'first@test.com')
        await nextTick()
        values.push(watchedEmail.value as string)

        setValue('email', 'second@test.com')
        await nextTick()
        values.push(watchedEmail.value as string)

        expect(values).toEqual(['', 'first@test.com', 'second@test.com'])
      })
    })

    describe('error management', () => {
      it('should set error on controlled field via setError()', () => {
        const { register, setError, formState } = useForm({ schema })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        // setError takes an ErrorOption object
        setError('email', { message: 'Custom error message' })

        // setError is synchronous
        expect(formState.value.errors.email).toBe('Custom error message')
      })

      it('should clear controlled field error via clearErrors()', () => {
        const { register, setError, clearErrors, formState } = useForm({
          schema,
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setError('email', { message: 'Error' })
        expect(formState.value.errors.email).toBe('Error')

        clearErrors('email')
        expect(formState.value.errors.email).toBeUndefined()
      })
    })

    describe('getFieldState()', () => {
      it('should report isDirty for controlled field', async () => {
        const { register, getFieldState, setValue } = useForm({
          schema,
          defaultValues: { email: 'initial@test.com', password: '', name: '' },
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        expect(getFieldState('email').isDirty).toBe(false)

        setValue('email', 'changed@test.com', { shouldDirty: true })
        await nextTick()

        expect(getFieldState('email').isDirty).toBe(true)
      })

      it('should report isTouched for controlled field after blur', async () => {
        const { register, getFieldState } = useForm({ schema })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        expect(getFieldState('email').isTouched).toBe(false)

        await emailField.onBlur(createBlurEvent(mockInput))

        expect(getFieldState('email').isTouched).toBe(true)
      })

      it('should report invalid and error for controlled field', async () => {
        const { register, getFieldState, validate, setValue } = useForm({
          schema,
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'invalid')
        await nextTick()
        await validate('email')

        const state = getFieldState('email')
        expect(state.invalid).toBe(true)
        expect(state.error).toBe('Invalid email')
      })
    })
  })

  describe('input types', () => {
    it('should handle controlled text input', async () => {
      const { register, getValues, setValue } = useForm({ schema })

      const emailField = register('email', { controlled: true })
      emailField.ref(mockInput)

      setValue('email', 'text@test.com')
      await nextTick()

      expect(getValues('email')).toBe('text@test.com')
    })

    it('should handle controlled checkbox (boolean value)', async () => {
      const { register, getValues, setValue } = useForm({ schema })

      const rememberField = register('rememberMe', { controlled: true })
      rememberField.ref(mockCheckbox)

      setValue('rememberMe', true)
      await nextTick()

      expect(getValues('rememberMe')).toBe(true)

      setValue('rememberMe', false)
      await nextTick()

      expect(getValues('rememberMe')).toBe(false)
    })

    it('should handle controlled number input with coercion', async () => {
      const { register, getValues, setValue } = useForm({ schema })

      const ageField = register('age', { controlled: true })
      ageField.ref(mockInput)

      setValue('age', 25)
      await nextTick()

      expect(getValues('age')).toBe(25)
    })

    it('should handle controlled input with initial default value', async () => {
      const { register, getValues } = useForm({
        schema,
        defaultValues: { email: 'default@test.com', password: '', name: '' },
      })

      const emailField = register('email', { controlled: true })
      emailField.ref(mockInput)

      expect(emailField.value!.value).toBe('default@test.com')
      expect(getValues('email')).toBe('default@test.com')
    })

    it('should handle nested path controlled fields', async () => {
      const { register, getValues, setValue } = useForm({
        schema: nestedSchema,
        defaultValues: { user: { email: '', profile: { bio: '' } } },
      })

      const emailField = register('user.email', { controlled: true })
      emailField.ref(mockInput)

      setValue('user.email', 'nested@test.com')
      await nextTick()

      expect(getValues('user.email')).toBe('nested@test.com')
    })
  })

  describe('mixed controlled/uncontrolled forms', () => {
    it('should handle both controlled and uncontrolled fields in same form', async () => {
      const { register, getValues, setValue } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      // Controlled field
      const emailField = register('email', { controlled: true })
      emailField.ref(mockInput)

      // Uncontrolled field
      const passwordField = register('password')
      passwordField.ref(mockInput2)

      // Update controlled via setValue
      setValue('email', 'controlled@test.com')
      await nextTick()

      // Update uncontrolled
      mockInput2.value = 'uncontrolled123'
      await passwordField.onInput(createInputEvent(mockInput2))

      expect(getValues('email')).toBe('controlled@test.com')
      expect(getValues('password')).toBe('uncontrolled123')
    })

    it('should validate mixed form correctly on submit', async () => {
      const onValid = vi.fn()
      const { register, handleSubmit, formState, setValue } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      // Controlled - set invalid value
      const emailField = register('email', { controlled: true })
      emailField.ref(mockInput)
      setValue('email', 'invalid')
      await nextTick()

      // Uncontrolled
      const passwordField = register('password')
      passwordField.ref(mockInput2)
      mockInput2.value = 'short'
      await passwordField.onInput(createInputEvent(mockInput2))

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(onValid).not.toHaveBeenCalled()
      expect(formState.value.errors.email).toBeDefined()
      expect(formState.value.errors.password).toBeDefined()
    })

    it('should collect values correctly from mixed form on submit', async () => {
      const onValid = vi.fn()
      const { register, handleSubmit, setValue } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '' },
      })

      // Controlled
      const emailField = register('email', { controlled: true })
      emailField.ref(mockInput)
      setValue('email', 'valid@test.com')
      await nextTick()

      // Uncontrolled
      const passwordField = register('password')
      passwordField.ref(mockInput2)
      mockInput2.value = 'validpassword'
      await passwordField.onInput(createInputEvent(mockInput2))

      // Name field
      const nameInput = document.createElement('input')
      document.body.appendChild(nameInput)
      const nameField = register('name')
      nameField.ref(nameInput)
      nameInput.value = 'John'
      await nameField.onInput(createInputEvent(nameInput))

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(onValid).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'valid@test.com',
          password: 'validpassword',
          name: 'John',
        }),
      )

      document.body.removeChild(nameInput)
    })

    it('should reset mixed form correctly', async () => {
      const { register, getValues, reset, setValue } = useForm({
        schema,
        defaultValues: {
          email: 'default@test.com',
          password: 'defaultpass',
          name: '',
        },
      })

      // Controlled
      const emailField = register('email', { controlled: true })
      emailField.ref(mockInput)
      setValue('email', 'changed@test.com')
      await nextTick()

      // Uncontrolled
      const passwordField = register('password')
      passwordField.ref(mockInput2)
      mockInput2.value = 'changedpass'
      await passwordField.onInput(createInputEvent(mockInput2))

      reset()
      await nextTick()

      expect(getValues('email')).toBe('default@test.com')
      expect(emailField.value!.value).toBe('default@test.com')
      expect(getValues('password')).toBe('defaultpass')
    })
  })

  describe('edge cases', () => {
    describe('shouldUnregister', () => {
      it('should clean up controlled field data when shouldUnregister: true', async () => {
        const { register, getValues, formState, setValue } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        const emailField = register('email', {
          controlled: true,
          shouldUnregister: true,
        })
        emailField.ref(mockInput)

        setValue('email', 'test@test.com', { shouldDirty: true })
        await nextTick()
        expect(getValues('email')).toBe('test@test.com')
        expect(formState.value.dirtyFields.email).toBe(true)

        // Simulate unmount
        emailField.ref(null)

        expect(getValues('email')).toBeUndefined()
        expect(formState.value.dirtyFields.email).toBeUndefined()
      })

      it('should preserve controlled field data without shouldUnregister', async () => {
        const { register, getValues, setValue } = useForm({
          schema,
          defaultValues: { email: '', password: '', name: '' },
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        setValue('email', 'test@test.com')
        await nextTick()

        // Simulate unmount
        emailField.ref(null)

        expect(getValues('email')).toBe('test@test.com')
      })
    })

    describe('custom validate function', () => {
      it('should run custom validation on controlled field', async () => {
        const customValidator = vi.fn().mockReturnValue(undefined)
        const { register } = useForm({
          schema,
          mode: 'onChange',
        })

        const emailField = register('email', {
          controlled: true,
          validate: customValidator,
        })
        emailField.ref(mockInput)

        // Use input event to trigger onChange validation
        mockInput.value = 'test@example.com'
        await emailField.onInput(createInputEvent(mockInput))

        expect(customValidator).toHaveBeenCalledWith('test@example.com')
      })

      it('should handle async custom validation on controlled field', async () => {
        const { register, formState } = useForm({
          schema,
          mode: 'onChange',
        })

        const emailField = register('email', {
          controlled: true,
          validate: async (value) => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            return value === 'taken@test.com' ? 'Email already taken' : undefined
          },
        })
        emailField.ref(mockInput)

        // Use input event to trigger validation
        mockInput.value = 'taken@test.com'
        await emailField.onInput(createInputEvent(mockInput))
        // Wait for async validation
        await new Promise((resolve) => setTimeout(resolve, 20))

        expect(formState.value.errors.email).toBe('Email already taken')
      })
    })

    describe('deps option', () => {
      it('should accept deps option for controlled fields', async () => {
        // deps option specifies fields that should be re-validated when this field changes
        const { register, getValues } = useForm({
          schema,
          mode: 'onChange',
          defaultValues: { email: '', password: '', name: '' },
        })

        // Register with deps option - should not throw
        const emailField = register('email', {
          controlled: true,
          deps: ['name', 'password'],
        })
        emailField.ref(mockInput)

        const nameField = register('name', { controlled: true })
        nameField.ref(mockInput2)

        // Both fields should work correctly
        mockInput.value = 'test@example.com'
        await emailField.onInput(createInputEvent(mockInput))

        mockInput2.value = 'John'
        await nameField.onInput(createInputEvent(mockInput2))

        expect(getValues('email')).toBe('test@example.com')
        expect(getValues('name')).toBe('John')
      })
    })

    describe('rapid value changes', () => {
      it('should handle rapid controlled value changes', async () => {
        const { register, getValues, setValue } = useForm({
          schema,
          mode: 'onChange',
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        // Simulate rapid typing using setValue
        const inputs = ['t', 'te', 'tes', 'test', 'test@', 'test@e', 'test@ex.com']

        for (const input of inputs) {
          setValue('email', input)
          await nextTick()
        }

        expect(getValues('email')).toBe('test@ex.com')
      })

      it('should maintain consistency after multiple rapid updates', async () => {
        const { register, getValues, watch, setValue } = useForm({
          schema,
          mode: 'onChange',
        })

        const emailField = register('email', { controlled: true })
        emailField.ref(mockInput)

        const watchedEmail = watch('email')

        // Rapid updates using setValue
        for (let i = 0; i < 10; i++) {
          setValue('email', `test${i}@example.com`)
          await nextTick()
        }

        const finalValue = 'test9@example.com'
        expect(getValues('email')).toBe(finalValue)
        expect(emailField.value!.value).toBe(finalValue)
        expect(watchedEmail.value).toBe(finalValue)
      })
    })

    describe('disabled state', () => {
      it('should skip validation when controlled field is disabled', async () => {
        const customValidator = vi.fn().mockReturnValue('Error')
        const { register, formState } = useForm({
          schema,
          mode: 'onChange',
        })

        const emailField = register('email', {
          controlled: true,
          validate: customValidator,
          disabled: true,
        })
        emailField.ref(mockInput)

        // Use input event - but disabled fields should skip validation
        mockInput.value = 'test@example.com'
        await emailField.onInput(createInputEvent(mockInput))

        expect(customValidator).not.toHaveBeenCalled()
        expect(formState.value.errors.email).toBeUndefined()
      })
    })
  })
})
