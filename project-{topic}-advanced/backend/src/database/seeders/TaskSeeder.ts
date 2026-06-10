```typescript
import { DataSource } from 'typeorm';
import { Task, TaskPriority, TaskStatus } from '../entities/Task';
import { Project } from '../entities/Project';
import { User, UserRole } from '../entities/User';
import { logger } from '../../shared/utils/logger';

export class TaskSeeder {
  constructor(private dataSource: DataSource) {}

  public async run(): Promise<void> {
    const taskRepository = this.dataSource.getRepository(Task);
    const projectRepository = this.dataSource.getRepository(Project);
    const userRepository = this.dataSource.getRepository(User);

    const websiteRedesignProject = await projectRepository.findOneBy({ name: 'Website Redesign' });
    const mobileAppProject = await projectRepository.findOneBy({ name: 'Mobile App Development' });
    const databaseOptProject = await projectRepository.findOneBy({ name: 'Database Optimization' });

    const adminUser = await userRepository.findOneBy({ role: UserRole.ADMIN });
    const user1 = await userRepository.findOneBy({ email: 'john.doe@example.com' });
    const user2 = await userRepository.findOneBy({ email: 'jane.doe@example.com' });

    if (!websiteRedesignProject || !mobileAppProject || !databaseOptProject || !adminUser || !user1 || !user2) {
      logger.error('Projects or users not found for task seeding. Run ProjectSeeder and UserSeeder first.');
      return;
    }

    const tasksData = [
      // Website Redesign Tasks
      {
        title: 'Design wireframes for homepage',
        description: 'Create low-fidelity wireframes for the new homepage layout.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        project: websiteRedesignProject,
        assignedTo: user1,
      },
      {
        title: 'Develop API for user authentication',
        description: 'Implement JWT-based authentication endpoints.',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        project: websiteRedesignProject,
        assignedTo: adminUser,
      },
      {
        title: 'Implement new UI components',
        description: 'Develop reusable React components based on design system.',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        project: websiteRedesignProject,
        assignedTo: user2,
      },
      // Mobile App Development Tasks
      {
        title: 'Setup mobile development environment',
        description: 'Install Xcode, Android Studio, and React Native CLI.',
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
        project: mobileAppProject,
        assignedTo: user1,
      },
      {
        title: 'Design user flow for login/registration',
        description: 'Map out the user journey for authentication process in the mobile app.',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        project: mobileAppProject,
        assignedTo: adminUser,
      },
      // Database Optimization Tasks
      {
        title: 'Review slow queries',
        description: 'Analyze database logs to identify and optimize slow SQL queries.',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        project: databaseOptProject,
        assignedTo: adminUser,
      },
    ];

    for (const taskData of tasksData) {
      // Check if task with similar title and project already exists to avoid duplicates
      const existingTask = await taskRepository.findOne({
        where: { title: taskData.title, project: { id: taskData.project.id } },
      });

      if (!existingTask) {
        const task = taskRepository.create(taskData);
        await taskRepository.save(task);
        logger.info(`Task created: ${task.title}`);
      } else {
        logger.info(`Task "${taskData.title}" for project "${taskData.project.name}" already exists. Skipping.`);
      }
    }
  }
}
```

#### Middleware