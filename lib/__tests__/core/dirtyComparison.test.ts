import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { nextTick } from 'vue'
import { useForm } from '../../useForm'

/**
 * Tests for value-comparison based dirty tracking.
 *
 * The dirty state is now based on comparing current values against default values,
 * not just tracking whether a field was ever modified. This means:
 * - Setting a value equal to the default does NOT mark the field dirty
 * - Reverting a field to its default value clears its dirty state
 * - isDirty is true only when actual differences exist
 */

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().optional(),
})

const nestedSchema = z.object({
  user: z.object({
    profile: z.object({
      name: z.string(),
      bio: z.string().optional(),
    }),
  }),
})

const arraySchema = z.object({
  items: z.array(z.string()),
})

function createInputEvent(input: HTMLInputElement): Event {
  const event = new Event('input', { bubbles: true })
  Object.defineProperty(event, 'target', { value: input })
  return event
}

describe('value-comparison based dirty tracking', () => {
  let mockInput: HTMLInputElement

  beforeEach(() => {
    mockInput = document.createElement('input')
    mockInput.type = 'text'
    vi.clearAllMocks()
  })

  describe('basic dirty tracking', () => {
    it('should not be dirty when value equals default', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      // Setting the same value as default should NOT mark dirty
      setValue('email', 'test@example.com')

      expect(formState.value.isDirty).toBe(false)
      expect(formState.value.dirtyFields.email).toBeUndefined()
    })

    it('should be dirty when value differs from default', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      setValue('email', 'changed@example.com')

      expect(formState.value.isDirty).toBe(true)
      expect(formState.value.dirtyFields.email).toBe(true)
    })

    it('should become clean when reverting to default value', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: 'default@example.com', name: 'John' },
      })

      // First, change the value
      setValue('email', 'changed@example.com')
      expect(formState.value.isDirty).toBe(true)
      expect(formState.value.dirtyFields.email).toBe(true)

      // Then, revert to the original value
      setValue('email', 'default@example.com')
      expect(formState.value.isDirty).toBe(false)
      expect(formState.value.dirtyFields.email).toBeUndefined()
    })
  })

  describe('uncontrolled input dirty tracking', () => {
    it('should mark dirty on user input with different value', async () => {
      const { register, formState } = useForm({
        schema,
        defaultValues: { email: 'default@test.com', name: 'John' },
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      mockInput.value = 'changed@test.com'
      await emailField.onInput(createInputEvent(mockInput))

      expect(formState.value.isDirty).toBe(true)
      expect(formState.value.dirtyFields.email).toBe(true)
    })

    it('should become clean when user types back to default', async () => {
      const { register, formState } = useForm({
        schema,
        defaultValues: { email: 'default@test.com', name: 'John' },
      })

      const emailField = register('email')
      emailField.ref(mockInput)

      // Type something different
      mockInput.value = 'changed@test.com'
      await emailField.onInput(createInputEvent(mockInput))
      expect(formState.value.isDirty).toBe(true)

      // Type back to original
      mockInput.value = 'default@test.com'
      await emailField.onInput(createInputEvent(mockInput))
      expect(formState.value.isDirty).toBe(false)
    })
  })

  describe('controlled input dirty tracking', () => {
    it('should mark dirty on controlled input change with different value', async () => {
      const { register, formState } = useForm({
        schema,
        defaultValues: { email: 'default@test.com', name: 'John' },
      })

      const emailField = register('email', { controlled: true })

      emailField.value!.value = 'changed@test.com'
      await nextTick()

      expect(formState.value.isDirty).toBe(true)
      expect(formState.value.dirtyFields.email).toBe(true)
    })

    it('should become clean when controlled input reverts to default', async () => {
      const { register, formState } = useForm({
        schema,
        defaultValues: { email: 'default@test.com', name: 'John' },
      })

      const emailField = register('email', { controlled: true })

      emailField.value!.value = 'changed@test.com'
      await nextTick()
      expect(formState.value.isDirty).toBe(true)

      emailField.value!.value = 'default@test.com'
      await nextTick()
      expect(formState.value.isDirty).toBe(false)
    })
  })

  describe('nested object dirty tracking', () => {
    it('should handle nested paths correctly', () => {
      const { setValue, formState } = useForm({
        schema: nestedSchema,
        defaultValues: {
          user: { profile: { name: 'John', bio: 'Developer' } },
        },
      })

      setValue('user.profile.name', 'Jane')

      expect(formState.value.dirtyFields['user.profile.name']).toBe(true)
      expect(formState.value.isDirty).toBe(true)
    })

    it('should clean nested path when reverted', () => {
      const { setValue, formState } = useForm({
        schema: nestedSchema,
        defaultValues: {
          user: { profile: { name: 'John', bio: 'Developer' } },
        },
      })

      setValue('user.profile.name', 'Jane')
      expect(formState.value.isDirty).toBe(true)

      setValue('user.profile.name', 'John')
      expect(formState.value.dirtyFields['user.profile.name']).toBeUndefined()
      expect(formState.value.isDirty).toBe(false)
    })
  })

  describe('shouldDirty option', () => {
    it('should respect shouldDirty: false even when value differs', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: 'default@example.com', name: 'John' },
      })

      setValue('email', 'changed@example.com', { shouldDirty: false })

      expect(formState.value.isDirty).toBe(false)
      expect(formState.value.dirtyFields.email).toBeUndefined()
    })
  })

  describe('undefined default handling', () => {
    it('should treat undefined default correctly', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { name: 'John' }, // email not provided
      })

      // Setting to empty string when default is undefined should be dirty
      setValue('email', 'test@test.com')
      expect(formState.value.dirtyFields.email).toBe(true)

      // Setting back to undefined should clean
      setValue('email', undefined as unknown as string)
      expect(formState.value.dirtyFields.email).toBeUndefined()
    })
  })

  describe('field array dirty tracking', () => {
    it('should compare arrays by value', () => {
      const { fields, formState } = useForm({
        schema: arraySchema,
        defaultValues: { items: ['a', 'b'] },
      })

      const itemsArray = fields('items')
      itemsArray.append('c')

      expect(formState.value.dirtyFields.items).toBe(true)
      expect(formState.value.isDirty).toBe(true)
    })

    it('should become clean when array is reverted', () => {
      const { fields, formState } = useForm({
        schema: arraySchema,
        defaultValues: { items: ['a', 'b'] },
      })

      const itemsArray = fields('items')
      itemsArray.append('c')
      expect(formState.value.isDirty).toBe(true)

      itemsArray.remove(2) // Remove 'c'
      expect(formState.value.dirtyFields.items).toBeUndefined()
      expect(formState.value.isDirty).toBe(false)
    })
  })

  describe('multiple fields dirty tracking', () => {
    it('should track dirty state independently per field', () => {
      const { setValue, formState } = useForm({
        schema,
        defaultValues: { email: 'test@example.com', name: 'John' },
      })

      setValue('email', 'changed@example.com')
      setValue('name', 'Jane')

      expect(formState.value.dirtyFields.email).toBe(true)
      expect(formState.value.dirtyFields.name).toBe(true)
      expect(formState.value.isDirty).toBe(true)

      // Revert one field
      setValue('email', 'test@example.com')

      expect(formState.value.dirtyFields.email).toBeUndefined()
      expect(formState.value.dirtyFields.name).toBe(true)
      expect(formState.value.isDirty).toBe(true)

      // Revert the other field
      setValue('name', 'John')

      expect(formState.value.dirtyFields.name).toBeUndefined()
      expect(formState.value.isDirty).toBe(false)
    })
  })

  describe('getFieldState isDirty', () => {
    it('should return correct isDirty via getFieldState', () => {
      const { setValue, getFieldState } = useForm({
        schema,
        defaultValues: { email: 'default@test.com', name: 'John' },
      })

      expect(getFieldState('email').isDirty).toBe(false)

      setValue('email', 'changed@test.com')
      expect(getFieldState('email').isDirty).toBe(true)

      setValue('email', 'default@test.com')
      expect(getFieldState('email').isDirty).toBe(false)
    })
  })

  /**
   * Concurrent update scenarios - testing for potential race conditions
   * between shouldDirty option and value-comparison based dirty tracking.
   *
   * These tests verify that the dirty state remains consistent when:
   * - Multiple fields are updated rapidly
   * - User input occurs during programmatic updates
   * - Different shouldDirty options are used concurrently
   */
  describe('concurrent update scenarios', () => {
    let mockEmailInput: HTMLInputElement
    let mockNameInput: HTMLInputElement

    beforeEach(() => {
      mockEmailInput = document.createElement('input')
      mockEmailInput.type = 'text'
      mockNameInput = document.createElement('input')
      mockNameInput.type = 'text'
    })

    describe('rapid multi-field updates', () => {
      it('should maintain consistent dirty state when updating multiple fields rapidly', () => {
        const { setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John', age: 25 },
        })

        // Rapidly update multiple fields in succession
        setValue('email', 'changed@test.com')
        setValue('name', 'Jane')
        setValue('age', 30)

        // All fields should be dirty
        expect(formState.value.dirtyFields.email).toBe(true)
        expect(formState.value.dirtyFields.name).toBe(true)
        expect(formState.value.dirtyFields.age).toBe(true)
        expect(formState.value.isDirty).toBe(true)
      })

      it('should correctly handle rapid revert of multiple fields', () => {
        const { setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John', age: 25 },
        })

        // First, make all fields dirty
        setValue('email', 'changed@test.com')
        setValue('name', 'Jane')
        setValue('age', 30)

        // Rapidly revert all fields to defaults
        setValue('email', 'default@test.com')
        setValue('name', 'John')
        setValue('age', 25)

        // All fields should be clean
        expect(formState.value.dirtyFields.email).toBeUndefined()
        expect(formState.value.dirtyFields.name).toBeUndefined()
        expect(formState.value.dirtyFields.age).toBeUndefined()
        expect(formState.value.isDirty).toBe(false)
      })

      it('should handle interleaved dirty and clean updates correctly', () => {
        const { setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John', age: 25 },
        })

        // Interleaved pattern: dirty, clean, dirty, clean
        setValue('email', 'changed@test.com') // email dirty
        setValue('name', 'John') // name stays clean (same as default)
        setValue('age', 30) // age dirty
        setValue('email', 'default@test.com') // email back to clean

        // Only 'age' should be dirty
        expect(formState.value.dirtyFields.email).toBeUndefined()
        expect(formState.value.dirtyFields.name).toBeUndefined()
        expect(formState.value.dirtyFields.age).toBe(true)
        expect(formState.value.isDirty).toBe(true)
      })
    })

    describe('user input during programmatic setValue', () => {
      it('should handle user input followed immediately by setValue', async () => {
        const { register, setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John' },
        })

        const emailField = register('email')
        emailField.ref(mockEmailInput)

        // Simulate user typing
        mockEmailInput.value = 'user@typed.com'
        await emailField.onInput(createInputEvent(mockEmailInput))

        // Immediately followed by programmatic setValue
        setValue('email', 'programmatic@test.com')

        // The programmatic value should win, and field should be dirty
        expect(formState.value.dirtyFields.email).toBe(true)
        expect(formState.value.isDirty).toBe(true)
      })

      it('should handle setValue followed by user input', async () => {
        const { register, setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John' },
        })

        const emailField = register('email')
        emailField.ref(mockEmailInput)

        // Programmatic setValue first
        setValue('email', 'programmatic@test.com')

        // Then user types (simulating rapid interaction)
        mockEmailInput.value = 'user@typed.com'
        await emailField.onInput(createInputEvent(mockEmailInput))

        // User input should win, field should still be dirty
        expect(formState.value.dirtyFields.email).toBe(true)
        expect(formState.value.isDirty).toBe(true)
      })

      it('should correctly clean when user types back to default after setValue', async () => {
        const { register, setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John' },
        })

        const emailField = register('email')
        emailField.ref(mockEmailInput)

        // Programmatic change
        setValue('email', 'programmatic@test.com')
        expect(formState.value.isDirty).toBe(true)

        // User types back to default
        mockEmailInput.value = 'default@test.com'
        await emailField.onInput(createInputEvent(mockEmailInput))

        // Should be clean again
        expect(formState.value.dirtyFields.email).toBeUndefined()
        expect(formState.value.isDirty).toBe(false)
      })
    })

    describe('shouldDirty option conflicts', () => {
      it('should handle alternating shouldDirty true/false correctly', () => {
        const { setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John' },
        })

        // setValue with shouldDirty: false (should NOT mark dirty)
        setValue('email', 'changed@test.com', { shouldDirty: false })
        expect(formState.value.dirtyFields.email).toBeUndefined()

        // setValue with shouldDirty: true (default) should mark dirty
        setValue('name', 'Jane')
        expect(formState.value.dirtyFields.name).toBe(true)

        // Now update email again with default shouldDirty (true)
        setValue('email', 'another@test.com')
        expect(formState.value.dirtyFields.email).toBe(true)
      })

      it('should not clear existing dirty state when using shouldDirty: false', () => {
        const { setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John' },
        })

        // First, mark email as dirty
        setValue('email', 'changed@test.com')
        expect(formState.value.dirtyFields.email).toBe(true)

        // Now update with shouldDirty: false - dirty state should be cleared
        // because shouldDirty: false is used for server data, which should not
        // be considered a user change
        setValue('email', 'another@test.com', { shouldDirty: false })
        expect(formState.value.dirtyFields.email).toBeUndefined()
      })

      it('should handle shouldDirty: false followed by user input correctly', async () => {
        const { register, setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John' },
        })

        const emailField = register('email')
        emailField.ref(mockEmailInput)

        // Programmatic update that skips dirty marking
        setValue('email', 'programmatic@test.com', { shouldDirty: false })
        expect(formState.value.dirtyFields.email).toBeUndefined()

        // User types - this SHOULD mark dirty based on value comparison
        mockEmailInput.value = 'user@typed.com'
        await emailField.onInput(createInputEvent(mockEmailInput))

        // Field should now be dirty (user-typed value differs from default)
        expect(formState.value.dirtyFields.email).toBe(true)
        expect(formState.value.isDirty).toBe(true)
      })

      it('should handle shouldDirty: false when value matches default', () => {
        const { setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John' },
        })

        // Change to a different value first
        setValue('email', 'changed@test.com')
        expect(formState.value.dirtyFields.email).toBe(true)

        // Now set back to default with shouldDirty: false
        // The dirty state should be cleared because shouldDirty: false
        // indicates this is server/programmatic data, not a user change
        setValue('email', 'default@test.com', { shouldDirty: false })
        expect(formState.value.dirtyFields.email).toBeUndefined()
      })
    })

    describe('controlled and uncontrolled input interactions', () => {
      it('should handle controlled input followed by setValue', async () => {
        const { register, setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John' },
        })

        const emailField = register('email', { controlled: true })

        // Controlled input change
        emailField.value!.value = 'controlled@test.com'
        await nextTick()
        expect(formState.value.dirtyFields.email).toBe(true)

        // Followed by setValue
        setValue('email', 'setValue@test.com')
        expect(formState.value.dirtyFields.email).toBe(true)

        // Revert to default via setValue
        setValue('email', 'default@test.com')
        expect(formState.value.dirtyFields.email).toBeUndefined()
        expect(formState.value.isDirty).toBe(false)
      })

      it('should handle multiple fields with mixed controlled/uncontrolled', async () => {
        const { register, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John' },
        })

        // Email is controlled
        const emailField = register('email', { controlled: true })

        // Name is uncontrolled
        const nameField = register('name')
        nameField.ref(mockNameInput)

        // Update both rapidly
        emailField.value!.value = 'controlled@test.com'
        mockNameInput.value = 'Jane'
        await nameField.onInput(createInputEvent(mockNameInput))
        await nextTick()

        // Both should be dirty
        expect(formState.value.dirtyFields.email).toBe(true)
        expect(formState.value.dirtyFields.name).toBe(true)
        expect(formState.value.isDirty).toBe(true)

        // Revert controlled field
        emailField.value!.value = 'default@test.com'
        await nextTick()

        // Email clean, name still dirty
        expect(formState.value.dirtyFields.email).toBeUndefined()
        expect(formState.value.dirtyFields.name).toBe(true)
        expect(formState.value.isDirty).toBe(true)

        // Revert uncontrolled field
        mockNameInput.value = 'John'
        await nameField.onInput(createInputEvent(mockNameInput))

        // Both clean
        expect(formState.value.dirtyFields.email).toBeUndefined()
        expect(formState.value.dirtyFields.name).toBeUndefined()
        expect(formState.value.isDirty).toBe(false)
      })
    })

    describe('stress test: many rapid updates', () => {
      it('should maintain consistency after 100 rapid setValue calls', () => {
        const { setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John', age: 25 },
        })

        // Perform 100 rapid updates alternating between fields
        for (let i = 0; i < 100; i++) {
          const field = i % 3 === 0 ? 'email' : i % 3 === 1 ? 'name' : 'age'
          const value = field === 'email' ? `test${i}@test.com` : field === 'name' ? `Name${i}` : i

          setValue(field, value as never)
        }

        // All fields should be dirty (none reverted to default)
        expect(formState.value.dirtyFields.email).toBe(true)
        expect(formState.value.dirtyFields.name).toBe(true)
        expect(formState.value.dirtyFields.age).toBe(true)
        expect(formState.value.isDirty).toBe(true)
      })

      it('should correctly track state after rapid toggle between dirty and clean', () => {
        const { setValue, formState } = useForm({
          schema,
          defaultValues: { email: 'default@test.com', name: 'John' },
        })

        // Rapidly toggle email between dirty and clean 50 times
        for (let i = 0; i < 50; i++) {
          setValue('email', 'dirty@test.com')
          setValue('email', 'default@test.com')
        }

        // Should end up clean
        expect(formState.value.dirtyFields.email).toBeUndefined()
        expect(formState.value.isDirty).toBe(false)

        // One more dirty update
        setValue('email', 'final@test.com')
        expect(formState.value.dirtyFields.email).toBe(true)
        expect(formState.value.isDirty).toBe(true)
      })
    })
  })
})
