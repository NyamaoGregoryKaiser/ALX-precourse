import { AppDataSource } from '../config/data-source';
import { Task, TaskStatus } from '../entities/Task';
import { Project } from '../entities/Project';

export const TaskRepository = AppDataSource.getRepository(Task).extend({
  async findByIdWithRelations(id: string): Promise<Task | null> {
    return this.findOne({
      where: { id },
      relations: ['project', 'assignedTo'],
    });
  },

  async findByProjectWithRelations(projectId: string): Promise<Task[]> {
    return this.find({
      where: { project: { id: projectId } },
      relations: ['project', 'assignedTo'],
      order: { createdAt: 'ASC' },
    });
  },

  async findByAssignedUserWithRelations(userId: string, status?: TaskStatus): Promise<Task[]> {
    const queryBuilder = this.createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .where('assignedTo.id = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    return queryBuilder.orderBy('task.dueDate', 'ASC').getMany();
  },
});
```

#### `backend/src/validation/auth.validation.ts`
```typescript