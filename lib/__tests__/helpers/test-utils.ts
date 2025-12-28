import { z } from 'zod'

/**
 * Common test schemas
 */
export const schemas = {
  // Basic schemas
  basic: z.object({
    email: z.email(),
    password: z.string().min(8),
    name: z.string().min(2),
  }),

  basicWithMessages: z.object({
    email: z.email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
  }),

  withOptional: z.object({
    email: z.email(),
    password: z.string().min(8),
    name: z.string().min(2),
    rememberMe: z.boolean().optional(),
  }),

  basicWithAge: z.object({
    email: z.email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    rememberMe: z.boolean().optional(),
    age: z.coerce.number().optional(),
  }),

  extended: z.object({
    email: z.email(),
    password: z.string().min(8),
    name: z.string().min(2),
    bio: z.string().optional(),
    country: z.string().optional(),
    gender: z.string().optional(),
    age: z.coerce.number().optional(),
    birthdate: z.string().optional(),
  }),

  // Nested schemas
  nested: z.object({
    user: z.object({
      email: z.email(),
      profile: z.object({
        bio: z.string(),
        age: z.number().optional(),
      }),
    }),
  }),

  nestedWithMessages: z.object({
    user: z.object({
      email: z.email('Invalid email'),
      profile: z.object({
        bio: z.string().min(1, 'Bio is required'),
      }),
    }),
  }),

  // Array schemas
  withArray: z.object({
    users: z.array(
      z.object({
        name: z.string().min(1),
        email: z.email(),
      }),
    ),
  }),

  withArrayMessages: z.object({
    users: z.array(
      z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.email('Invalid email'),
      }),
    ),
  }),

  simpleArray: z.object({
    tags: z.array(z.string()),
  }),
}

/**
 * Create a mock input element
 */
export function createMockInput(type = 'text'): HTMLInputElement {
  const input = document.createElement('input')
  input.type = type
  return input
}

/**
 * Create a mock checkbox element
 */
export function createMockCheckbox(checked = false): HTMLInputElement {
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.checked = checked
  return checkbox
}

/**
 * Create a mock textarea element
 */
export function createMockTextarea(): HTMLTextAreaElement {
  return document.createElement('textarea')
}

/**
 * Create a mock select element with options
 */
export function createMockSelect(
  options: Array<{ value: string; text: string }>,
): HTMLSelectElement {
  const select = document.createElement('select')
  for (const opt of options) {
    const option = document.createElement('option')
    option.value = opt.value
    option.text = opt.text
    select.appendChild(option)
  }
  return select
}

/**
 * Mount an element to the DOM and return a cleanup function
 */
export function mountElement<T extends HTMLElement>(element: T): () => void {
  document.body.appendChild(element)
  return () => {
    if (document.body.contains(element)) {
      document.body.removeChild(element)
    }
  }
}

/**
 * Create an input event with the target element
 */
export function createInputEvent(element: HTMLInputElement): Event {
  const event = new Event('input', { bubbles: true })
  Object.defineProperty(event, 'target', { value: element, writable: false })
  return event
}

/**
 * Create a blur event with the target element
 */
export function createBlurEvent(element: HTMLInputElement): Event {
  const event = new Event('blur', { bubbles: true })
  Object.defineProperty(event, 'target', { value: element, writable: false })
  return event
}

/**
 * Create a change event with the target element
 */
export function createChangeEvent(element: HTMLElement): Event {
  const event = new Event('change', { bubbles: true })
  Object.defineProperty(event, 'target', { value: element, writable: false })
  return event
}

/**
 * Create a submit event
 */
export function createSubmitEvent(): Event {
  return new Event('submit', { bubbles: true, cancelable: true })
}

/**
 * Helper to wait for async operations
 */
export function waitFor(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Type exports for convenience
 */
export type BasicSchema = typeof schemas.basic
export type BasicWithMessagesSchema = typeof schemas.basicWithMessages
export type BasicWithAgeSchema = typeof schemas.basicWithAge
export type NestedSchema = typeof schemas.nested
export type NestedWithMessagesSchema = typeof schemas.nestedWithMessages
export type WithArraySchema = typeof schemas.withArray
export type WithArrayMessagesSchema = typeof schemas.withArrayMessages
