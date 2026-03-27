import { describe, it, expect } from 'vitest'
import { effectScope } from 'vue'
import { useForm } from '../../useForm'
import { z } from 'zod'

describe('formState', () => {
  it('should have isValid=true when created inside effectScope (like useFormWithGlobalMode)', () => {
    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
    })

    // This mimics how useFormWithGlobalMode creates forms
    const scope = effectScope()
    const form = scope.run(() => {
      return useForm({
        schema,
        defaultValues: { username: '', email: '' },
      })
    })!

    // The critical assertion - isValid should be true
    expect(form.formState.value.isValid).toBe(true)
    expect(Object.keys(form.formState.value.errors).length).toBe(0)

    // Cleanup
    scope.stop()
  })

  it('should have isValid=true initially when form has no errors', () => {
    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
    })

    const { formState } = useForm({
      schema,
      defaultValues: { username: '', email: '' },
    })

    // This is the critical assertion - isValid should be true
    // because no validation has run yet and there are no errors
    expect(formState.value.isValid).toBe(true)
  })

  it('should have isValid=true initially even with invalid default values', () => {
    const schema = z.object({
      username: z.string().min(3),
    })

    const { formState } = useForm({
      schema,
      defaultValues: { username: '' }, // invalid, but not validated yet
    })

    // isValid should still be true because validation hasn't run
    expect(formState.value.isValid).toBe(true)
  })

  it('should have isValid=false after validation fails', async () => {
    const schema = z.object({
      username: z.string().min(3),
    })

    const { formState, handleSubmit } = useForm({
      schema,
      defaultValues: { username: '' },
    })

    // Trigger validation by attempting submit
    const onSubmit = handleSubmit(() => {})
    await onSubmit(new Event('submit'))

    // Now isValid should be false due to validation errors
    expect(formState.value.isValid).toBe(false)
  })

  it('should have isPristine=true initially', () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    })

    const { formState } = useForm({
      schema,
      defaultValues: { email: 'a@b.com', name: 'John' },
    })

    expect(formState.value.isPristine).toBe(true)
  })

  it('should have isPristine=false when a field is dirtied', () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    })

    const { formState, setValue } = useForm({
      schema,
      defaultValues: { email: 'a@b.com', name: 'John' },
    })

    setValue('email', 'changed@b.com')

    expect(formState.value.isPristine).toBe(false)
    expect(formState.value.isDirty).toBe(true)
  })

  it('should have isPristine=true after reset', () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    })

    const { formState, setValue, reset } = useForm({
      schema,
      defaultValues: { email: 'a@b.com', name: 'John' },
    })

    setValue('email', 'changed@b.com')
    expect(formState.value.isPristine).toBe(false)

    reset()
    expect(formState.value.isPristine).toBe(true)
  })

  it('should have canSubmit=true initially', () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    })

    const { formState } = useForm({
      schema,
      defaultValues: { email: 'a@b.com', name: 'John' },
    })

    expect(formState.value.canSubmit).toBe(true)
  })

  it('should have canSubmit=false during submission', async () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    })

    let resolveSubmit: () => void
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve
    })

    const { formState, handleSubmit } = useForm({
      schema,
      defaultValues: { email: 'valid@test.com', name: 'John' },
    })

    const onSubmit = handleSubmit(async () => {
      expect(formState.value.canSubmit).toBe(false)
      resolveSubmit!()
    })

    await onSubmit(new Event('submit'))
    await submitPromise
  })

  it('should have canSubmit=false when form has validation errors', async () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    })

    const { formState, handleSubmit } = useForm({
      schema,
      defaultValues: { email: '', name: '' },
    })

    const onSubmit = handleSubmit(() => {})
    await onSubmit(new Event('submit'))

    expect(formState.value.canSubmit).toBe(false)
  })

  it('should have canSubmit=false when form is disabled', () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    })

    const { formState } = useForm({
      schema,
      defaultValues: { email: 'a@b.com', name: 'John' },
      disabled: true,
    })

    expect(formState.value.canSubmit).toBe(false)
  })
})
