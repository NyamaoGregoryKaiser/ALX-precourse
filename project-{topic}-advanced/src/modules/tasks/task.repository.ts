```typescript
import { prisma } from '../../database/prisma-client';
import { Prisma } from '@prisma/client';

interface TaskCreateInput {
  title: string;
  description?: string;
  dueDate?: Date;
  categoryId?: string;
  status?: string;
  userId: string;
}

interface TaskUpdateData {
  title?: string;
  description?: string;
  dueDate?: Date;
  categoryId?: string;
  status?: string;
}

interface TaskFilters {
  status?: string;
  categoryId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const createTask = async (data: TaskCreateInput) => {
  return prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      status: data.status || 'PENDING', // Default status
      userId: data.userId,
      categoryId: data.categoryId,
    },
    include: {
      category: {
        select: { id: true, name: true }
      }
    }
  });
};

export const findAllTasks = async (userId: string, filters: TaskFilters) => {
  const { status, categoryId, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = filters;

  const where: Prisma.TaskWhereInput = {
    userId,
  };

  if (status) {
    where.status = status;
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.TaskOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  return prisma.task.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      category: {
        select: { id: true, name: true }
      }
    }
  });
};

export const findTaskByIdAndUser = async (id: string, userId: string) => {
  return prisma.task.findUnique({
    where: { id, userId },
    include: {
      category: {
        select: { id: true, name: true }
      }
    }
  });
};

export const updateTask = async (id: string, data: TaskUpdateData) => {
  return prisma.task.update({
    where: { id },
    data,
    include: {
      category: {
        select: { id: true, name: true }
      }
    }
  });
};

export const deleteTask = async (id: string) => {
  return prisma.task.delete({
    where: { id },
  });
};
```