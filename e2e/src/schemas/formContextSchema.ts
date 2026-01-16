import { z } from 'zod'

export const formContextSchema = z.object({
  parentField: z.string().min(2, 'Parent field must be at least 2 characters'),
  childField: z.string().min(2, 'Child field must be at least 2 characters'),
  grandchildField: z.string().min(2, 'Grandchild field must be at least 2 characters'),
})

export type FormContextSchema = typeof formContextSchema
