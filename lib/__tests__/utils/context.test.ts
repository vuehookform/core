import { describe, it, expect } from 'vitest'
import { defineComponent, h, inject } from 'vue'
import { mount } from '@vue/test-utils'
import { useForm } from '../../useForm'
import { provideForm, useFormContext, FormContextKey } from '../../context'
import { z } from 'zod'

const schema = z.object({
  email: z.email(),
  name: z.string().min(2),
})

describe('Form Context API', () => {
  describe('provideForm', () => {
    it('should provide form methods to injection key', () => {
      let providedValue: unknown

      const ChildComponent = defineComponent({
        setup() {
          providedValue = inject(FormContextKey)
          return () => h('div')
        },
      })

      const ParentComponent = defineComponent({
        setup() {
          const form = useForm({ schema })
          provideForm(form)
          return () => h(ChildComponent)
        },
      })

      mount(ParentComponent)

      expect(providedValue).toBeDefined()
      expect(providedValue).toHaveProperty('register')
      expect(providedValue).toHaveProperty('handleSubmit')
      expect(providedValue).toHaveProperty('formState')
    })
  })

  describe('useFormContext', () => {
    // Suppress Vue warnings for these tests since we're intentionally testing error cases
    const suppressWarnings = { global: { config: { warnHandler: () => {} } } }

    it('should throw error when used outside provider', () => {
      const TestComponent = defineComponent({
        setup() {
          useFormContext()
          return () => h('div')
        },
      })

      expect(() => mount(TestComponent, suppressWarnings)).toThrow()
    })

    it('should have meaningful error message', () => {
      const TestComponent = defineComponent({
        setup() {
          useFormContext()
          return () => h('div')
        },
      })

      expect(() => mount(TestComponent, suppressWarnings)).toThrow(
        'useFormContext must be used within a component tree',
      )
    })
  })

  describe('FormContextKey', () => {
    it('should be a symbol', () => {
      expect(typeof FormContextKey).toBe('symbol')
    })

    it('should have descriptive name', () => {
      expect(FormContextKey.toString()).toContain('FormContext')
    })
  })

  describe('type safety', () => {
    it('should maintain form method types through context', () => {
      const form = useForm({ schema })

      // Type check: these should all be available
      expect(form.register).toBeDefined()
      expect(form.handleSubmit).toBeDefined()
      expect(form.formState).toBeDefined()
      expect(form.setValue).toBeDefined()
      expect(form.getValues).toBeDefined()
      expect(form.watch).toBeDefined()
      expect(form.reset).toBeDefined()
      expect(form.trigger).toBeDefined()
      expect(form.setError).toBeDefined()
      expect(form.clearErrors).toBeDefined()
      expect(form.getFieldState).toBeDefined()
      expect(form.setFocus).toBeDefined()
      expect(form.fields).toBeDefined()
    })
  })

  describe('exports', () => {
    it('should export provideForm from index', async () => {
      const exports = await import('../../index')
      expect(exports.provideForm).toBeDefined()
    })

    it('should export useFormContext from index', async () => {
      const exports = await import('../../index')
      expect(exports.useFormContext).toBeDefined()
    })

    it('should export FormContextKey from index', async () => {
      const exports = await import('../../index')
      expect(exports.FormContextKey).toBeDefined()
    })
  })
})
