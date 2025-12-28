import { beforeAll, afterAll, beforeEach } from 'vitest'
import { clearWarningCache } from '../utils/devWarnings'

const originalWarn = console.warn

// Suppress vue-hook-form dev warnings during tests to reduce noise
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    const message = args[0]
    if (typeof message === 'string' && message.startsWith('[vue-hook-form]')) {
      return // Suppress vue-hook-form warnings
    }
    originalWarn.apply(console, args)
  }
})

afterAll(() => {
  console.warn = originalWarn
})

// Clear warning cache before each test to prevent cross-test pollution
beforeEach(() => {
  clearWarningCache()
})
