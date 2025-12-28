# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vue Hook Form is a TypeScript-first form library for Vue 3, inspired by React Hook Form. It provides form-level state management with Zod validation, optimized for performance through uncontrolled inputs by default.

## Commands

```bash
npm run build        # Type-check + production build
npm run type-check   # Run vue-tsc type checking
npm run lint         # Run oxlint then eslint with auto-fix
npm run format       # Format lib/ and docs/ with Prettier
npm run docs         # Start VitePress dev server
```

## Architecture

### Library Core (`lib/`)

- **useForm.ts** - Main composable managing form state, validation, and field registration
- **types.ts** - TypeScript types including `Path<T>` for type-safe nested field paths
- **utils/paths.ts** - Utilities for dot-notation object access (`get`, `set`, `unset`)

### Key Design Decisions

**Form-level vs Field-level**: Unlike VeeValidate/Formwerk which manage fields individually, this library uses a single `useForm` composable that manages the entire form state centrally.

**Uncontrolled by Default**: Inputs use DOM refs by default (like React Hook Form) to avoid Vue reactivity overhead during typing. Use `register('field', { controlled: true })` for v-model behavior.

**Zod as Source of Truth**: The Zod schema defines both TypeScript types (via `z.infer`) and runtime validation in one place.

### Validation Modes

- `onSubmit` (default) - Validate only on form submission
- `onBlur` - Validate when field loses focus
- `onChange` - Validate on every input change
- `onTouched` - Validate after field has been touched

### Dynamic Field Arrays

The `fields()` method returns a manager for array fields with stable keys for Vue's reconciliation:

```typescript
const addresses = fields('addresses')
addresses.append({ street: '', city: '' })
addresses.remove(index)
addresses.swap(indexA, indexB)
```

## Tech Stack

- Vue 3 + Composition API
- Vite (rolldown-vite)
- Zod for schema validation
- Pinia (available but not used in core lib)
- oxlint + eslint for linting
- Prettier for formatting

## AI Agent Instructions

When implementing forms with this library, follow these critical rules:

### Path Syntax (CRITICAL)

Always use **dot notation** for all paths, including array indices:

```typescript
// CORRECT
register('user.name')
register('items.0.name')
register(`items.${index}.name`)

// WRONG - will fail
register('items[0].name')
register(`items[${index}].name`)
```

### Field Arrays

1. **Always use `field.key` for v-for keys**, never the index:

   ```vue
   <div v-for="field in items.value" :key="field.key"></div>
   ```

2. **Initialize arrays in defaultValues**:

   ```typescript
   useForm({ schema, defaultValues: { items: [] } })
   ```

3. **Call `fields()` in setup**, not in template:

   ```typescript
   const itemFields = fields('items') // in setup
   ```

4. **Check return values** - operations return `boolean` (false if rejected):
   ```typescript
   if (!items.append({ name: '' })) {
     // maxLength exceeded
   }
   ```

### Controlled vs Uncontrolled

- **Default (uncontrolled)**: Just use `v-bind="register('field')"`
- **Controlled mode**: Required for v-model or custom components:
  ```typescript
  const { value, ...bindings } = register('field', { controlled: true })
  ```
  ```vue
  <CustomInput v-model="value" v-bind="bindings" />
  ```

### Accessing State

Always use `.value` for reactive refs:

```vue
<span v-if="formState.value.errors.email">
  {{ formState.value.errors.email }}
</span>
```

### Quick Reference

See the **Quick Reference** section in [README.md](README.md) for path syntax, field array rules, and common mistakes.
