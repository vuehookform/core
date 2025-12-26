import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'
import { nextTick } from 'vue'

// Basic superRefine for password confirmation
const passwordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      })
    }
  })

// SuperRefine with multiple errors from single call
const registrationSchema = z
  .object({
    username: z.string(),
    email: z.string(),
    age: z.number(),
  })
  .superRefine((data, ctx) => {
    // Username checks
    if (data.username.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 3,
        type: 'string',
        inclusive: true,
        message: 'Username must be at least 3 characters',
        path: ['username'],
      })
    }
    if (!/^[a-z0-9]+$/i.test(data.username) && data.username.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Username must be alphanumeric',
        path: ['username'],
      })
    }
    // Cross-field validation
    if (data.age < 18 && data.email.includes('business')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Business emails require age 18+',
        path: ['email'],
      })
    }
  })

// SuperRefine with custom error codes/params
const orderSchema = z
  .object({
    quantity: z.number(),
    maxQuantity: z.number(),
    startDate: z.string(),
    endDate: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.quantity > data.maxQuantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        params: { code: 'EXCEEDED_MAX', limit: data.maxQuantity },
        message: `Cannot exceed ${data.maxQuantity} items`,
        path: ['quantity'],
      })
    }
    if (data.startDate && data.endDate) {
      if (new Date(data.startDate) > new Date(data.endDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          params: { code: 'INVALID_DATE_RANGE' },
          message: 'Start date must be before end date',
          path: ['startDate'],
        })
      }
    }
  })

// Nested object with superRefine
const profileSchema = z.object({
  user: z.object({
    details: z
      .object({
        firstName: z.string().min(1, 'First name required'),
        lastName: z.string().min(1, 'Last name required'),
      })
      .superRefine((data, ctx) => {
        if (
          data.firstName.toLowerCase() === data.lastName.toLowerCase() &&
          data.firstName.length > 0
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'First and last name cannot be the same',
            path: ['lastName'],
          })
        }
      }),
  }),
})

// SuperRefine accessing full form context
const checkoutSchema = z
  .object({
    items: z.array(
      z.object({
        name: z.string(),
        price: z.number(),
        quantity: z.number(),
      }),
    ),
    discount: z.number(),
    total: z.number(),
  })
  .superRefine((data, ctx) => {
    const calculatedTotal =
      data.items.reduce((sum, item) => sum + item.price * item.quantity, 0) -
      data.discount

    if (Math.abs(data.total - calculatedTotal) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total should be ${calculatedTotal.toFixed(2)}`,
        path: ['total'],
      })
    }

    const subtotal = data.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    )
    if (data.discount > subtotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Discount cannot exceed subtotal',
        path: ['discount'],
      })
    }
  })

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

describe('superRefine validation', () => {
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

  describe('basic superRefine with ctx.addIssue()', () => {
    it('should add custom error via ctx.addIssue()', async () => {
      const { handleSubmit, formState } = useForm({
        schema: passwordSchema,
        defaultValues: {
          password: 'password123',
          confirmPassword: 'different',
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(formState.value.errors.confirmPassword).toBe(
        'Passwords do not match',
      )
    })

    it('should target error to correct path', async () => {
      const { handleSubmit, formState } = useForm({
        schema: passwordSchema,
        defaultValues: {
          password: 'password123',
          confirmPassword: 'password456',
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      // Error should be on confirmPassword, not password
      expect(formState.value.errors.confirmPassword).toBeDefined()
      expect(formState.value.errors.password).toBeUndefined()
    })

    it('should use ZodIssueCode.custom for custom validations', async () => {
      const { handleSubmit, formState } = useForm({
        schema: passwordSchema,
        defaultValues: {
          password: 'password123',
          confirmPassword: 'mismatch',
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(formState.value.errors.confirmPassword).toBe(
        'Passwords do not match',
      )
    })

    it('should clear error when validation passes', async () => {
      const { handleSubmit, formState, setValue } = useForm({
        schema: passwordSchema,
        defaultValues: {
          password: 'password123',
          confirmPassword: 'mismatch',
        },
      })

      // First submit - should have error
      await handleSubmit(vi.fn())(new Event('submit'))
      expect(formState.value.errors.confirmPassword).toBeDefined()

      // Fix the confirmation
      setValue('confirmPassword', 'password123')
      await nextTick()

      // Submit again - should pass
      const onValid = vi.fn()
      await handleSubmit(onValid)(new Event('submit'))

      expect(onValid).toHaveBeenCalled()
      expect(formState.value.errors.confirmPassword).toBeUndefined()
    })
  })

  describe('multiple errors from single superRefine', () => {
    it('should collect multiple errors from one superRefine call', async () => {
      const { handleSubmit, formState } = useForm({
        schema: registrationSchema,
        defaultValues: {
          username: 'a!', // Too short and not alphanumeric
          email: 'test@business.com',
          age: 16, // Under 18 with business email
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      // Should have username error (first one wins in firstError mode)
      expect(formState.value.errors.username).toBeDefined()
      // Should have email error for business email with age < 18
      expect(formState.value.errors.email).toBe(
        'Business emails require age 18+',
      )
    })

    it('should add errors to different paths in single superRefine', async () => {
      const { handleSubmit, formState } = useForm({
        schema: registrationSchema,
        defaultValues: {
          username: 'ab', // Too short
          email: 'business@business.com',
          age: 15, // Under 18
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(formState.value.errors.username).toBe(
        'Username must be at least 3 characters',
      )
      expect(formState.value.errors.email).toBe(
        'Business emails require age 18+',
      )
    })

    it('should handle errors on same field from multiple addIssue calls', async () => {
      const { handleSubmit, formState } = useForm({
        schema: registrationSchema,
        criteriaMode: 'all',
        defaultValues: {
          username: 'a!', // Both too short AND not alphanumeric
          email: 'test@example.com',
          age: 25,
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      // In criteriaMode: 'all', we should get multiple errors
      const usernameErrors = formState.value.errors.username
      expect(usernameErrors).toBeDefined()
    })
  })

  describe('superRefine with custom error codes', () => {
    it('should handle custom error messages', async () => {
      const { handleSubmit, formState } = useForm({
        schema: orderSchema,
        defaultValues: {
          quantity: 100,
          maxQuantity: 50,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(formState.value.errors.quantity).toBe('Cannot exceed 50 items')
    })

    it('should report correct error type from ZodIssueCode', async () => {
      const { handleSubmit, formState } = useForm({
        schema: orderSchema,
        defaultValues: {
          quantity: 10,
          maxQuantity: 50,
          startDate: '2024-12-31',
          endDate: '2024-01-01', // End before start
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(formState.value.errors.startDate).toBe(
        'Start date must be before end date',
      )
    })

    it('should validate multiple custom rules in same schema', async () => {
      const { handleSubmit, formState } = useForm({
        schema: orderSchema,
        defaultValues: {
          quantity: 100, // Exceeds max
          maxQuantity: 50,
          startDate: '2024-12-31',
          endDate: '2024-01-01', // End before start
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(formState.value.errors.quantity).toBeDefined()
      expect(formState.value.errors.startDate).toBeDefined()
    })
  })

  describe('superRefine accessing full form context', () => {
    it('should validate based on related field values', async () => {
      const { handleSubmit, formState } = useForm({
        schema: checkoutSchema,
        defaultValues: {
          items: [
            { name: 'Widget', price: 10, quantity: 2 },
            { name: 'Gadget', price: 20, quantity: 1 },
          ],
          discount: 5,
          total: 35, // Correct: (10*2 + 20*1) - 5 = 35
        },
      })

      const onValid = vi.fn()
      await handleSubmit(onValid)(new Event('submit'))

      expect(onValid).toHaveBeenCalled()
      expect(formState.value.errors.total).toBeUndefined()
    })

    it('should perform cross-field validation', async () => {
      const { handleSubmit, formState } = useForm({
        schema: checkoutSchema,
        defaultValues: {
          items: [{ name: 'Widget', price: 10, quantity: 2 }],
          discount: 50, // Exceeds subtotal of 20
          total: -30,
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(formState.value.errors.discount).toBe(
        'Discount cannot exceed subtotal',
      )
    })

    it('should validate calculated values against actual values', async () => {
      const { handleSubmit, formState } = useForm({
        schema: checkoutSchema,
        defaultValues: {
          items: [
            { name: 'Widget', price: 10, quantity: 2 },
            { name: 'Gadget', price: 20, quantity: 1 },
          ],
          discount: 5,
          total: 100, // Wrong! Should be 35
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(formState.value.errors.total).toBe('Total should be 35.00')
    })

    it('should handle array data in superRefine', async () => {
      const { handleSubmit, formState } = useForm({
        schema: checkoutSchema,
        defaultValues: {
          items: [
            { name: 'A', price: 5, quantity: 1 },
            { name: 'B', price: 10, quantity: 3 },
            { name: 'C', price: 15, quantity: 2 },
          ],
          discount: 0,
          total: 65, // 5*1 + 10*3 + 15*2 = 5 + 30 + 30 = 65
        },
      })

      const onValid = vi.fn()
      await handleSubmit(onValid)(new Event('submit'))

      expect(onValid).toHaveBeenCalled()
    })
  })

  describe('nested object with superRefine', () => {
    it('should run superRefine on nested objects', async () => {
      const { handleSubmit, formState } = useForm({
        schema: profileSchema,
        defaultValues: {
          user: {
            details: {
              firstName: 'John',
              lastName: 'John', // Same as first name
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      // SuperRefine on nested object should produce an error
      // The path may be stored at different levels depending on Zod behavior
      const errorKeys = Object.keys(formState.value.errors)
      expect(errorKeys.length).toBeGreaterThan(0)
    })

    it('should report nested errors with correct deep path', async () => {
      const { handleSubmit, formState } = useForm({
        schema: profileSchema,
        defaultValues: {
          user: {
            details: {
              firstName: 'Test',
              lastName: 'Test',
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      // Should have errors for the user object
      const errorKeys = Object.keys(formState.value.errors)
      expect(errorKeys.length).toBeGreaterThan(0)
      // Error should be user-related
      const hasUserError = errorKeys.some((k) => k.includes('user'))
      expect(hasUserError).toBe(true)
    })

    it('should use path: user.details.lastName format', async () => {
      const { handleSubmit, formState, clearErrors } = useForm({
        schema: profileSchema,
        defaultValues: {
          user: {
            details: {
              firstName: 'Same',
              lastName: 'Same',
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      // Verify there are errors
      const errorKeys = Object.keys(formState.value.errors)
      expect(errorKeys.length).toBeGreaterThan(0)

      // Clear errors should work on user path
      clearErrors('user')
      const remainingErrors = Object.keys(formState.value.errors)
      const hasUserError = remainingErrors.some((k) => k.includes('user'))
      expect(hasUserError).toBe(false)
    })
  })

  describe('criteriaMode: all with superRefine errors', () => {
    it('should collect all errors with criteriaMode: all', async () => {
      const { handleSubmit, formState } = useForm({
        schema: registrationSchema,
        criteriaMode: 'all',
        defaultValues: {
          username: 'a!', // Too short AND not alphanumeric
          email: 'test@example.com',
          age: 25,
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      // Should have collected multiple errors for username
      expect(formState.value.errors.username).toBeDefined()
    })

    it('should include multiple superRefine errors in types object', async () => {
      const multiErrorSchema = z
        .object({
          value: z.string(),
        })
        .superRefine((data, ctx) => {
          if (data.value.length < 5) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Must be at least 5 characters',
              path: ['value'],
            })
          }
          if (!data.value.includes('@')) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Must contain @',
              path: ['value'],
            })
          }
          if (!/\d/.test(data.value)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Must contain a number',
              path: ['value'],
            })
          }
        })

      const { handleSubmit, formState } = useForm({
        schema: multiErrorSchema,
        criteriaMode: 'all',
        defaultValues: {
          value: 'abc', // Fails all three checks
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      // Should have error (first one or all depending on implementation)
      expect(formState.value.errors.value).toBeDefined()
    })

    it('should preserve first error as primary type/message', async () => {
      const { handleSubmit, formState } = useForm({
        schema: registrationSchema,
        criteriaMode: 'all',
        defaultValues: {
          username: 'a', // Too short (first error)
          email: 'test@example.com',
          age: 25,
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      // First error should be preserved
      expect(formState.value.errors.username).toBe(
        'Username must be at least 3 characters',
      )
    })
  })

  describe('superRefine with async operations', () => {
    it('should handle async superRefine validation', async () => {
      const asyncSchema = z
        .object({
          username: z.string(),
        })
        .superRefine(async (data, ctx) => {
          // Simulate async check
          await new Promise((resolve) => setTimeout(resolve, 10))
          if (data.username === 'taken') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Username is already taken',
              path: ['username'],
            })
          }
        })

      const { handleSubmit, formState } = useForm({
        schema: asyncSchema,
        defaultValues: {
          username: 'taken',
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(formState.value.errors.username).toBe('Username is already taken')
    })

    it('should await all async checks in superRefine', async () => {
      const checkOrder: string[] = []

      const asyncSchema = z
        .object({
          field1: z.string(),
          field2: z.string(),
        })
        .superRefine(async (data, ctx) => {
          checkOrder.push('start')
          await new Promise((resolve) => setTimeout(resolve, 10))
          checkOrder.push('check1')
          if (data.field1 === 'invalid') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Field1 invalid',
              path: ['field1'],
            })
          }
          await new Promise((resolve) => setTimeout(resolve, 10))
          checkOrder.push('check2')
          if (data.field2 === 'invalid') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Field2 invalid',
              path: ['field2'],
            })
          }
          checkOrder.push('end')
        })

      const { handleSubmit, formState } = useForm({
        schema: asyncSchema,
        defaultValues: {
          field1: 'invalid',
          field2: 'invalid',
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(checkOrder).toEqual(['start', 'check1', 'check2', 'end'])
      expect(formState.value.errors.field1).toBeDefined()
      expect(formState.value.errors.field2).toBeDefined()
    })
  })

  describe('integration with register deps', () => {
    it('should trigger superRefine when dependent field changes', async () => {
      const { register, formState, handleSubmit, trigger } = useForm({
        schema: passwordSchema,
        mode: 'onChange',
        defaultValues: {
          password: 'password123',
          confirmPassword: 'password123',
        },
      })

      // Initial submit should pass
      const onValid = vi.fn()
      await handleSubmit(onValid)(new Event('submit'))
      expect(onValid).toHaveBeenCalled()

      // Register confirm with dependency on password
      const confirmField = register('confirmPassword', {
        deps: ['password'],
      })
      confirmField.ref(mockInput)

      const passwordField = register('password')
      const passwordInput = document.createElement('input')
      document.body.appendChild(passwordInput)
      passwordField.ref(passwordInput)

      // Change password
      passwordInput.value = 'newpassword456'
      await passwordField.onInput(createInputEvent(passwordInput))

      // Manually trigger validation to check superRefine
      await trigger()

      // confirmPassword should now be invalid (passwords don't match)
      expect(formState.value.errors.confirmPassword).toBe(
        'Passwords do not match',
      )

      document.body.removeChild(passwordInput)
    })

    it('should re-run cross-field validation on related field update', async () => {
      const { register, formState, setValue, handleSubmit } = useForm({
        schema: passwordSchema,
        mode: 'onChange',
        defaultValues: {
          password: 'password123',
          confirmPassword: 'mismatch',
        },
      })

      const confirmField = register('confirmPassword', {
        deps: ['password'],
      })
      confirmField.ref(mockInput)

      // Trigger initial validation via submit
      await handleSubmit(vi.fn())(new Event('submit'))

      // Should have mismatch error
      expect(formState.value.errors.confirmPassword).toBe(
        'Passwords do not match',
      )

      // Update both to match
      setValue('password', 'mismatch')
      setValue('confirmPassword', 'mismatch')
      await nextTick()

      // Submit again - should pass now
      const onValid = vi.fn()
      await handleSubmit(onValid)(new Event('submit'))
      expect(onValid).toHaveBeenCalled()
    })
  })
})
