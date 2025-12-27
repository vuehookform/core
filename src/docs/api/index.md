# API Reference

Complete API documentation for Vue Hook Form.

## Composables

| Composable                           | Description                            |
| ------------------------------------ | -------------------------------------- |
| [useForm](/api/use-form)             | Main form management composable        |
| [useController](/api/use-controller) | Controller for custom input components |
| [useFormState](/api/use-form-state)  | Subscribe to form state changes        |
| [useWatch](/api/use-watch)           | Watch field value changes              |

## Context

| Function                                           | Description                              |
| -------------------------------------------------- | ---------------------------------------- |
| [FormProvider](/api/form-context#formprovider)     | Provide form context to child components |
| [useFormContext](/api/form-context#useformcontext) | Access form context in child components  |

## Types

| Type                                        | Description             |
| ------------------------------------------- | ----------------------- |
| [UseFormOptions](/api/types#useformoptions) | Options for useForm     |
| [UseFormReturn](/api/types#useformreturn)   | Return value of useForm |
| [FormState](/api/types#formstate)           | Form state object       |
| [FieldArray](/api/types#fieldarray)         | Field array manager     |
| [Path](/api/types#path)                     | Type-safe field paths   |

## Quick Reference

### useForm

```typescript
const {
  register, // Register an input
  handleSubmit, // Handle form submission
  formState, // Reactive form state
  fields, // Get field array manager
  setValue, // Set field value
  getValue, // Get field value
  getValues, // Get all values
  reset, // Reset form
  trigger, // Trigger validation
  watch, // Watch field values
  setError, // Set field error
  clearErrors, // Clear errors
} = useForm({
  schema, // Zod schema (required)
  defaultValues, // Initial values
  mode, // Validation mode
  disabled, // Disable form
  shouldUseNativeValidation,
})
```

### register

```typescript
// Uncontrolled (default)
const bindings = register('fieldName')
// Returns: { name, ref, onChange, onBlur }

// Controlled
const { value, ...bindings } = register('fieldName', { controlled: true })
// Returns: { value: Ref, name, onChange, onBlur }
```

### formState

```typescript
formState.value.errors // { [field]: string }
formState.value.isDirty // boolean
formState.value.isValid // boolean
formState.value.isSubmitting // boolean
formState.value.isSubmitted // boolean
formState.value.isSubmitSuccessful // boolean
formState.value.submitCount // number
formState.value.touchedFields // Set<string>
formState.value.dirtyFields // Set<string>
```

### fields

```typescript
const arrayManager = fields('items')

arrayManager.value // Array of { key, index, remove() }
arrayManager.append(value)
arrayManager.prepend(value)
arrayManager.insert(index, value)
arrayManager.remove(index)
arrayManager.swap(indexA, indexB)
arrayManager.move(from, to)
arrayManager.replace(values)
```
