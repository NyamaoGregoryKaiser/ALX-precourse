```typescript
import { prisma } from '../../database/prisma-client';

export const createCategory = async (name: string, userId: string) => {
  return prisma.category.create({
    data: {
      name,
      userId,
    },
  });
};

export const findAllCategories = async (userId: string) => {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
};

export const findCategoryByIdAndUser = async (id: string, userId: string) => {
  return prisma.category.findUnique({
    where: { id, userId },
  });
};

export const findCategoryByNameAndUser = async (name: string, userId: string) => {
  return prisma.category.findFirst({
    where: { name, userId },
  });
};

export const updateCategory = async (id: string, name: string) => {
  return prisma.category.update({
    where: { id },
    data: { name },
  });
};

export const deleteCategory = async (id: string) => {
  return prisma.category.delete({
    where: { id },
  });
};
```