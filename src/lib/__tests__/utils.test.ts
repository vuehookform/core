import { describe, it, expect } from 'vitest'
import {
  get,
  set,
  unset,
  has,
  generateId,
  isArrayPath,
  getParentPath,
  getFieldName,
} from '../utils/paths'

describe('path utilities', () => {
  describe('get', () => {
    it('should get top-level property', () => {
      const obj = { name: 'John', age: 30 }

      expect(get(obj, 'name')).toBe('John')
      expect(get(obj, 'age')).toBe(30)
    })

    it('should get nested property', () => {
      const obj = {
        user: {
          name: 'John',
          profile: {
            bio: 'Hello',
          },
        },
      }

      expect(get(obj, 'user.name')).toBe('John')
      expect(get(obj, 'user.profile.bio')).toBe('Hello')
    })

    it('should get array element by index', () => {
      const obj = {
        users: [{ name: 'John' }, { name: 'Jane' }],
      }

      expect(get(obj, 'users.0')).toEqual({ name: 'John' })
      expect(get(obj, 'users.1.name')).toBe('Jane')
    })

    it('should return undefined for non-existent path', () => {
      const obj = { name: 'John' }

      expect(get(obj, 'age')).toBeUndefined()
      expect(get(obj, 'user.name')).toBeUndefined()
    })

    it('should return undefined when traversing through null', () => {
      const obj = { user: null }

      expect(get(obj as Record<string, unknown>, 'user.name')).toBeUndefined()
    })

    it('should return undefined when traversing through undefined', () => {
      const obj = { user: undefined }

      expect(get(obj, 'user.name')).toBeUndefined()
    })

    it('should return entire object when path is empty', () => {
      const obj = { name: 'John' }

      expect(get(obj, '')).toEqual(obj)
    })
  })

  describe('set', () => {
    it('should set top-level property', () => {
      const obj: Record<string, unknown> = {}

      set(obj, 'name', 'John')

      expect(obj.name).toBe('John')
    })

    it('should set nested property', () => {
      const obj: Record<string, unknown> = {}

      set(obj, 'user.name', 'John')

      expect(obj).toEqual({ user: { name: 'John' } })
    })

    it('should set deeply nested property', () => {
      const obj: Record<string, unknown> = {}

      set(obj, 'user.profile.settings.theme', 'dark')

      expect(obj).toEqual({
        user: {
          profile: {
            settings: {
              theme: 'dark',
            },
          },
        },
      })
    })

    it('should create arrays when index is used', () => {
      const obj: Record<string, unknown> = {}

      set(obj, 'users.0.name', 'John')

      expect(obj).toEqual({ users: [{ name: 'John' }] })
    })

    it('should set value in existing array', () => {
      const obj: Record<string, unknown> = {
        users: [{ name: 'John' }],
      }

      set(obj, 'users.1.name', 'Jane')

      expect(obj.users).toHaveLength(2)
      expect((obj.users as Array<{ name: string }>)[1].name).toBe('Jane')
    })

    it('should overwrite existing value', () => {
      const obj: Record<string, unknown> = { name: 'John' }

      set(obj, 'name', 'Jane')

      expect(obj.name).toBe('Jane')
    })

    it('should do nothing when path is empty', () => {
      const obj: Record<string, unknown> = { name: 'John' }

      set(obj, '', 'value')

      expect(obj).toEqual({ name: 'John' })
    })

    describe('prototype pollution protection', () => {
      it('should not set __proto__', () => {
        const obj: Record<string, unknown> = {}

        set(obj, '__proto__.polluted', true)

        expect(({} as Record<string, unknown>).polluted).toBeUndefined()
      })

      it('should not set constructor', () => {
        const obj: Record<string, unknown> = {}

        set(obj, 'constructor.prototype.polluted', true)

        expect(({} as Record<string, unknown>).polluted).toBeUndefined()
      })

      it('should not set prototype', () => {
        const obj: Record<string, unknown> = {}

        set(obj, 'prototype.polluted', true)

        expect(obj.prototype).toBeUndefined()
      })

      it('should not set nested __proto__', () => {
        const obj: Record<string, unknown> = {}

        set(obj, 'user.__proto__.polluted', true)

        expect(({} as Record<string, unknown>).polluted).toBeUndefined()
      })
    })
  })

  describe('unset', () => {
    it('should delete top-level property', () => {
      const obj: Record<string, unknown> = { name: 'John', age: 30 }

      unset(obj, 'name')

      expect(obj).toEqual({ age: 30 })
    })

    it('should delete nested property', () => {
      const obj: Record<string, unknown> = {
        user: {
          name: 'John',
          age: 30,
        },
      }

      unset(obj, 'user.name')

      expect(obj).toEqual({ user: { age: 30 } })
    })

    it('should do nothing when path does not exist', () => {
      const obj: Record<string, unknown> = { name: 'John' }

      unset(obj, 'age')

      expect(obj).toEqual({ name: 'John' })
    })

    it('should do nothing when nested path does not exist', () => {
      const obj: Record<string, unknown> = { name: 'John' }

      unset(obj, 'user.name')

      expect(obj).toEqual({ name: 'John' })
    })

    it('should do nothing when path is empty', () => {
      const obj: Record<string, unknown> = { name: 'John' }

      unset(obj, '')

      expect(obj).toEqual({ name: 'John' })
    })

    it('should delete array element by index', () => {
      const obj: Record<string, unknown> = {
        users: [{ name: 'John' }, { name: 'Jane' }, { name: 'Bob' }],
      }

      unset(obj, 'users.1')

      // Leaves a hole in the array (undefined at index 1)
      expect((obj.users as unknown[])[0]).toEqual({ name: 'John' })
      expect((obj.users as unknown[])[1]).toBeUndefined()
      expect((obj.users as unknown[])[2]).toEqual({ name: 'Bob' })
    })

    it('should delete nested property in array element', () => {
      const obj: Record<string, unknown> = {
        users: [{ name: 'John', email: 'john@test.com' }],
      }

      unset(obj, 'users.0.email')

      expect((obj.users as { name: string }[])[0]).toEqual({ name: 'John' })
    })

    it('should handle deeply nested paths through arrays', () => {
      const obj: Record<string, unknown> = {
        data: {
          items: [{ nested: { value: 'test', other: 'keep' } }],
        },
      }

      unset(obj, 'data.items.0.nested.value')

      expect(
        ((obj.data as Record<string, unknown>).items as unknown[])[0],
      ).toEqual({
        nested: { other: 'keep' },
      })
    })

    it('should gracefully return when intermediate path is null', () => {
      const obj: Record<string, unknown> = {
        user: null,
      }

      // Should not throw - gracefully handles null intermediate paths
      expect(() => unset(obj, 'user.name')).not.toThrow()
      expect(obj.user).toBeNull() // Object unchanged
    })

    it('should do nothing when intermediate path is a primitive', () => {
      const obj: Record<string, unknown> = {
        count: 42,
      }

      expect(() => unset(obj, 'count.value')).not.toThrow()
      expect(obj).toEqual({ count: 42 })
    })
  })

  describe('has', () => {
    it('should return true for existing property', () => {
      const obj = { name: 'John' }

      expect(has(obj, 'name')).toBe(true)
    })

    it('should return true for nested existing property', () => {
      const obj = { user: { name: 'John' } }

      expect(has(obj, 'user.name')).toBe(true)
    })

    it('should return false for non-existent property', () => {
      const obj = { name: 'John' }

      expect(has(obj, 'age')).toBe(false)
    })

    it('should return false for non-existent nested property', () => {
      const obj = { name: 'John' }

      expect(has(obj, 'user.name')).toBe(false)
    })

    it('should return true for property with falsy value', () => {
      const obj = { count: 0, active: false, empty: '' }

      expect(has(obj, 'count')).toBe(true)
      expect(has(obj, 'active')).toBe(true)
      expect(has(obj, 'empty')).toBe(true)
    })

    it('should return false for undefined value', () => {
      const obj = { name: undefined }

      expect(has(obj, 'name')).toBe(false)
    })
  })

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      const id3 = generateId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should generate string IDs', () => {
      const id = generateId()

      expect(typeof id).toBe('string')
    })

    it('should generate IDs with field_ prefix', () => {
      const id = generateId()

      expect(id.startsWith('field_')).toBe(true)
    })

    it('should generate many unique IDs', () => {
      const ids = new Set<string>()

      for (let i = 0; i < 1000; i++) {
        ids.add(generateId())
      }

      expect(ids.size).toBe(1000)
    })
  })

  describe('isArrayPath', () => {
    it('should return true for array index path', () => {
      expect(isArrayPath('users.0')).toBe(true)
      expect(isArrayPath('items.42')).toBe(true)
    })

    it('should return true for nested array index', () => {
      expect(isArrayPath('user.addresses.0')).toBe(true)
      expect(isArrayPath('data.items.99')).toBe(true)
    })

    it('should return false for non-array path', () => {
      expect(isArrayPath('user.name')).toBe(false)
      expect(isArrayPath('email')).toBe(false)
    })

    it('should return false for path ending in field name with numbers', () => {
      expect(isArrayPath('user.phone1')).toBe(false)
      expect(isArrayPath('item2')).toBe(false)
    })

    it('should return true for single numeric segment', () => {
      expect(isArrayPath('0')).toBe(true)
      expect(isArrayPath('123')).toBe(true)
    })
  })

  describe('getParentPath', () => {
    it('should return parent path', () => {
      expect(getParentPath('user.name')).toBe('user')
      expect(getParentPath('user.profile.bio')).toBe('user.profile')
    })

    it('should return parent for array paths', () => {
      expect(getParentPath('users.0')).toBe('users')
      expect(getParentPath('users.0.name')).toBe('users.0')
    })

    it('should return undefined for top-level path', () => {
      expect(getParentPath('name')).toBeUndefined()
    })

    it('should handle deeply nested paths', () => {
      expect(getParentPath('a.b.c.d.e')).toBe('a.b.c.d')
    })
  })

  describe('getFieldName', () => {
    it('should return last segment of path', () => {
      expect(getFieldName('user.name')).toBe('name')
      expect(getFieldName('user.profile.bio')).toBe('bio')
    })

    it('should return segment for array index', () => {
      expect(getFieldName('users.0')).toBe('0')
      expect(getFieldName('users.0.name')).toBe('name')
    })

    it('should return entire path for single segment', () => {
      expect(getFieldName('name')).toBe('name')
    })

    it('should handle empty path', () => {
      expect(getFieldName('')).toBe('')
    })
  })
})
