import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Task title is required'),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    projectId: z.string().uuid('Invalid project ID format'),
    assignedToId: z.string().uuid('Invalid assigned user ID format').optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    title: z.string().min(1, 'Task title is required').optional(),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    projectId: z.string().uuid('Invalid project ID format').optional(),
    assignedToId: z.string().uuid('Invalid assigned user ID format').optional(),
  }).partial(),
});

export const getTaskByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

export const deleteTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});
```