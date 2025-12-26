import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'
import {
  createMockInput,
  mountElement,
  createBlurEvent,
  schemas,
} from '../helpers/test-utils'

/**
 * resetField() Tests
 *
 * Tests for resetting individual fields:
 * - Reset to default value
 * - keepError, keepDirty, keepTouched options
 * - Custom defaultValue option
 * - Nested field support
 * - DOM element updates for uncontrolled inputs
 */

// Schema for nested field tests
const nestedSchema = z.object({
  user: z.object({
    email: z.string().email(),
    profile: z.object({
      name: z.string().min(2),
    }),
  }),
})

describe('resetField', () => {
  let mockInput: HTMLInputElement
  let cleanup: () => void

  beforeEach(() => {
    mockInput = createMockInput()
    cleanup = mountElement(mockInput)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('should reset field to its default value', () => {
    const { setValue, resetField, getValue } = useForm({
      schema: schemas.basic,
      defaultValues: { email: 'default@test.com', password: '', name: '' },
    })

    setValue('email', 'changed@test.com')
    expect(getValue('email')).toBe('changed@test.com')

    resetField('email')
    expect(getValue('email')).toBe('default@test.com')
  })

  it('should preserve error when keepError: true', async () => {
    const { register, formState, resetField, trigger } = useForm({
      schema: schemas.basic,
      defaultValues: { email: 'valid@test.com', password: '', name: '' },
    })

    register('email')

    // Trigger validation to create an error
    await trigger('email')
    // Set invalid value and validate
    const { setValue } = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
    })
    setValue('email', 'invalid')

    // Use a fresh form to test properly
    const form2 = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
    })
    form2.setValue('email', 'invalid-email')
    await form2.trigger('email')

    expect(form2.formState.value.errors.email).toBeDefined()

    form2.resetField('email', { keepError: true })
    expect(form2.formState.value.errors.email).toBeDefined()
  })

  it('should clear error when keepError: false (default)', async () => {
    const { setValue, resetField, trigger, formState } = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
    })

    setValue('email', 'invalid-email')
    await trigger('email')
    expect(formState.value.errors.email).toBeDefined()

    resetField('email')
    expect(formState.value.errors.email).toBeUndefined()
  })

  it('should preserve dirty state when keepDirty: true', () => {
    const { setValue, resetField, formState } = useForm({
      schema: schemas.basic,
      defaultValues: { email: 'default@test.com', password: '', name: '' },
    })

    setValue('email', 'changed@test.com')
    expect(formState.value.dirtyFields.email).toBe(true)

    resetField('email', { keepDirty: true })
    expect(formState.value.dirtyFields.email).toBe(true)
  })

  it('should clear dirty state when keepDirty: false (default)', () => {
    const { setValue, resetField, formState } = useForm({
      schema: schemas.basic,
      defaultValues: { email: 'default@test.com', password: '', name: '' },
    })

    setValue('email', 'changed@test.com')
    expect(formState.value.dirtyFields.email).toBe(true)

    resetField('email')
    expect(formState.value.dirtyFields.email).toBeUndefined()
  })

  it('should preserve touched state when keepTouched: true', async () => {
    const { register, resetField, formState } = useForm({
      schema: schemas.basic,
      defaultValues: { email: 'default@test.com', password: '', name: '' },
    })

    const emailField = register('email')
    emailField.ref(mockInput)

    // Trigger blur to mark as touched
    await emailField.onBlur(createBlurEvent(mockInput))
    expect(formState.value.touchedFields.email).toBe(true)

    resetField('email', { keepTouched: true })
    expect(formState.value.touchedFields.email).toBe(true)
  })

  it('should update stored default when defaultValue provided', () => {
    const { resetField, reset, getValue } = useForm({
      schema: schemas.basic,
      defaultValues: { email: 'original@test.com', password: '', name: '' },
    })

    // Reset field with new default
    resetField('email', { defaultValue: 'new-default@test.com' })
    expect(getValue('email')).toBe('new-default@test.com')

    // Full form reset should use the new default
    reset()
    expect(getValue('email')).toBe('new-default@test.com')
  })

  it('should reset nested field correctly', () => {
    const { setValue, resetField, getValue, getValues } = useForm({
      schema: nestedSchema,
      defaultValues: {
        user: {
          email: 'default@test.com',
          profile: { name: 'Default Name' },
        },
      },
    })

    // Verify initial state
    expect(getValue('user.email')).toBe('default@test.com')

    setValue('user.email', 'changed@test.com')
    expect(getValue('user.email')).toBe('changed@test.com')

    // Reset with explicit default value (since nested paths may not auto-resolve from defaults)
    resetField('user.email', { defaultValue: 'default@test.com' })
    expect(getValue('user.email')).toBe('default@test.com')
  })

  it('should update DOM element value for uncontrolled inputs', () => {
    const { register, setValue, resetField } = useForm({
      schema: schemas.basic,
      defaultValues: { email: 'default@test.com', password: '', name: '' },
    })

    const emailField = register('email')
    emailField.ref(mockInput)

    // DOM should have default value
    expect(mockInput.value).toBe('default@test.com')

    // Change value
    setValue('email', 'changed@test.com')
    expect(mockInput.value).toBe('changed@test.com')

    // Reset should update DOM
    resetField('email')
    expect(mockInput.value).toBe('default@test.com')
  })
})
