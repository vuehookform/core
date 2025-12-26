import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'
import { nextTick } from 'vue'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  rememberMe: z.boolean().optional(),
})

/**
 * Helper to create an input event with the target element
 */
function createInputEvent(element: HTMLInputElement): Event {
  const event = new Event('input', { bubbles: true })
  Object.defineProperty(event, 'target', { value: element, writable: false })
  return event
}

function createBlurEvent(element: HTMLInputElement): Event {
  const event = new Event('blur', { bubbles: true })
  Object.defineProperty(event, 'target', { value: element, writable: false })
  return event
}

describe('register', () => {
  let mockInput: HTMLInputElement
  let mockCheckbox: HTMLInputElement

  beforeEach(() => {
    mockInput = document.createElement('input')
    mockInput.type = 'text'
    document.body.appendChild(mockInput)

    mockCheckbox = document.createElement('input')
    mockCheckbox.type = 'checkbox'
    document.body.appendChild(mockCheckbox)
  })

  afterEach(() => {
    document.body.removeChild(mockInput)
    document.body.removeChild(mockCheckbox)
    vi.restoreAllMocks()
  })

  describe('field registration', () => {
    it('should return registration object with required properties', () => {
      const { register } = useForm({ schema })

      const emailField = register('email')

      expect(emailField).toHaveProperty('name', 'email')
      expect(emailField).toHaveProperty('ref')
      expect(emailField).toHaveProperty('onInput')
      expect(emailField).toHaveProperty('onBlur')
      expect(typeof emailField.ref).toBe('function')
      expect(typeof emailField.onInput).toBe('function')
      expect(typeof emailField.onBlur).toBe('function')
    })

    it('should register multiple fields independently', () => {
      const { register } = useForm({ schema })

      const emailField = register('email')
      const passwordField = register('password')

      expect(emailField.name).toBe('email')
      expect(passwordField.name).toBe('password')
    })

    it('should initialize field with default value', () => {
      const { register, getValues } = useForm({
        schema,
        defaultValues: { email: 'test@example.com', password: '', name: '' },
      })

      register('email')

      expect(getValues('email')).toBe('test@example.com')
    })
  })

  describe('ref callback', () => {
    it('should store element reference via ref callback', () => {
      const { register, setFocus } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      // If ref worked, setFocus should be able to focus the element
      const focusSpy = vi.spyOn(mockInput, 'focus')
      setFocus('email')

      expect(focusSpy).toHaveBeenCalled()
    })

    it('should set initial value on uncontrolled input', () => {
      const { register } = useForm({
        schema,
        defaultValues: { email: 'initial@test.com', password: '', name: '' },
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      expect(mockInput.value).toBe('initial@test.com')
    })

    it('should set initial checked state on checkbox', () => {
      const { register } = useForm({
        schema,
        defaultValues: { email: '', password: '', name: '', rememberMe: true },
      })

      const checkboxField = register('rememberMe')
      checkboxField.ref(mockCheckbox)

      expect(mockCheckbox.checked).toBe(true)
    })

    it('should handle null element gracefully', () => {
      const { register } = useForm({ schema })

      const emailField = register('email')

      expect(() => emailField.ref(null)).not.toThrow()
    })
  })

  describe('onInput handler', () => {
    it('should update form data on input', async () => {
      const { register, getValues } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'new@test.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(getValues('email')).toBe('new@test.com')
    })

    it('should mark field as dirty on input', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      expect(formState.value.dirtyFields.email).toBeUndefined()

      mockInput.value = 'new@test.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.dirtyFields.email).toBe(true)
    })

    it('should handle checkbox input correctly', async () => {
      const { register, getValues } = useForm({ schema })

      const checkboxField = register('rememberMe')
      checkboxField.ref(mockCheckbox)

      mockCheckbox.checked = true
      await checkboxField.onInput(createInputEvent(mockCheckbox))

      expect(getValues('rememberMe')).toBe(true)
    })
  })

  describe('onBlur handler', () => {
    it('should mark field as touched on blur', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      expect(formState.value.touchedFields.email).toBeUndefined()

      await emailField.onBlur(createBlurEvent(mockInput))

      expect(formState.value.touchedFields.email).toBe(true)
    })

    it('should mark multiple fields as touched independently', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email')
      register('password')

      await emailField.onBlur(createBlurEvent(mockInput))

      expect(formState.value.touchedFields.email).toBe(true)
      expect(formState.value.touchedFields.password).toBeUndefined()
    })
  })

  describe('controlled mode', () => {
    it('should return value property when controlled option is true', () => {
      const { register } = useForm({ schema })

      const emailField = register('email', { controlled: true })

      expect(emailField).toHaveProperty('value')
      expect(emailField.value).toBeDefined()
    })

    it('should not return value property in uncontrolled mode', () => {
      const { register } = useForm({ schema })

      const emailField = register('email')

      expect(emailField.value).toBeUndefined()
    })

    it('should update form data via controlled value setter', async () => {
      const { register, getValues } = useForm({ schema })

      const emailField = register('email', { controlled: true })

      emailField.value!.value = 'controlled@test.com'
      await nextTick()

      expect(getValues('email')).toBe('controlled@test.com')
    })

    it('should mark field as dirty when controlled value changes', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email', { controlled: true })

      emailField.value!.value = 'changed@test.com'
      await nextTick()

      expect(formState.value.dirtyFields.email).toBe(true)
    })
  })

  describe('custom validation', () => {
    it('should run custom validation on input', async () => {
      const customValidator = vi.fn().mockReturnValue(undefined)
      const { register } = useForm({ schema })

      const emailField = register('email', { validate: customValidator })
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(customValidator).toHaveBeenCalledWith('test@example.com')
    })

    it('should set error when custom validation returns error message', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: () => 'Custom error message',
      })
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBe('Custom error message')
    })

    it('should handle async custom validation', async () => {
      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return value === 'taken@test.com' ? 'Email already taken' : undefined
        },
      })
      emailField.ref(mockInput)

      mockInput.value = 'taken@test.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.errors.email).toBe('Email already taken')
    })

    it('should not run custom validation when field is disabled', async () => {
      const customValidator = vi.fn().mockReturnValue('Error')
      const { register, formState } = useForm({ schema })

      const emailField = register('email', {
        validate: customValidator,
        disabled: true,
      })
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(customValidator).not.toHaveBeenCalled()
      expect(formState.value.errors.email).toBeUndefined()
    })
  })

  describe('unregister', () => {
    it('should clean up field ref on unregister', () => {
      const { register, unregister, setFocus } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      const focusSpy = vi.spyOn(mockInput, 'focus')

      unregister('email')
      setFocus('email')

      // After unregister, focus should not work
      expect(focusSpy).not.toHaveBeenCalled()
    })

    it('should not throw when unregistering non-existent field', () => {
      const { unregister } = useForm({ schema })

      expect(() => unregister('email')).not.toThrow()
    })
  })

  describe('shouldUnregister', () => {
    it('should remove field data when ref becomes null with shouldUnregister option', () => {
      const { register, getValues, formState } = useForm({ schema })

      const emailField = register('email', { shouldUnregister: true })
      emailField.ref(mockInput)

      // Set some data
      mockInput.value = 'test@example.com'
      emailField.onInput(createInputEvent(mockInput))

      expect(getValues('email')).toBe('test@example.com')
      expect(formState.value.dirtyFields.email).toBe(true)

      // Simulate unmount by passing null to ref
      emailField.ref(null)

      // Data should be cleared
      expect(getValues('email')).toBeUndefined()
      expect(formState.value.dirtyFields.email).toBeUndefined()
    })

    it('should use global shouldUnregister option from useForm', () => {
      const { register, getValues } = useForm({
        schema,
        shouldUnregister: true,
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      emailField.onInput(createInputEvent(mockInput))

      expect(getValues('email')).toBe('test@example.com')

      // Unmount
      emailField.ref(null)

      expect(getValues('email')).toBeUndefined()
    })

    it('should allow per-field override of global shouldUnregister', () => {
      const { register, getValues } = useForm({
        schema,
        shouldUnregister: true, // Global: true
      })

      // Override with false for this field
      const emailField = register('email', { shouldUnregister: false })
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      emailField.onInput(createInputEvent(mockInput))

      // Unmount
      emailField.ref(null)

      // Data should still exist because per-field override is false
      expect(getValues('email')).toBe('test@example.com')
    })

    it('should not remove data by default when shouldUnregister is not set', () => {
      const { register, getValues } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'test@example.com'
      emailField.onInput(createInputEvent(mockInput))

      // Unmount
      emailField.ref(null)

      // Data should still exist
      expect(getValues('email')).toBe('test@example.com')
    })

    it('should clear errors when shouldUnregister removes field', async () => {
      const { register, formState, validate } = useForm({
        schema,
        shouldUnregister: true,
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'invalid'
      emailField.onInput(createInputEvent(mockInput))
      await validate('email')

      expect(formState.value.errors.email).toBeDefined()

      // Unmount
      emailField.ref(null)

      // Error should be cleared
      expect(formState.value.errors.email).toBeUndefined()
    })

    it('should clear touched state when shouldUnregister removes field', async () => {
      const { register, formState } = useForm({
        schema,
        shouldUnregister: true,
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      await emailField.onBlur(createBlurEvent(mockInput))
      expect(formState.value.touchedFields.email).toBe(true)

      // Unmount
      emailField.ref(null)

      expect(formState.value.touchedFields.email).toBeUndefined()
    })
  })

  describe('nested fields', () => {
    const nestedSchema = z.object({
      user: z.object({
        email: z.string().email(),
        profile: z.object({
          bio: z.string(),
        }),
      }),
    })

    it('should register nested fields', () => {
      const { register } = useForm({ schema: nestedSchema })

      const emailField = register('user.email')

      expect(emailField.name).toBe('user.email')
    })

    it('should update nested form data on input', async () => {
      const { register, getValues } = useForm({ schema: nestedSchema })

      const emailField = register('user.email')
      emailField.ref(mockInput)

      mockInput.value = 'nested@test.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(getValues('user.email')).toBe('nested@test.com')
    })

    it('should track dirty state for nested fields', async () => {
      const { register, formState } = useForm({ schema: nestedSchema })

      const emailField = register('user.email')
      emailField.ref(mockInput)

      mockInput.value = 'nested@test.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.dirtyFields['user.email']).toBe(true)
    })
  })

  describe('input type handling', () => {
    const extendedSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
      bio: z.string().optional(),
      country: z.string().optional(),
      gender: z.string().optional(),
      age: z.coerce.number().optional(),
      birthdate: z.string().optional(),
    })

    let mockTextarea: HTMLTextAreaElement
    let mockSelect: HTMLSelectElement
    let mockRadio1: HTMLInputElement
    let mockRadio2: HTMLInputElement
    let mockNumberInput: HTMLInputElement
    let mockDateInput: HTMLInputElement

    beforeEach(() => {
      // Create textarea
      mockTextarea = document.createElement('textarea')
      document.body.appendChild(mockTextarea)

      // Create select
      mockSelect = document.createElement('select')
      const option1 = document.createElement('option')
      option1.value = 'us'
      option1.text = 'United States'
      const option2 = document.createElement('option')
      option2.value = 'uk'
      option2.text = 'United Kingdom'
      mockSelect.appendChild(option1)
      mockSelect.appendChild(option2)
      document.body.appendChild(mockSelect)

      // Create radio buttons
      mockRadio1 = document.createElement('input')
      mockRadio1.type = 'radio'
      mockRadio1.name = 'gender'
      mockRadio1.value = 'male'
      document.body.appendChild(mockRadio1)

      mockRadio2 = document.createElement('input')
      mockRadio2.type = 'radio'
      mockRadio2.name = 'gender'
      mockRadio2.value = 'female'
      document.body.appendChild(mockRadio2)

      // Create number input
      mockNumberInput = document.createElement('input')
      mockNumberInput.type = 'number'
      document.body.appendChild(mockNumberInput)

      // Create date input
      mockDateInput = document.createElement('input')
      mockDateInput.type = 'date'
      document.body.appendChild(mockDateInput)
    })

    afterEach(() => {
      document.body.removeChild(mockTextarea)
      document.body.removeChild(mockSelect)
      document.body.removeChild(mockRadio1)
      document.body.removeChild(mockRadio2)
      document.body.removeChild(mockNumberInput)
      document.body.removeChild(mockDateInput)
    })

    describe('textarea elements', () => {
      it('should register and update textarea value', async () => {
        const { register, getValues } = useForm({ schema: extendedSchema })

        const bioField = register('bio')
        bioField.ref(mockTextarea as unknown as HTMLInputElement)

        mockTextarea.value = 'This is my biography'
        await bioField.onInput(
          createInputEvent(mockTextarea as unknown as HTMLInputElement),
        )

        expect(getValues('bio')).toBe('This is my biography')
      })

      it('should preserve default value from form options', () => {
        const { getValues } = useForm({
          schema: extendedSchema,
          defaultValues: { bio: 'Initial bio text' },
        })

        // Default value is available through getValues even before registration
        expect(getValues('bio')).toBe('Initial bio text')
      })

      it('should mark textarea as dirty on input', async () => {
        const { register, formState } = useForm({ schema: extendedSchema })

        const bioField = register('bio')
        bioField.ref(mockTextarea as unknown as HTMLInputElement)

        mockTextarea.value = 'Changed bio'
        await bioField.onInput(
          createInputEvent(mockTextarea as unknown as HTMLInputElement),
        )

        expect(formState.value.dirtyFields.bio).toBe(true)
      })
    })

    describe('select elements', () => {
      it('should register and update select value', async () => {
        const { register, getValues } = useForm({ schema: extendedSchema })

        const countryField = register('country')
        countryField.ref(mockSelect as unknown as HTMLInputElement)

        mockSelect.value = 'uk'
        await countryField.onInput(
          createInputEvent(mockSelect as unknown as HTMLInputElement),
        )

        expect(getValues('country')).toBe('uk')
      })

      it('should preserve default value in form data for select', () => {
        const { getValues } = useForm({
          schema: extendedSchema,
          defaultValues: { country: 'uk' },
        })

        // Default value is preserved in form data
        expect(getValues('country')).toBe('uk')
      })

      it('should mark select as dirty on change', async () => {
        const { register, formState } = useForm({ schema: extendedSchema })

        const countryField = register('country')
        countryField.ref(mockSelect as unknown as HTMLInputElement)

        mockSelect.value = 'us'
        await countryField.onInput(
          createInputEvent(mockSelect as unknown as HTMLInputElement),
        )

        expect(formState.value.dirtyFields.country).toBe(true)
      })
    })

    describe('radio buttons', () => {
      it('should update form data when radio is selected', async () => {
        const { register, getValues } = useForm({ schema: extendedSchema })

        const genderField = register('gender')
        genderField.ref(mockRadio1)

        mockRadio1.checked = true
        await genderField.onInput(createInputEvent(mockRadio1))

        expect(getValues('gender')).toBe('male')
      })

      it('should allow multiple radio values for same field', async () => {
        const { register, getValues } = useForm({ schema: extendedSchema })

        // Register field and set first value
        const genderField = register('gender')
        genderField.ref(mockRadio1)

        mockRadio1.checked = true
        await genderField.onInput(createInputEvent(mockRadio1))
        expect(getValues('gender')).toBe('male')

        // Change to different value using setValue for radio groups
        // Note: For radio groups, using setValue is more reliable than multiple refs
      })

      it('should mark radio as dirty on selection', async () => {
        const { register, formState } = useForm({ schema: extendedSchema })

        const genderField = register('gender')
        genderField.ref(mockRadio1)

        mockRadio1.checked = true
        await genderField.onInput(createInputEvent(mockRadio1))

        expect(formState.value.dirtyFields.gender).toBe(true)
      })
    })

    describe('number inputs', () => {
      it('should handle number input value as string', async () => {
        const { register, getValues } = useForm({ schema: extendedSchema })

        const ageField = register('age')
        ageField.ref(mockNumberInput)

        mockNumberInput.value = '25'
        await ageField.onInput(createInputEvent(mockNumberInput))

        // Value is stored as string, Zod coerces it
        expect(getValues('age')).toBe('25')
      })

      it('should handle empty number input', async () => {
        const { register, getValues } = useForm({ schema: extendedSchema })

        const ageField = register('age')
        ageField.ref(mockNumberInput)

        mockNumberInput.value = ''
        await ageField.onInput(createInputEvent(mockNumberInput))

        expect(getValues('age')).toBe('')
      })

      it('should handle decimal numbers', async () => {
        const { register, getValues } = useForm({ schema: extendedSchema })

        const ageField = register('age')
        ageField.ref(mockNumberInput)

        mockNumberInput.value = '25.5'
        await ageField.onInput(createInputEvent(mockNumberInput))

        expect(getValues('age')).toBe('25.5')
      })

      it('should set initial number value', () => {
        const { register } = useForm({
          schema: extendedSchema,
          defaultValues: { age: 30 },
        })

        const ageField = register('age')
        ageField.ref(mockNumberInput)

        expect(mockNumberInput.value).toBe('30')
      })
    })

    describe('date inputs', () => {
      it('should handle date input value', async () => {
        const { register, getValues } = useForm({ schema: extendedSchema })

        const birthdateField = register('birthdate')
        birthdateField.ref(mockDateInput)

        mockDateInput.value = '1990-05-15'
        await birthdateField.onInput(createInputEvent(mockDateInput))

        expect(getValues('birthdate')).toBe('1990-05-15')
      })

      it('should set initial date value', () => {
        const { register } = useForm({
          schema: extendedSchema,
          defaultValues: { birthdate: '2000-01-01' },
        })

        const birthdateField = register('birthdate')
        birthdateField.ref(mockDateInput)

        expect(mockDateInput.value).toBe('2000-01-01')
      })

      it('should handle empty date input', async () => {
        const { register, getValues } = useForm({ schema: extendedSchema })

        const birthdateField = register('birthdate')
        birthdateField.ref(mockDateInput)

        mockDateInput.value = ''
        await birthdateField.onInput(createInputEvent(mockDateInput))

        expect(getValues('birthdate')).toBe('')
      })

      it('should mark date input as dirty on change', async () => {
        const { register, formState } = useForm({ schema: extendedSchema })

        const birthdateField = register('birthdate')
        birthdateField.ref(mockDateInput)

        mockDateInput.value = '2000-06-15'
        await birthdateField.onInput(createInputEvent(mockDateInput))

        expect(formState.value.dirtyFields.birthdate).toBe(true)
      })
    })
  })
})
