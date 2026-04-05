```typescript
import { Repository } from 'typeorm';
import { Project } from '../entities/Project.entity';
import { User } from '../entities/User.entity';

export class ProjectRepository extends Repository<Project> {
  async findByIdAndUser(projectId: string, userId: string): Promise<Project | null> {
    return this.findOne({
      where: { id: projectId, userId: userId },
      relations: ['user'], // Load user relation if needed
    });
  }

  async findByUserId(userId: string): Promise<Project[]> {
    return this.find({
      where: { userId: userId },
      order: { createdAt: 'DESC' },
    });
  }
}
```