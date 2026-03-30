import { AppDataSource } from '../config/data-source';
import { Project } from '../entities/Project';

export const ProjectRepository = AppDataSource.getRepository(Project).extend({
  async findByIdWithOwner(id: string): Promise<Project | null> {
    return this.findOne({ where: { id }, relations: ['owner'] });
  },

  async findAllByOwner(ownerId: string): Promise<Project[]> {
    return this.find({ where: { owner: { id: ownerId } }, relations: ['owner'], order: { name: 'ASC' } });
  },
});
```

#### `backend/src/repositories/TaskRepository.ts`
```typescript