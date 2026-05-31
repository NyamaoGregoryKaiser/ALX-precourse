import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.string().optional(),
    managerId: z.string().uuid('Invalid manager ID format'), // Should be a valid user ID (PROJECT_MANAGER role)
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
  body: z.object({
    name: z.string().min(1, 'Project name is required').optional(),
    description: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.string().optional(),
    managerId: z.string().uuid('Invalid manager ID format').optional(),
  }).partial(),
});

export const getProjectByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
});

export const deleteProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
});
```