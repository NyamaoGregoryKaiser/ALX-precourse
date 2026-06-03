```typescript
import { prisma } from '../../database/prisma-client';

interface UserUpdateInput {
  name?: string;
  email?: string;
  password?: string;
  passwordChangedAt?: Date;
}

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      passwordChangedAt: true,
    },
  });
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const updateUser = async (id: string, data: UserUpdateInput) => {
  return prisma.user.update({
    where: { id },
    data: {
      ...data,
      ...(data.password && { passwordChangedAt: new Date() }), // Update passwordChangedAt if password changes
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const deleteUser = async (id: string) => {
  // When a user is deleted, their tasks and categories (if any are associated directly)
  // should also be handled. Here, tasks are simply deleted via CASCADE.
  // Categories are global or could be user-specific. If user-specific,
  // they would also need cascade or explicit deletion.
  return prisma.user.delete({
    where: { id },
  });
};
```