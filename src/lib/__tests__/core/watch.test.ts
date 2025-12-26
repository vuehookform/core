import { describe, it, expect } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'
import { nextTick } from 'vue'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

const nestedSchema = z.object({
  user: z.object({
    email: z.string().email(),
    profile: z.object({
      bio: z.string(),
      age: z.number(),
    }),
  }),
})

describe('watch', () => {
  describe('watch entire form', () => {
    it('should return all form data when called without arguments', () => {
      const { watch } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const allValues = watch()

      expect(allValues.value).toEqual({
        email: 'test@example.com',
        password: 'password123',
        name: 'John',
      })
    })

    it('should react to form data changes', async () => {
      const { watch, setValue } = useForm({
        schema,
        defaultValues: {
          email: 'old@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const allValues = watch()

      expect(allValues.value.email).toBe('old@example.com')

      setValue('email', 'new@example.com')
      await nextTick()

      expect(allValues.value.email).toBe('new@example.com')
    })
  })

  describe('watch single field', () => {
    it('should return single field value', () => {
      const { watch } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const emailValue = watch('email')

      expect(emailValue.value).toBe('test@example.com')
    })

    it('should react to single field changes', async () => {
      const { watch, setValue } = useForm({
        schema,
        defaultValues: {
          email: 'old@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const emailValue = watch('email')

      expect(emailValue.value).toBe('old@example.com')

      setValue('email', 'new@example.com')
      await nextTick()

      expect(emailValue.value).toBe('new@example.com')
    })

    it('should return undefined for unset field', () => {
      const { watch } = useForm({ schema })

      const emailValue = watch('email')

      expect(emailValue.value).toBeUndefined()
    })
  })

  describe('watch multiple fields', () => {
    it('should return object with specified field values', () => {
      const { watch } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const watchedValues = watch(['email', 'name'])

      expect(watchedValues.value).toEqual({
        email: 'test@example.com',
        name: 'John',
      })
      expect(watchedValues.value.password).toBeUndefined()
    })

    it('should react to changes in watched fields', async () => {
      const { watch, setValue } = useForm({
        schema,
        defaultValues: {
          email: 'old@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const watchedValues = watch(['email', 'name'])

      setValue('email', 'new@example.com')
      setValue('name', 'Jane')
      await nextTick()

      expect(watchedValues.value).toEqual({
        email: 'new@example.com',
        name: 'Jane',
      })
    })

    it('should not include unwatched fields in result', () => {
      const { watch, setValue } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const watchedValues = watch(['email'])

      setValue('password', 'newpassword123')

      // password should not be in the watched result
      expect(watchedValues.value).toEqual({
        email: 'test@example.com',
      })
    })
  })

  describe('watch nested fields', () => {
    it('should watch nested field value', () => {
      const { watch } = useForm({
        schema: nestedSchema,
        defaultValues: {
          user: {
            email: 'nested@example.com',
            profile: {
              bio: 'Hello world',
              age: 25,
            },
          },
        },
      })

      const emailValue = watch('user.email')

      expect(emailValue.value).toBe('nested@example.com')
    })

    it('should watch deeply nested field value', () => {
      const { watch } = useForm({
        schema: nestedSchema,
        defaultValues: {
          user: {
            email: 'nested@example.com',
            profile: {
              bio: 'Hello world',
              age: 25,
            },
          },
        },
      })

      const bioValue = watch('user.profile.bio')

      expect(bioValue.value).toBe('Hello world')
    })

    it('should react to nested field changes', async () => {
      const { watch, setValue } = useForm({
        schema: nestedSchema,
        defaultValues: {
          user: {
            email: 'old@example.com',
            profile: {
              bio: 'Old bio',
              age: 25,
            },
          },
        },
      })

      const bioValue = watch('user.profile.bio')

      expect(bioValue.value).toBe('Old bio')

      setValue('user.profile.bio', 'New bio')
      await nextTick()

      expect(bioValue.value).toBe('New bio')
    })

    it('should watch multiple nested fields', () => {
      const { watch } = useForm({
        schema: nestedSchema,
        defaultValues: {
          user: {
            email: 'nested@example.com',
            profile: {
              bio: 'Hello world',
              age: 25,
            },
          },
        },
      })

      const watchedValues = watch(['user.email', 'user.profile.age'])

      expect(watchedValues.value).toEqual({
        'user.email': 'nested@example.com',
        'user.profile.age': 25,
      })
    })
  })

  describe('computed behavior', () => {
    it('should return a computed ref', () => {
      const { watch } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const emailValue = watch('email')

      // Should have .value property (computed/ref)
      expect(emailValue).toHaveProperty('value')
      // Should be reactive (can access .value)
      expect(typeof emailValue.value).toBe('string')
    })

    it('should be usable in template binding scenarios', async () => {
      const { watch, setValue } = useForm({
        schema,
        defaultValues: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
        },
      })

      const emailValue = watch('email')

      // Simulate template reading the value
      let displayedValue = emailValue.value

      expect(displayedValue).toBe('test@example.com')

      setValue('email', 'updated@example.com')
      await nextTick()

      // Re-read after change (simulating reactive template update)
      displayedValue = emailValue.value

      expect(displayedValue).toBe('updated@example.com')
    })
  })
})
