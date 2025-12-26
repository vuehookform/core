import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../../useForm'
import {
  createMockInput,
  mountElement,
  createBlurEvent,
  schemas,
} from '../helpers/test-utils'

/**
 * unregister() Options Tests
 *
 * Tests for unregister() with options:
 * - keepValue: Preserve form data
 * - keepError: Keep validation errors
 * - keepDirty: Preserve dirty state
 * - keepTouched: Preserve touched state
 * - Multiple keep options combined
 * - Internal cleanup (refs, handlers)
 */

describe('unregister options', () => {
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

  it('should clear value, error, dirty, touched by default', async () => {
    const { register, unregister, setValue, trigger, formState, getValue } = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
    })

    const emailField = register('email')
    emailField.ref(mockInput)

    // Set up all states
    setValue('email', 'test@test.com')
    await emailField.onBlur(createBlurEvent(mockInput))
    await trigger('email')

    expect(getValue('email')).toBe('test@test.com')
    expect(formState.value.dirtyFields.email).toBe(true)
    expect(formState.value.touchedFields.email).toBe(true)

    // Unregister with defaults
    unregister('email')

    expect(getValue('email')).toBeUndefined()
    expect(formState.value.dirtyFields.email).toBeUndefined()
    expect(formState.value.touchedFields.email).toBeUndefined()
  })

  it('should preserve value when keepValue: true', () => {
    const { register, unregister, setValue, getValue } = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
    })

    register('email').ref(mockInput)
    setValue('email', 'keep-me@test.com')

    unregister('email', { keepValue: true })

    expect(getValue('email')).toBe('keep-me@test.com')
  })

  it('should preserve error when keepError: true', async () => {
    const { register, unregister, setValue, trigger, formState } = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
    })

    register('email').ref(mockInput)
    setValue('email', 'invalid')
    await trigger('email')

    expect(formState.value.errors.email).toBeDefined()

    unregister('email', { keepError: true })

    expect(formState.value.errors.email).toBeDefined()
  })

  it('should preserve dirty state when keepDirty: true', () => {
    const { register, unregister, setValue, formState } = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
    })

    register('email').ref(mockInput)
    setValue('email', 'test@test.com')

    expect(formState.value.dirtyFields.email).toBe(true)

    unregister('email', { keepDirty: true })

    expect(formState.value.dirtyFields.email).toBe(true)
  })

  it('should preserve touched state when keepTouched: true', async () => {
    const { register, unregister, formState } = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
    })

    const emailField = register('email')
    emailField.ref(mockInput)
    await emailField.onBlur(createBlurEvent(mockInput))

    expect(formState.value.touchedFields.email).toBe(true)

    unregister('email', { keepTouched: true })

    expect(formState.value.touchedFields.email).toBe(true)
  })

  it('should handle multiple keep options', async () => {
    const { register, unregister, setValue, trigger, formState, getValue } = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
    })

    const emailField = register('email')
    emailField.ref(mockInput)

    setValue('email', 'test@test.com')
    await emailField.onBlur(createBlurEvent(mockInput))
    // Set invalid value and trigger to get error
    setValue('email', 'invalid')
    await trigger('email')

    unregister('email', {
      keepValue: true,
      keepError: true,
      keepDirty: true,
      keepTouched: true,
    })

    expect(getValue('email')).toBe('invalid')
    expect(formState.value.errors.email).toBeDefined()
    expect(formState.value.dirtyFields.email).toBe(true)
    expect(formState.value.touchedFields.email).toBe(true)
  })

  it('should always clean up internal refs and handlers', () => {
    const { register, unregister } = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
    })

    const emailField1 = register('email')
    const refCallback1 = emailField1.ref

    // Unregister with keep options
    unregister('email', { keepValue: true })

    // Re-register should create new refs
    const emailField2 = register('email')
    const refCallback2 = emailField2.ref

    // Should be different refs (new registration)
    expect(refCallback1).not.toBe(refCallback2)
  })
})
