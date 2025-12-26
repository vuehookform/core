import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

describe('handleSubmit', () => {
  let mockInput: HTMLInputElement

  beforeEach(() => {
    mockInput = document.createElement('input')
    mockInput.type = 'text'
    document.body.appendChild(mockInput)
  })

  afterEach(() => {
    document.body.removeChild(mockInput)
    vi.restoreAllMocks()
  })

  describe('successful submission', () => {
    it('should call onValid with form data when validation passes', async () => {
      const onValid = vi.fn()
      const { handleSubmit } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(onValid).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        name: 'John',
      })
    })

    it('should handle async onValid callback', async () => {
      const onValid = vi.fn().mockResolvedValue(undefined)
      const { handleSubmit } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(onValid).toHaveBeenCalled()
    })

    it('should prevent default form submission', async () => {
      const onValid = vi.fn()
      const { handleSubmit } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const event = new Event('submit')
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      const submitHandler = handleSubmit(onValid)
      await submitHandler(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('failed submission', () => {
    it('should not call onValid when validation fails', async () => {
      const onValid = vi.fn()
      const { handleSubmit } = useForm({ schema })

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(onValid).not.toHaveBeenCalled()
    })

    it('should call onInvalid with errors when validation fails', async () => {
      const onValid = vi.fn()
      const onInvalid = vi.fn()
      const { handleSubmit } = useForm({ schema })

      const submitHandler = handleSubmit(onValid, onInvalid)
      await submitHandler(new Event('submit'))

      expect(onInvalid).toHaveBeenCalled()
      expect(onInvalid.mock.calls[0][0]).toHaveProperty('email')
    })

    it('should update formState errors on failed submission', async () => {
      const { handleSubmit, formState } = useForm({ schema })

      const submitHandler = handleSubmit(vi.fn())
      await submitHandler(new Event('submit'))

      expect(Object.keys(formState.value.errors).length).toBeGreaterThan(0)
    })
  })

  describe('isSubmitting state', () => {
    it('should set isSubmitting to true during submission', async () => {
      let submittingState: boolean | undefined
      const { handleSubmit, formState } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const onValid = vi.fn().mockImplementation(() => {
        submittingState = formState.value.isSubmitting
      })

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(submittingState).toBe(true)
    })

    it('should set isSubmitting to false after submission completes', async () => {
      const { handleSubmit, formState } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const submitHandler = handleSubmit(vi.fn())
      await submitHandler(new Event('submit'))

      expect(formState.value.isSubmitting).toBe(false)
    })

    it('should set isSubmitting to false even if onValid throws', async () => {
      const { handleSubmit, formState } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const onValid = vi.fn().mockRejectedValue(new Error('Submit error'))

      const submitHandler = handleSubmit(onValid)

      await expect(submitHandler(new Event('submit'))).rejects.toThrow('Submit error')
      expect(formState.value.isSubmitting).toBe(false)
    })

    it('should set isSubmitting to false on validation failure', async () => {
      const { handleSubmit, formState } = useForm({ schema })

      const submitHandler = handleSubmit(vi.fn())
      await submitHandler(new Event('submit'))

      expect(formState.value.isSubmitting).toBe(false)
    })
  })

  describe('submitCount', () => {
    it('should increment submitCount on each submission', async () => {
      const { handleSubmit, formState } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      expect(formState.value.submitCount).toBe(0)

      const submitHandler = handleSubmit(vi.fn())

      await submitHandler(new Event('submit'))
      expect(formState.value.submitCount).toBe(1)

      await submitHandler(new Event('submit'))
      expect(formState.value.submitCount).toBe(2)
    })

    it('should increment submitCount even on failed submissions', async () => {
      const { handleSubmit, formState } = useForm({ schema })

      expect(formState.value.submitCount).toBe(0)

      const submitHandler = handleSubmit(vi.fn())
      await submitHandler(new Event('submit'))

      expect(formState.value.submitCount).toBe(1)
    })
  })

  describe('uncontrolled input collection', () => {
    it('should collect values from uncontrolled inputs before validation', async () => {
      const onValid = vi.fn()
      const { register, handleSubmit } = useForm({
        schema,
        defaultValues: { email: '', password: 'password123', name: 'John' },
      })

      const emailField = register('email')
      emailField.ref(mockInput)
      mockInput.value = 'collected@test.com'

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(onValid).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'collected@test.com',
        }),
      )
    })

    it('should not override controlled input values', async () => {
      const onValid = vi.fn()
      const { register, handleSubmit, setValue } = useForm({
        schema,
        defaultValues: { email: '', password: 'password123', name: 'John' },
      })

      const emailField = register('email', { controlled: true })
      emailField.ref(mockInput)

      // Set via controlled mode
      setValue('email', 'controlled@test.com')

      // DOM has different value
      mockInput.value = 'dom@test.com'

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(onValid).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'controlled@test.com',
        }),
      )
    })
  })

  describe('integration', () => {
    it('should handle complete submission workflow', async () => {
      const onValid = vi.fn()
      const onInvalid = vi.fn()
      const { register, handleSubmit, setValue, formState } = useForm({ schema })

      const emailField = register('email')
      emailField.ref(mockInput)

      // First attempt - should fail
      let submitHandler = handleSubmit(onValid, onInvalid)
      await submitHandler(new Event('submit'))

      expect(onInvalid).toHaveBeenCalled()
      expect(formState.value.submitCount).toBe(1)

      // Fix all fields
      setValue('email', 'test@example.com')
      setValue('password', 'password123')
      setValue('name', 'John')

      // Second attempt - should succeed
      submitHandler = handleSubmit(onValid, onInvalid)
      await submitHandler(new Event('submit'))

      expect(onValid).toHaveBeenCalled()
      expect(formState.value.submitCount).toBe(2)
    })

    it('should collect checkbox values correctly', async () => {
      const checkboxSchema = z.object({
        agreed: z.boolean(),
      })

      const onValid = vi.fn()
      const { register, handleSubmit } = useForm({
        schema: checkboxSchema,
        defaultValues: { agreed: false },
      })

      const mockCheckbox = document.createElement('input')
      mockCheckbox.type = 'checkbox'
      document.body.appendChild(mockCheckbox)

      const agreedField = register('agreed')
      agreedField.ref(mockCheckbox)
      mockCheckbox.checked = true

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(onValid).toHaveBeenCalledWith({ agreed: true })

      document.body.removeChild(mockCheckbox)
    })
  })
})
