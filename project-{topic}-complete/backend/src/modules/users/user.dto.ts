```typescript
import { z } from 'zod';
import { UserRole } from './user.entity';

// Zod schema for creating a new user
export const createUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters long.'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters long.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character.'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.CUSTOMER),
});

// Zod schema for updating a user
export const updateUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters long.').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters long.').optional(),
  email: z.string().email('Invalid email address.').optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, 'At least one field must be provided for update.');

// Zod schema for changing user password
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter.')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'New password must contain at least one number.')
    .regex(/[^a-zA-Z0-9]/, 'New password must contain at least one special character.'),
  confirmNewPassword: z.string().min(1, 'Confirm new password is required.'),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'New password and confirm new password do not match.',
  path: ['confirmNewPassword'],
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
```