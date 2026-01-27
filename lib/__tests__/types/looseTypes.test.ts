/**
 * Tests for loose type overloads
 * These tests verify that dynamic paths work without `as never` casts
 */
import { describe, it, expect } from 'vitest'
import { useForm, useController, type LooseControl, type LooseControllerOptions } from '../../index'
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      price: z.number(),
    }),
  ),
})

describe('Loose type overloads', () => {
  it('should allow dynamic paths in register without casts', () => {
    const { register, fields } = useForm({
      schema,
      defaultValues: { items: [{ name: 'Item 1', price: 10 }] },
    })
    const items = fields('items')

    items.value.forEach((field) => {
      // Dynamic path - should compile without `as never`
      const result = register(`items.${field.index}.name`)
      expect(result.name).toBe(`items.${field.index}.name`)
    })
  })

  it('should allow dynamic paths in setValue without casts', () => {
    const { setValue, getValues, fields } = useForm({
      schema,
      defaultValues: { items: [{ name: 'Item 1', price: 10 }] },
    })
    const items = fields('items')

    items.value.forEach((field) => {
      // Should compile without cast
      setValue(`items.${field.index}.price`, 20)
      expect(getValues(`items.${field.index}.price`)).toBe(20)
    })
  })

  it('should allow dynamic paths in watch without casts', () => {
    const { watch, fields } = useForm({
      schema,
      defaultValues: { items: [{ name: 'Test', price: 10 }] },
    })
    const items = fields('items')

    items.value.forEach((field) => {
      // Dynamic path returns ComputedRef<unknown>
      const val = watch(`items.${field.index}.name`)
      expect(val.value).toBe('Test')
    })
  })

  it('should allow dynamic paths in getValues without casts', () => {
    const { getValues, fields } = useForm({
      schema,
      defaultValues: { items: [{ name: 'Test', price: 10 }] },
    })
    const items = fields('items')

    items.value.forEach((field) => {
      const val = getValues(`items.${field.index}.name`)
      expect(val).toBe('Test')
    })
  })

  it('should allow dynamic paths in getFieldState without casts', () => {
    const { getFieldState, register, fields } = useForm({
      schema,
      defaultValues: { items: [{ name: 'Test', price: 10 }] },
    })
    const items = fields('items')

    items.value.forEach((field) => {
      register(`items.${field.index}.name`)
      const state = getFieldState(`items.${field.index}.name`)
      expect(state).toHaveProperty('isDirty')
      expect(state).toHaveProperty('isTouched')
    })
  })

  it('should allow dynamic paths in trigger without casts', async () => {
    const { trigger, fields, register } = useForm({
      schema,
      defaultValues: { items: [{ name: 'Test', price: 10 }] },
    })
    const items = fields('items')

    for (const field of items.value) {
      register(`items.${field.index}.name`)
      // Should compile without cast
      const result = await trigger(`items.${field.index}.name`)
      expect(typeof result).toBe('boolean')
    }
  })

  it('should allow dynamic paths in clearErrors without casts', () => {
    const { clearErrors, fields, setError } = useForm({
      schema,
      defaultValues: { items: [{ name: '', price: 10 }] },
    })
    const items = fields('items')

    items.value.forEach((field) => {
      setError(`items.${field.index}.name`, { message: 'Test error' })
      // Should compile without cast
      clearErrors(`items.${field.index}.name`)
    })
  })

  it('should allow dynamic paths in setError without casts', () => {
    const { setError, getFieldState, register, fields } = useForm({
      schema,
      defaultValues: { items: [{ name: 'Test', price: 10 }] },
    })
    const items = fields('items')

    items.value.forEach((field) => {
      register(`items.${field.index}.name`)
      // Should compile without cast
      setError(`items.${field.index}.name`, { message: 'Error' })
      const state = getFieldState(`items.${field.index}.name`)
      expect(state.error).toBe('Error')
    })
  })

  it('should allow dynamic paths in resetField without casts', () => {
    const { resetField, setValue, getValues, fields } = useForm({
      schema,
      defaultValues: { items: [{ name: 'Original', price: 10 }] },
    })
    const items = fields('items')

    items.value.forEach((field) => {
      setValue(`items.${field.index}.name`, 'Modified')
      expect(getValues(`items.${field.index}.name`)).toBe('Modified')
      // Should compile without cast
      resetField(`items.${field.index}.name`)
      expect(getValues(`items.${field.index}.name`)).toBe('Original')
    })
  })

  it('should allow dynamic paths in unregister without casts', () => {
    const { unregister, register, fields } = useForm({
      schema,
      defaultValues: { items: [{ name: 'Test', price: 10 }] },
    })
    const items = fields('items')

    items.value.forEach((field) => {
      register(`items.${field.index}.name`)
      // Should compile without cast
      unregister(`items.${field.index}.name`)
    })
  })

  it('should preserve full type safety for literal paths', () => {
    const { register, setValue, watch, getValues } = useForm({ schema })

    // Literal path - should have full type safety
    const nameResult = register('name')
    expect(nameResult.name).toBe('name')

    // setValue with literal path
    setValue('name', 'test')
    expect(getValues('name')).toBe('test')

    // watch with literal path
    const watchedName = watch('name')
    expect(watchedName.value).toBe('test')
  })

  it('should support LooseControl for reusable components', () => {
    const form = useForm({
      schema,
      defaultValues: { name: 'test' },
    })

    // LooseControl should be assignable from UseFormReturn
    const looseControl: LooseControl = form

    // Should be usable in useController
    const { field, fieldState } = useController({
      name: 'name',
      control: looseControl,
    })

    expect(field.value.value).toBe('test')
    expect(fieldState.value).toHaveProperty('isDirty')
  })

  it('should support LooseControllerOptions', () => {
    const form = useForm({
      schema,
      defaultValues: { name: '' },
    })

    const options: LooseControllerOptions = {
      name: 'name',
      control: form,
      defaultValue: 'default',
    }

    const { field } = useController(options)
    expect(field.name).toBe('name')
  })
})
