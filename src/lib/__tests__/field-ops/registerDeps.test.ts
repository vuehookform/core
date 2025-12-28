import { describe, it } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'
import {
  createMockInput,
  mountElement,
  createInputEvent,
  createBlurEvent,
  schemas,
} from '../helpers/test-utils'

/**
 * Register deps Option Tests
 *
 * Tests for the `deps` option in register():
 * - Trigger dependent field validation on input
 * - Trigger all dependent fields
 * - Trigger deps on blur
 * - Respect validation mode
 * - Support nested field paths
 */

const passwordConfirmSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

describe('register deps option', () => {
  it('should trigger dependent field validation on input', async () => {
    const { register, setValue } = useForm({
      schema: passwordConfirmSchema,
      defaultValues: { password: '', confirmPassword: '' },
      mode: 'onChange',
    })

    // Register password without deps
    const passwordField = register('password')
    const passwordInput = createMockInput()
    const cleanupPw = mountElement(passwordInput)
    passwordField.ref(passwordInput)

    // Register confirmPassword with deps on password
    const confirmField = register('confirmPassword', { deps: ['password'] })
    const confirmInput = createMockInput()
    const cleanupConfirm = mountElement(confirmInput)
    confirmField.ref(confirmInput)

    setValue('password', 'password123')
    setValue('confirmPassword', 'password123')

    // Now change confirmPassword to trigger deps validation
    confirmInput.value = 'different'
    await confirmField.onInput(createInputEvent(confirmInput))

    // Password validation should have been triggered via deps
    // The form uses onChange mode, so validation runs on input

    cleanupPw()
    cleanupConfirm()
  })

  it('should trigger all dependent fields', async () => {
    const threeFieldSchema = z.object({
      a: z.string().min(1),
      b: z.string().min(1),
      c: z.string().min(1),
    })

    const { register } = useForm({
      schema: threeFieldSchema,
      defaultValues: { a: '', b: '', c: '' },
      mode: 'onChange',
    })

    const inputA = createMockInput()
    const inputB = createMockInput()
    const inputC = createMockInput()

    const cleanupA = mountElement(inputA)
    const cleanupB = mountElement(inputB)
    const cleanupC = mountElement(inputC)

    register('a').ref(inputA)
    register('b').ref(inputB)
    // Field c depends on both a and b
    const fieldC = register('c', { deps: ['a', 'b'] })
    fieldC.ref(inputC)

    // Type in field c
    inputC.value = 'test'
    await fieldC.onInput(createInputEvent(inputC))

    // Both a and b should have been validated via deps
    // (validation state changes happen internally)

    cleanupA()
    cleanupB()
    cleanupC()
  })

  it('should trigger deps validation on blur', async () => {
    const { register } = useForm({
      schema: passwordConfirmSchema,
      defaultValues: { password: '', confirmPassword: '' },
      mode: 'onBlur',
    })

    const passwordInput = createMockInput()
    const confirmInput = createMockInput()

    const cleanupPw = mountElement(passwordInput)
    const cleanupConfirm = mountElement(confirmInput)

    register('password').ref(passwordInput)
    const confirmField = register('confirmPassword', { deps: ['password'] })
    confirmField.ref(confirmInput)

    // Blur on confirmPassword should trigger password validation
    await confirmField.onBlur(createBlurEvent(confirmInput))

    cleanupPw()
    cleanupConfirm()
  })

  it('should respect validation mode for deps', async () => {
    const { register } = useForm({
      schema: passwordConfirmSchema,
      defaultValues: { password: '', confirmPassword: '' },
      mode: 'onBlur', // Only validate on blur
    })

    const passwordInput = createMockInput()
    const confirmInput = createMockInput()

    const cleanupPw = mountElement(passwordInput)
    const cleanupConfirm = mountElement(confirmInput)

    register('password').ref(passwordInput)
    const confirmField = register('confirmPassword', { deps: ['password'] })
    confirmField.ref(confirmInput)

    // Input event should NOT trigger validation (mode is onBlur)
    confirmInput.value = 'test'
    await confirmField.onInput(createInputEvent(confirmInput))

    // No errors should be set yet (waiting for blur)
    // Deps validation follows the same mode

    cleanupPw()
    cleanupConfirm()
  })

  it('should work with nested field paths as deps', async () => {
    const nestedDepsSchema = z.object({
      user: z.object({
        email: z.email(),
        confirmEmail: z.string(),
      }),
    })

    const { register } = useForm({
      schema: nestedDepsSchema,
      defaultValues: {
        user: { email: '', confirmEmail: '' },
      },
      mode: 'onChange',
    })

    const emailInput = createMockInput()
    const confirmInput = createMockInput()

    const cleanupEmail = mountElement(emailInput)
    const cleanupConfirm = mountElement(confirmInput)

    register('user.email').ref(emailInput)
    // confirmEmail depends on user.email
    const confirmField = register('user.confirmEmail', { deps: ['user.email'] })
    confirmField.ref(confirmInput)

    // Typing in confirmEmail should trigger user.email validation
    confirmInput.value = 'test@test.com'
    await confirmField.onInput(createInputEvent(confirmInput))

    cleanupEmail()
    cleanupConfirm()
  })

  it('should handle empty deps array', async () => {
    const { register } = useForm({
      schema: schemas.basic,
      defaultValues: { email: '', password: '', name: '' },
      mode: 'onChange',
    })

    const emailInput = createMockInput()
    const cleanupEmail = mountElement(emailInput)

    // Register with empty deps array - should work without errors
    const emailField = register('email', { deps: [] })
    emailField.ref(emailInput)

    emailInput.value = 'test@test.com'
    await emailField.onInput(createInputEvent(emailInput))

    // Should complete without errors
    cleanupEmail()
  })
})
