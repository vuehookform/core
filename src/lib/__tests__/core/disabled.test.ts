import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useForm } from '../../useForm'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

describe('form-wide disabled option', () => {
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

  describe('static disabled', () => {
    it('should set disabled attribute on registered fields when form is disabled', () => {
      const { register } = useForm({
        schema,
        disabled: true,
      })

      const props = register('email')

      expect(props.disabled).toBe(true)
    })

    it('should not set disabled attribute when form is not disabled', () => {
      const { register } = useForm({
        schema,
        disabled: false,
      })

      const props = register('email')

      expect(props.disabled).toBeUndefined()
    })

    it('should not set disabled attribute when disabled option is not provided', () => {
      const { register } = useForm({ schema })

      const props = register('email')

      expect(props.disabled).toBeUndefined()
    })

    it('should expose disabled state in formState', () => {
      const { formState } = useForm({
        schema,
        disabled: true,
      })

      expect(formState.value.disabled).toBe(true)
    })

    it('should show disabled as false in formState when not disabled', () => {
      const { formState } = useForm({
        schema,
        disabled: false,
      })

      expect(formState.value.disabled).toBe(false)
    })

    it('should default disabled to false in formState', () => {
      const { formState } = useForm({ schema })

      expect(formState.value.disabled).toBe(false)
    })
  })

  describe('reactive disabled (MaybeRef)', () => {
    it('should respond to reactive disabled changes', async () => {
      const isDisabled = ref(false)

      const { register, formState } = useForm({
        schema,
        disabled: isDisabled,
      })

      // Initially not disabled
      expect(register('email').disabled).toBeUndefined()
      expect(formState.value.disabled).toBe(false)

      // Toggle disabled
      isDisabled.value = true
      await nextTick()

      // Now disabled
      expect(register('email').disabled).toBe(true)
      expect(formState.value.disabled).toBe(true)

      // Toggle back
      isDisabled.value = false
      await nextTick()

      expect(register('email').disabled).toBeUndefined()
      expect(formState.value.disabled).toBe(false)
    })
  })

  describe('submission prevention', () => {
    it('should prevent submission when form is disabled', async () => {
      const onValid = vi.fn()
      const { handleSubmit } = useForm({
        schema,
        disabled: true,
        defaultValues: {
          email: 'test@example.com',
          name: 'John',
        },
      })

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(onValid).not.toHaveBeenCalled()
    })

    it('should allow submission when form is not disabled', async () => {
      const onValid = vi.fn()
      const { handleSubmit } = useForm({
        schema,
        disabled: false,
        defaultValues: {
          email: 'test@example.com',
          name: 'John',
        },
      })

      const submitHandler = handleSubmit(onValid)
      await submitHandler(new Event('submit'))

      expect(onValid).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John',
      })
    })

    it('should prevent submission when reactive disabled becomes true', async () => {
      const isDisabled = ref(false)
      const onValid = vi.fn()

      const { handleSubmit } = useForm({
        schema,
        disabled: isDisabled,
        defaultValues: {
          email: 'test@example.com',
          name: 'John',
        },
      })

      // First submission should work
      await handleSubmit(onValid)(new Event('submit'))
      expect(onValid).toHaveBeenCalledTimes(1)

      // Disable the form
      isDisabled.value = true
      await nextTick()

      // Second submission should be blocked
      await handleSubmit(onValid)(new Event('submit'))
      expect(onValid).toHaveBeenCalledTimes(1) // Still only 1 call

      // Re-enable the form
      isDisabled.value = false
      await nextTick()

      // Third submission should work
      await handleSubmit(onValid)(new Event('submit'))
      expect(onValid).toHaveBeenCalledTimes(2)
    })
  })
})
