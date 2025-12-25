import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../useForm'
import { z } from 'zod'
import {
  createMockInput,
  createInputEvent,
  createBlurEvent,
  mountElement,
} from './test-utils'

describe('integration tests', () => {
  let mockInputs: HTMLInputElement[] = []
  let cleanups: Array<() => void> = []

  function createAndMountInput(): HTMLInputElement {
    const input = createMockInput()
    cleanups.push(mountElement(input))
    mockInputs.push(input)
    return input
  }

  beforeEach(() => {
    mockInputs = []
    cleanups = []
  })

  afterEach(() => {
    cleanups.forEach((cleanup) => cleanup())
    vi.restoreAllMocks()
  })

  describe('complete form lifecycle', () => {
    const schema = z.object({
      email: z.string().email('Invalid email'),
      password: z.string().min(8, 'Password too short'),
      confirmPassword: z.string(),
    })

    it('should handle fill → validate → fix errors → submit workflow', async () => {
      const emailInput = createAndMountInput()
      const passwordInput = createAndMountInput()
      const confirmInput = createAndMountInput()

      const onSubmit = vi.fn()
      const { register, handleSubmit, formState } = useForm(
        {
          schema,
          defaultValues: { email: '', password: '', confirmPassword: '' },
        },
      )

      // Register fields
      const emailField = register('email')
      const passwordField = register('password')
      const confirmField = register('confirmPassword')

      emailField.ref(emailInput)
      passwordField.ref(passwordInput)
      confirmField.ref(confirmInput)

      // Step 1: Fill with invalid data
      emailInput.value = 'invalid-email'
      await emailField.onInput(createInputEvent(emailInput))

      passwordInput.value = 'short'
      await passwordField.onInput(createInputEvent(passwordInput))

      // Step 2: Try to submit - should fail
      const submitHandler = handleSubmit(onSubmit)
      await submitHandler(new Event('submit'))

      expect(onSubmit).not.toHaveBeenCalled()
      expect(formState.value.errors.email).toBe('Invalid email')
      expect(formState.value.errors.password).toBe('Password too short')
      expect(formState.value.submitCount).toBe(1)

      // Step 3: Fix errors
      emailInput.value = 'valid@email.com'
      await emailField.onInput(createInputEvent(emailInput))

      passwordInput.value = 'validpassword123'
      await passwordField.onInput(createInputEvent(passwordInput))

      confirmInput.value = 'validpassword123'
      await confirmField.onInput(createInputEvent(confirmInput))

      // Step 4: Submit again - should succeed
      await submitHandler(new Event('submit'))

      expect(onSubmit).toHaveBeenCalledWith({
        email: 'valid@email.com',
        password: 'validpassword123',
        confirmPassword: 'validpassword123',
      })
      expect(formState.value.submitCount).toBe(2)
    })

    it('should track dirty and touched states throughout lifecycle', async () => {
      const emailInput = createAndMountInput()

      const { register, formState, reset } = useForm({
        schema,
        defaultValues: { email: '', password: '', confirmPassword: '' },
      })

      const emailField = register('email')
      emailField.ref(emailInput)

      // Initially clean
      expect(formState.value.isDirty).toBe(false)
      expect(formState.value.touchedFields.email).toBeUndefined()
      expect(formState.value.dirtyFields.email).toBeUndefined()

      // After input - dirty but not touched
      emailInput.value = 'test@test.com'
      await emailField.onInput(createInputEvent(emailInput))

      expect(formState.value.isDirty).toBe(true)
      expect(formState.value.dirtyFields.email).toBe(true)
      expect(formState.value.touchedFields.email).toBeUndefined()

      // After blur - touched
      await emailField.onBlur(createBlurEvent(emailInput))

      expect(formState.value.touchedFields.email).toBe(true)

      // After reset - clean again
      reset()

      expect(formState.value.isDirty).toBe(false)
      expect(formState.value.dirtyFields.email).toBeUndefined()
      expect(formState.value.touchedFields.email).toBeUndefined()
    })
  })

  describe('form with field arrays and nested objects', () => {
    const complexSchema = z.object({
      title: z.string().min(1),
      users: z.array(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          address: z.object({
            city: z.string().min(1),
            country: z.string().min(1),
          }),
        }),
      ),
    })

    it('should handle nested objects in field arrays', async () => {
      const titleInput = createAndMountInput()

      const { register, fields, handleSubmit } = useForm({
        schema: complexSchema,
        defaultValues: {
          title: '',
          users: [],
        },
      })

      const titleField = register('title')
      titleField.ref(titleInput)

      titleInput.value = 'Team Members'
      await titleField.onInput(createInputEvent(titleInput))

      // Add users with nested addresses
      const usersArray = fields('users')
      usersArray.append({
        name: 'John Doe',
        email: 'john@test.com',
        address: { city: 'New York', country: 'USA' },
      })
      usersArray.append({
        name: 'Jane Smith',
        email: 'jane@test.com',
        address: { city: 'London', country: 'UK' },
      })

      const onSubmit = vi.fn()
      const submitHandler = handleSubmit(onSubmit)
      await submitHandler(new Event('submit'))

      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Team Members',
        users: [
          {
            name: 'John Doe',
            email: 'john@test.com',
            address: { city: 'New York', country: 'USA' },
          },
          {
            name: 'Jane Smith',
            email: 'jane@test.com',
            address: { city: 'London', country: 'UK' },
          },
        ],
      })
    })

    it('should validate nested fields in arrays', async () => {
      const titleInput = createAndMountInput()

      const { register, fields, validate, formState } = useForm({
        schema: complexSchema,
        defaultValues: {
          title: '',
          users: [],
        },
      })

      const titleField = register('title')
      titleField.ref(titleInput)

      titleInput.value = 'Team'
      await titleField.onInput(createInputEvent(titleInput))

      const usersArray = fields('users')
      usersArray.append({
        name: 'J', // Too short
        email: 'invalid', // Invalid email
        address: { city: '', country: '' }, // Empty
      })

      await validate()

      // Errors are stored as nested objects
      const errors = formState.value.errors as Record<string, unknown>
      const users = errors.users as Array<Record<string, unknown>>
      expect(users?.[0]?.name).toBeDefined()
      expect(users?.[0]?.email).toBeDefined()
      const address = users?.[0]?.address as Record<string, unknown>
      expect(address?.city).toBeDefined()
      expect(address?.country).toBeDefined()
    })
  })

  describe('dynamic field registration', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      phone: z.string().optional(),
    })

    it('should handle registering and unregistering fields dynamically', async () => {
      const emailInput = createAndMountInput()
      const phoneInput = createAndMountInput()

      const { register, unregister, getValues, setFocus } = useForm({
        schema,
        defaultValues: { email: '', password: '', phone: '' },
      })

      // Register email
      const emailField = register('email')
      emailField.ref(emailInput)

      emailInput.value = 'test@test.com'
      await emailField.onInput(createInputEvent(emailInput))

      expect(getValues('email')).toBe('test@test.com')

      // Register phone
      const phoneField = register('phone')
      phoneField.ref(phoneInput)

      phoneInput.value = '123-456-7890'
      await phoneField.onInput(createInputEvent(phoneInput))

      expect(getValues('phone')).toBe('123-456-7890')

      // Unregister phone
      unregister('phone')

      // Focus should not work after unregister
      const focusSpy = vi.spyOn(phoneInput, 'focus')
      setFocus('phone')
      expect(focusSpy).not.toHaveBeenCalled()
    })
  })

  describe('custom validation + Zod validation', () => {
    const schema = z.object({
      email: z.string().email('Invalid email format'),
      username: z.string().min(3, 'Username too short'),
    })

    it('should run custom validation on input and set errors', async () => {
      const emailInput = createAndMountInput()

      const { register, formState, clearErrors } = useForm({
        schema,
        defaultValues: { email: '', username: '' },
      })

      const emailField = register('email', {
        validate: (value) => {
          if (value === 'blocked@test.com') {
            return 'This email is blocked'
          }
          return undefined
        },
      })
      emailField.ref(emailInput)

      // Custom validation should run on input with blocked email
      emailInput.value = 'blocked@test.com'
      await emailField.onInput(createInputEvent(emailInput))

      expect(formState.value.errors.email).toBe('This email is blocked')

      // Note: Custom validation returning undefined doesn't auto-clear errors
      // Use clearErrors explicitly when needed
      emailInput.value = 'valid@test.com'
      await emailField.onInput(createInputEvent(emailInput))
      clearErrors('email')

      expect(formState.value.errors.email).toBeUndefined()
    })
  })

  describe('server-side error simulation', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    })

    it('should handle setError during user interaction', async () => {
      const emailInput = createAndMountInput()
      const passwordInput = createAndMountInput()

      const { register, setError, clearErrors, formState, handleSubmit } =
        useForm({
          schema,
          defaultValues: { email: '', password: '' },
        })

      const emailField = register('email')
      const passwordField = register('password')
      emailField.ref(emailInput)
      passwordField.ref(passwordInput)

      // User fills in valid data
      emailInput.value = 'taken@test.com'
      await emailField.onInput(createInputEvent(emailInput))
      passwordInput.value = 'validpassword123'
      await passwordField.onInput(createInputEvent(passwordInput))

      // Simulate server response after submit
      const onSubmit = vi.fn().mockImplementation(async () => {
        // Simulate server saying email is taken
        setError('email', { message: 'This email is already registered' })
      })

      const submitHandler = handleSubmit(onSubmit)
      await submitHandler(new Event('submit'))

      expect(formState.value.errors.email).toBe(
        'This email is already registered',
      )

      // Clear the server error
      clearErrors('email')

      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should handle root-level server errors', async () => {
      const { setError, clearErrors, formState, handleSubmit } = useForm({
        schema,
        defaultValues: { email: 'test@test.com', password: 'password123' },
      })

      const onSubmit = vi.fn().mockImplementation(async () => {
        // Simulate server error
        setError('root', { message: 'Server is unavailable' })
      })

      const submitHandler = handleSubmit(onSubmit)
      await submitHandler(new Event('submit'))

      expect(formState.value.errors.root).toBe('Server is unavailable')

      clearErrors('root')

      expect(formState.value.errors.root).toBeUndefined()
    })
  })

  describe('form reset scenarios', () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    })

    it('should reset to default values', async () => {
      const emailInput = createAndMountInput()

      const { register, getValues, setValue, reset } = useForm({
        schema,
        defaultValues: { email: 'default@test.com', name: 'Default' },
      })

      const emailField = register('email')
      emailField.ref(emailInput)

      // Change value
      setValue('email', 'changed@test.com')
      expect(getValues('email')).toBe('changed@test.com')

      // Reset
      reset()

      expect(getValues('email')).toBe('default@test.com')
      expect(getValues('name')).toBe('Default')
    })

    it('should reset to new values', async () => {
      const { getValues, setValue, reset } = useForm({
        schema,
        defaultValues: { email: 'default@test.com', name: 'Default' },
      })

      setValue('email', 'changed@test.com')

      // Reset to new values
      reset({ email: 'new@test.com', name: 'New Name' })

      expect(getValues('email')).toBe('new@test.com')
      expect(getValues('name')).toBe('New Name')
    })

    it('should clear errors on reset', async () => {
      const { setError, formState, reset } = useForm({
        schema,
        defaultValues: { email: '', name: '' },
      })

      setError('email', { message: 'Error' })
      expect(formState.value.errors.email).toBe('Error')

      reset()

      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should reset field arrays', async () => {
      const arraySchema = z.object({
        items: z.array(z.string()),
      })

      const { fields, getValues, reset } = useForm({
        schema: arraySchema,
        defaultValues: { items: ['initial'] },
      })

      const itemsArray = fields('items')
      itemsArray.append('added1')
      itemsArray.append('added2')

      expect(getValues('items')).toEqual(['initial', 'added1', 'added2'])

      reset()

      expect(getValues('items')).toEqual(['initial'])
    })
  })

  describe('watch functionality', () => {
    const schema = z.object({
      firstName: z.string(),
      lastName: z.string(),
    })

    it('should watch single field changes', async () => {
      const firstNameInput = createAndMountInput()

      const { register, watch } = useForm({
        schema,
        defaultValues: { firstName: '', lastName: '' },
      })

      const firstNameField = register('firstName')
      firstNameField.ref(firstNameInput)

      const watchedFirstName = watch('firstName')

      expect(watchedFirstName.value).toBe('')

      firstNameInput.value = 'John'
      await firstNameField.onInput(createInputEvent(firstNameInput))

      expect(watchedFirstName.value).toBe('John')
    })

    it('should watch multiple fields', async () => {
      const firstNameInput = createAndMountInput()
      const lastNameInput = createAndMountInput()

      const { register, watch } = useForm({
        schema,
        defaultValues: { firstName: '', lastName: '' },
      })

      const firstNameField = register('firstName')
      const lastNameField = register('lastName')
      firstNameField.ref(firstNameInput)
      lastNameField.ref(lastNameInput)

      const watchedFields = watch(['firstName', 'lastName'])

      firstNameInput.value = 'John'
      await firstNameField.onInput(createInputEvent(firstNameInput))

      lastNameInput.value = 'Doe'
      await lastNameField.onInput(createInputEvent(lastNameInput))

      expect(watchedFields.value).toEqual({
        firstName: 'John',
        lastName: 'Doe',
      })
    })

    it('should watch entire form', async () => {
      const firstNameInput = createAndMountInput()

      const { register, watch } = useForm({
        schema,
        defaultValues: { firstName: '', lastName: '' },
      })

      const firstNameField = register('firstName')
      firstNameField.ref(firstNameInput)

      const watchedForm = watch()

      firstNameInput.value = 'John'
      await firstNameField.onInput(createInputEvent(firstNameInput))

      expect(watchedForm.value).toEqual({
        firstName: 'John',
        lastName: '',
      })
    })
  })
})
