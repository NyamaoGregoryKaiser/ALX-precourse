```typescript
import { DataSource } from 'typeorm';
import { Project, ProjectStatus } from '../entities/Project';
import { User, UserRole } from '../entities/User';
import { logger } from '../../shared/utils/logger';

export class ProjectSeeder {
  constructor(private dataSource: DataSource) {}

  public async run(): Promise<void> {
    const projectRepository = this.dataSource.getRepository(Project);
    const userRepository = this.dataSource.getRepository(User);

    // Get existing users to assign projects to
    const adminUser = await userRepository.findOneBy({ role: UserRole.ADMIN });
    const user1 = await userRepository.findOneBy({ email: 'john.doe@example.com' });

    if (!adminUser || !user1) {
      logger.error('Admin or user1 not found for project seeding. Run UserSeeder first.');
      return;
    }

    const projectsData = [
      {
        name: 'Website Redesign',
        description: 'Redesigning the company website for better UX and modern aesthetics.',
        status: ProjectStatus.IN_PROGRESS,
        createdBy: adminUser,
      },
      {
        name: 'Mobile App Development',
        description: 'Building a new mobile application for iOS and Android platforms.',
        status: ProjectStatus.OPEN,
        createdBy: user1,
      },
      {
        name: 'Database Optimization',
        description: 'Analyzing and optimizing database queries and schema for performance.',
        status: ProjectStatus.COMPLETED,
        createdBy: adminUser,
      },
    ];

    for (const projectData of projectsData) {
      const existingProject = await projectRepository.findOneBy({ name: projectData.name });
      if (!existingProject) {
        const project = projectRepository.create(projectData);
        await projectRepository.save(project);
        logger.info(`Project created: ${project.name}`);
      } else {
        logger.info(`Project "${projectData.name}" already exists. Skipping.`);
      }
    }
  }
}
```