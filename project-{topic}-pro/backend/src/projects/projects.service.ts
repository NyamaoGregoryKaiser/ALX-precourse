```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  async create(createProjectDto: CreateProjectDto, owner: User): Promise<Project> {
    const project = this.projectsRepository.create({
      ...createProjectDto,
      owner: owner,
    });
    return this.projectsRepository.save(project);
  }

  async findAll(userId: string): Promise<Project[]> {
    // Only return projects owned by or accessible to the user
    // For simplicity, we'll return projects owned by the user.
    // In a real app, you'd have more complex access control (e.g., project members).
    return this.projectsRepository.find({
      where: { owner: { id: userId } },
      relations: ['owner'], // Eager load owner
    });
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['owner', 'tasks', 'tasks.assignee'], // Eager load owner and tasks with their assignees
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }

    // Authorization check: only owner can view
    if (project.owner.id !== userId) {
      throw new ForbiddenException('You do not have permission to view this project');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string): Promise<Project> {
    const project = await this.findOne(id, userId); // findOne already includes authorization check

    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, userId); // findOne already includes authorization check
    const result = await this.projectsRepository.delete(project.id);
    if (result.affected === 0) {
      throw new NotFoundException(`Project with ID "${id}" not found`); // Should not happen if findOne succeeded
    }
  }
}
```