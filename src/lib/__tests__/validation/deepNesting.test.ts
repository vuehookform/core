import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useForm } from '../../useForm'
import { z } from 'zod'
import { nextTick } from 'vue'

// 3-level nesting: company.department.manager
const threeLevelSchema = z.object({
  company: z.object({
    name: z.string().min(1, 'Company name required'),
    department: z.object({
      name: z.string().min(1, 'Department name required'),
      code: z.string().length(4, 'Department code must be 4 characters'),
      manager: z.object({
        name: z.string().min(2, 'Manager name required'),
        email: z.string().email('Invalid manager email'),
        employeeId: z.string().min(5, 'Employee ID must be 5+ characters'),
      }),
    }),
  }),
})

// 4-level nesting: org.division.team.member.contact
const fourLevelSchema = z.object({
  org: z.object({
    name: z.string().min(1, 'Org name required'),
    division: z.object({
      name: z.string().min(1, 'Division name required'),
      budget: z.number().min(0, 'Budget must be positive'),
      team: z.object({
        name: z.string().min(1, 'Team name required'),
        size: z.number().min(1, 'Team must have at least 1 member'),
        member: z.object({
          firstName: z.string().min(1, 'First name required'),
          lastName: z.string().min(1, 'Last name required'),
          contact: z.object({
            email: z.string().email('Invalid email'),
            phone: z.string().min(10, 'Phone must be 10+ digits'),
          }),
        }),
      }),
    }),
  }),
})

// Deep nesting with validation at each level
const validatedAtEachLevelSchema = z.object({
  level1: z.object({
    value: z.string().min(1, 'Level 1 value required'),
    level2: z.object({
      value: z.string().min(2, 'Level 2 value min 2 chars'),
      level3: z.object({
        value: z.string().min(3, 'Level 3 value min 3 chars'),
        level4: z.object({
          value: z.string().min(4, 'Level 4 value min 4 chars'),
        }),
      }),
    }),
  }),
})

// Deep nesting with cross-field validation
const deepCrossFieldSchema = z
  .object({
    config: z.object({
      settings: z.object({
        min: z.number(),
        max: z.number(),
      }),
      values: z.object({
        current: z.number(),
      }),
    }),
  })
  .refine((data) => data.config.values.current >= data.config.settings.min, {
    message: 'Current must be >= min',
    path: ['config', 'values', 'current'],
  })
  .refine((data) => data.config.values.current <= data.config.settings.max, {
    message: 'Current must be <= max',
    path: ['config', 'values', 'current'],
  })

// Deep arrays (arrays containing objects with deep nesting)
const deepArraySchema = z.object({
  departments: z.array(
    z.object({
      name: z.string().min(1, 'Department name required'),
      teams: z.array(
        z.object({
          name: z.string().min(1, 'Team name required'),
          lead: z.object({
            name: z.string().min(2, 'Lead name required'),
            email: z.string().email('Invalid lead email'),
          }),
        }),
      ),
    }),
  ),
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

describe('deep nesting validation (3+ levels)', () => {
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

  describe('3-level nesting: company.department.manager', () => {
    it('should validate 3-level deep paths correctly', async () => {
      const onValid = vi.fn()
      const { handleSubmit } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme Corp',
            department: {
              name: 'Engineering',
              code: 'ENG1',
              manager: {
                name: 'John Doe',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      await handleSubmit(onValid)(new Event('submit'))
      expect(onValid).toHaveBeenCalled()
    })

    it('should report errors on company.department.manager.name via getFieldState', async () => {
      const { handleSubmit, getFieldState } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme Corp',
            department: {
              name: 'Engineering',
              code: 'ENG1',
              manager: {
                name: 'J', // Too short
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      const state = getFieldState('company.department.manager.name')
      expect(state.invalid).toBe(true)
      expect(state.error).toBe('Manager name required')
    })

    it('should report errors on company.department.manager.email via getFieldState', async () => {
      const { handleSubmit, getFieldState } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme Corp',
            department: {
              name: 'Engineering',
              code: 'ENG1',
              manager: {
                name: 'John Doe',
                email: 'invalid-email', // Invalid
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      const state = getFieldState('company.department.manager.email')
      expect(state.invalid).toBe(true)
      expect(state.error).toBe('Invalid manager email')
    })

    it('should clear all errors via clearErrors()', async () => {
      const { handleSubmit, getFieldState, clearErrors } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme Corp',
            department: {
              name: 'Engineering',
              code: 'ENG1',
              manager: {
                name: 'J',
                email: 'invalid',
                employeeId: 'E',
              },
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(getFieldState('company.department.manager.name').invalid).toBe(true)
      expect(getFieldState('company.department.manager.email').invalid).toBe(true)
      expect(getFieldState('company.department.manager.employeeId').invalid).toBe(true)

      // Clear all errors
      clearErrors()

      expect(getFieldState('company.department.manager.email').invalid).toBe(false)
      expect(getFieldState('company.department.manager.name').invalid).toBe(false)
    })

    it('should handle partial deep object validation', async () => {
      const { handleSubmit, getFieldState } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: '', // Invalid at level 1
            department: {
              name: '', // Invalid at level 2
              code: 'ABCD',
              manager: {
                name: 'John Doe',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(getFieldState('company.name').error).toBe('Company name required')
      expect(getFieldState('company.department.name').error).toBe('Department name required')
      expect(getFieldState('company.department.manager.name').invalid).toBe(false)
    })
  })

  describe('4-level nesting', () => {
    it('should validate 4-level deep paths', async () => {
      const onValid = vi.fn()
      const { handleSubmit } = useForm({
        schema: fourLevelSchema,
        defaultValues: {
          org: {
            name: 'TechCorp',
            division: {
              name: 'Product',
              budget: 1000000,
              team: {
                name: 'Frontend',
                size: 5,
                member: {
                  firstName: 'Jane',
                  lastName: 'Smith',
                  contact: {
                    email: 'jane@techcorp.com',
                    phone: '1234567890',
                  },
                },
              },
            },
          },
        },
      })

      await handleSubmit(onValid)(new Event('submit'))
      expect(onValid).toHaveBeenCalled()
    })

    it('should report errors at org.division.team.member.contact.email', async () => {
      const { handleSubmit, getFieldState } = useForm({
        schema: fourLevelSchema,
        defaultValues: {
          org: {
            name: 'TechCorp',
            division: {
              name: 'Product',
              budget: 1000000,
              team: {
                name: 'Frontend',
                size: 5,
                member: {
                  firstName: 'Jane',
                  lastName: 'Smith',
                  contact: {
                    email: 'invalid', // Invalid
                    phone: '1234567890',
                  },
                },
              },
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      const state = getFieldState('org.division.team.member.contact.email')
      expect(state.invalid).toBe(true)
      expect(state.error).toBe('Invalid email')
    })

    it('should handle validation at each nesting level', async () => {
      const { handleSubmit, getFieldState } = useForm({
        schema: fourLevelSchema,
        defaultValues: {
          org: {
            name: '', // Level 1 invalid
            division: {
              name: '', // Level 2 invalid
              budget: -100, // Level 2 invalid
              team: {
                name: '', // Level 3 invalid
                size: 0, // Level 3 invalid
                member: {
                  firstName: '', // Level 4 invalid
                  lastName: '',
                  contact: {
                    email: 'bad',
                    phone: '123', // Level 5 invalid
                  },
                },
              },
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(getFieldState('org.name').invalid).toBe(true)
      expect(getFieldState('org.division.name').invalid).toBe(true)
      expect(getFieldState('org.division.budget').invalid).toBe(true)
      expect(getFieldState('org.division.team.name').invalid).toBe(true)
      expect(getFieldState('org.division.team.size').invalid).toBe(true)
      expect(getFieldState('org.division.team.member.firstName').invalid).toBe(true)
      expect(getFieldState('org.division.team.member.contact.phone').invalid).toBe(true)
    })

    it('should validate entire deep structure on full form validation', async () => {
      const { validate, formState } = useForm({
        schema: fourLevelSchema,
        defaultValues: {
          org: {
            name: '',
            division: {
              name: '',
              budget: -1,
              team: {
                name: '',
                size: 0,
                member: {
                  firstName: '',
                  lastName: '',
                  contact: {
                    email: '',
                    phone: '',
                  },
                },
              },
            },
          },
        },
      })

      await validate()

      // Should have errors at all levels
      expect(formState.value.isValid).toBe(false)
    })
  })

  describe('validation at each level', () => {
    it('should validate and report errors at level1.value', async () => {
      const { handleSubmit, getFieldState } = useForm({
        schema: validatedAtEachLevelSchema,
        defaultValues: {
          level1: {
            value: '', // Invalid
            level2: {
              value: 'ab',
              level3: {
                value: 'abc',
                level4: {
                  value: 'abcd',
                },
              },
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(getFieldState('level1.value').error).toBe('Level 1 value required')
    })

    it('should validate and report errors at level1.level2.level3.level4.value', async () => {
      const { handleSubmit, getFieldState } = useForm({
        schema: validatedAtEachLevelSchema,
        defaultValues: {
          level1: {
            value: 'a',
            level2: {
              value: 'ab',
              level3: {
                value: 'abc',
                level4: {
                  value: 'abc', // Too short
                },
              },
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(getFieldState('level1.level2.level3.level4.value').error).toBe(
        'Level 4 value min 4 chars',
      )
    })
  })

  describe('setValue/getValue on deep paths', () => {
    it('should setValue at 3-level path', async () => {
      const { setValue, getValues } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'John',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      setValue('company.department.manager.name', 'Jane Doe')
      await nextTick()

      expect(getValues('company.department.manager.name')).toBe('Jane Doe')
    })

    it('should setValue at 4-level path', async () => {
      const { setValue, getValues } = useForm({
        schema: fourLevelSchema,
        defaultValues: {
          org: {
            name: 'Tech',
            division: {
              name: 'Prod',
              budget: 1000,
              team: {
                name: 'FE',
                size: 5,
                member: {
                  firstName: 'Jane',
                  lastName: 'Smith',
                  contact: {
                    email: 'jane@tech.com',
                    phone: '1234567890',
                  },
                },
              },
            },
          },
        },
      })

      setValue('org.division.team.member.contact.email', 'updated@tech.com')
      await nextTick()

      expect(getValues('org.division.team.member.contact.email')).toBe('updated@tech.com')
    })

    it('should setValue trigger validation with shouldValidate: true', async () => {
      const { setValue, getFieldState } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'John Doe',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      setValue('company.department.manager.email', 'invalid', {
        shouldValidate: true,
      })

      // Wait for async validation
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(getFieldState('company.department.manager.email').invalid).toBe(true)
    })

    it('should setValue mark deep field as dirty', async () => {
      const { setValue, formState } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'John',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      setValue('company.department.manager.name', 'Changed', {
        shouldDirty: true,
      })
      await nextTick()

      expect(formState.value.dirtyFields['company.department.manager.name']).toBe(true)
    })
  })

  describe('watch() on deep nested fields', () => {
    it('should watch single deep path', async () => {
      const { watch, setValue } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'John',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      const watchedName = watch('company.department.manager.name')
      expect(watchedName.value).toBe('John')

      setValue('company.department.manager.name', 'Jane')
      await nextTick()

      expect(watchedName.value).toBe('Jane')
    })

    it('should watch entire deep object', async () => {
      const { watch, setValue } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'John',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      const watchedManager = watch('company.department.manager')

      expect(watchedManager.value).toEqual({
        name: 'John',
        email: 'john@acme.com',
        employeeId: 'EMP001',
      })

      setValue('company.department.manager.name', 'Jane')
      await nextTick()

      expect(watchedManager.value.name).toBe('Jane')
    })
  })

  describe('reset() with deeply nested defaults', () => {
    it('should reset deep fields via reset(newValues)', async () => {
      const { reset, getValues, setValue } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'John',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      setValue('company.department.manager.name', 'Changed')
      setValue('company.department.manager.email', 'changed@acme.com')
      await nextTick()

      // Reset with new explicit values
      reset({
        company: {
          name: 'Acme',
          department: {
            name: 'Eng',
            code: 'ENG1',
            manager: {
              name: 'John',
              email: 'john@acme.com',
              employeeId: 'EMP001',
            },
          },
        },
      })
      await nextTick()

      expect(getValues('company.department.manager.name')).toBe('John')
      expect(getValues('company.department.manager.email')).toBe('john@acme.com')
    })

    it('should reset with new deep default values', async () => {
      const { reset, getValues } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'John',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      reset({
        company: {
          name: 'NewCorp',
          department: {
            name: 'Product',
            code: 'PRD1',
            manager: {
              name: 'Jane',
              email: 'jane@newcorp.com',
              employeeId: 'EMP999',
            },
          },
        },
      })
      await nextTick()

      expect(getValues('company.name')).toBe('NewCorp')
      expect(getValues('company.department.name')).toBe('Product')
      expect(getValues('company.department.manager.name')).toBe('Jane')
    })

    it('should clear deep errors on reset', async () => {
      const { handleSubmit, getFieldState, reset } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'J', // Invalid
                email: 'invalid', // Invalid
                employeeId: 'E', // Invalid
              },
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(getFieldState('company.department.manager.name').invalid).toBe(true)

      reset({
        company: {
          name: 'Acme',
          department: {
            name: 'Eng',
            code: 'ENG1',
            manager: {
              name: 'John Doe',
              email: 'john@acme.com',
              employeeId: 'EMP001',
            },
          },
        },
      })
      await nextTick()

      expect(getFieldState('company.department.manager.name').invalid).toBe(false)
    })
  })

  describe('cross-field validation between deep fields', () => {
    it('should validate current against deep min/max settings', async () => {
      const onValid = vi.fn()
      const { handleSubmit } = useForm({
        schema: deepCrossFieldSchema,
        defaultValues: {
          config: {
            settings: {
              min: 0,
              max: 100,
            },
            values: {
              current: 50, // Valid: between 0 and 100
            },
          },
        },
      })

      await handleSubmit(onValid)(new Event('submit'))
      expect(onValid).toHaveBeenCalled()
    })

    it('should report error on correct deep path', async () => {
      const { handleSubmit, getFieldState } = useForm({
        schema: deepCrossFieldSchema,
        defaultValues: {
          config: {
            settings: {
              min: 10,
              max: 100,
            },
            values: {
              current: 5, // Invalid: below min
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(getFieldState('config.values.current').error).toBe('Current must be >= min')
    })
  })

  describe('deep arrays (arrays with nested objects)', () => {
    it('should validate departments.0.teams.0.lead.name', async () => {
      const { handleSubmit, getFieldState } = useForm({
        schema: deepArraySchema,
        defaultValues: {
          departments: [
            {
              name: 'Engineering',
              teams: [
                {
                  name: 'Frontend',
                  lead: {
                    name: 'J', // Too short
                    email: 'john@company.com',
                  },
                },
              ],
            },
          ],
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      expect(getFieldState('departments.0.teams.0.lead.name').error).toBe('Lead name required')
    })

    it('should handle field array operations with deep nesting', async () => {
      const { fields, getValues, handleSubmit } = useForm({
        schema: deepArraySchema,
        defaultValues: {
          departments: [
            {
              name: 'Engineering',
              teams: [
                {
                  name: 'Frontend',
                  lead: {
                    name: 'John Doe',
                    email: 'john@company.com',
                  },
                },
              ],
            },
          ],
        },
      })

      const teamsField = fields('departments.0.teams')

      teamsField.append({
        name: 'Backend',
        lead: {
          name: 'Jane Smith',
          email: 'jane@company.com',
        },
      })
      await nextTick()

      expect(getValues('departments.0.teams').length).toBe(2)
      expect(getValues('departments.0.teams.1.lead.name')).toBe('Jane Smith')

      const onValid = vi.fn()
      await handleSubmit(onValid)(new Event('submit'))
      expect(onValid).toHaveBeenCalled()
    })
  })

  describe('register on deep paths', () => {
    it('should register field at 3-level path', async () => {
      const { register, getValues } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: '',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      const managerNameField = register('company.department.manager.name')
      managerNameField.ref(mockInput)

      mockInput.value = 'John Manager'
      await managerNameField.onInput(createInputEvent(mockInput))

      expect(getValues('company.department.manager.name')).toBe('John Manager')
    })

    it('should trigger validation on input at deep path', async () => {
      const { register, getFieldState, handleSubmit } = useForm({
        schema: threeLevelSchema,
        mode: 'onChange',
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: '',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      const managerNameField = register('company.department.manager.name')
      managerNameField.ref(mockInput)

      mockInput.value = 'J' // Too short
      await managerNameField.onInput(createInputEvent(mockInput))

      // In onChange mode, should have error after invalid input
      expect(getFieldState('company.department.manager.name').invalid).toBe(true)

      mockInput.value = 'John Doe' // Valid
      await managerNameField.onInput(createInputEvent(mockInput))

      // After valid input, re-submit to verify form is now valid
      const onValid = vi.fn()
      await handleSubmit(onValid)(new Event('submit'))
      expect(onValid).toHaveBeenCalled()
    })
  })

  describe('getFieldState on deep paths', () => {
    it('should return isDirty for deep path', async () => {
      const { register, getFieldState } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'John',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      const field = register('company.department.manager.name')
      field.ref(mockInput)

      expect(getFieldState('company.department.manager.name').isDirty).toBe(false)

      mockInput.value = 'Changed'
      await field.onInput(createInputEvent(mockInput))

      expect(getFieldState('company.department.manager.name').isDirty).toBe(true)
    })

    it('should return isTouched for deep path', async () => {
      const { register, getFieldState } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'John',
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      const field = register('company.department.manager.name')
      field.ref(mockInput)

      expect(getFieldState('company.department.manager.name').isTouched).toBe(false)

      await field.onBlur(createBlurEvent(mockInput))

      expect(getFieldState('company.department.manager.name').isTouched).toBe(true)
    })

    it('should return invalid for deep path with error', async () => {
      const { handleSubmit, getFieldState } = useForm({
        schema: threeLevelSchema,
        defaultValues: {
          company: {
            name: 'Acme',
            department: {
              name: 'Eng',
              code: 'ENG1',
              manager: {
                name: 'J', // Invalid
                email: 'john@acme.com',
                employeeId: 'EMP001',
              },
            },
          },
        },
      })

      await handleSubmit(vi.fn())(new Event('submit'))

      const state = getFieldState('company.department.manager.name')
      expect(state.invalid).toBe(true)
      expect(state.error).toBe('Manager name required')
    })
  })
})
