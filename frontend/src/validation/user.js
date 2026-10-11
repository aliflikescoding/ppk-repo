import { z } from 'zod'

export const createUserSchema = z.object({
  user_name: z.string().trim().min(1, 'Name is required.').max(50, 'Name must be at most 50 characters.'),
  email: z.string().trim().min(1, 'Email is required.').max(50, 'Email must be at most 50 characters.')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password must be at most 72 bytes.'),
  role: z.enum(['user', 'employee'], { error: 'Select a valid role.' }),
})

export const updateUserSchema = createUserSchema.extend({
  password: z.union([z.literal(''), createUserSchema.shape.password])
    .transform((value) => value === '' ? undefined : value),
  role: createUserSchema.shape.role.optional(),
})

export const registerSchema = createUserSchema.omit({ role: true })

export const loginSchema = z.object({
  email: createUserSchema.shape.email,
  password: z.string().min(1, 'Password is required.')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password must be at most 72 bytes.'),
})
