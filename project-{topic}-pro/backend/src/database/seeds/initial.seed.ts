```typescript
import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { TaskStatus } from '../../tasks/enums/task-status.enum';
import { TaskPriority } from '../../tasks/enums/task-priority.enum';
import { UserRole } from '../../users/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

export class InitialDatabaseSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    const userRepository = connection.getRepository(User);
    const projectRepository = connection.getRepository(Project);
    const taskRepository = connection.getRepository(Task);
    const commentRepository = connection.getRepository(Comment);

    // 1. Create Users
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const adminUser = await userRepository.save({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: hashedPassword,
      roles: [UserRole.ADMIN, UserRole.USER],
    });

    const regularUser = await userRepository.save({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: hashedPassword,
      roles: [UserRole.USER],
    });

    const viewerUser = await userRepository.save({
      firstName: 'Viewer',
      lastName: 'User',
      email: 'viewer@example.com',
      password: hashedPassword,
      roles: [UserRole.VIEWER],
    });

    console.log('Users seeded:', [adminUser.email, regularUser.email, viewerUser.email]);

    // 2. Create Projects
    const project1 = await projectRepository.save({
      name: 'TaskFlow Backend Development',
      description: 'Develop the NestJS backend for the task management system.',
      owner: adminUser,
    });

    const project2 = await projectRepository.save({
      name: 'TaskFlow Frontend UI',
      description: 'Build the React frontend user interface.',
      owner: regularUser,
    });

    console.log('Projects seeded:', [project1.name, project2.name]);

    // 3. Create Tasks
    const task1 = await taskRepository.save({
      title: 'Implement User Authentication',
      description: 'Set up JWT authentication and user registration/login endpoints.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      project: project1,
      creator: adminUser,
      assignee: adminUser,
    });

    const task2 = await taskRepository.save({
      title: 'Design Database Schema',
      description: 'Define entities and relationships for users, projects, tasks, comments, and notifications.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      project: project1,
      creator: adminUser,
      assignee: regularUser,
    });

    const task3 = await taskRepository.save({
      title: 'Create Project List Component',
      description: 'Develop the React component to display a list of projects.',
      status: TaskStatus.OPEN,
      priority: TaskPriority.HIGH,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      project: project2,
      creator: regularUser,
      assignee: regularUser,
    });

    const task4 = await taskRepository.save({
      title: 'Set up Tailwind CSS',
      description: 'Integrate Tailwind CSS for styling the frontend application.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      project: project2,
      creator: regularUser,
      assignee: adminUser, // Admin can be assigned tasks by regular user
    });

    console.log('Tasks seeded:', [task1.title, task2.title, task3.title, task4.title]);


    // 4. Create Comments
    await commentRepository.save({
      content: 'Starting work on this today.',
      task: task1,
      author: adminUser,
    });

    await commentRepository.save({
      content: 'Looks good, merge request sent for review.',
      task: task2,
      author: regularUser,
    });

    await commentRepository.save({
      content: 'Consider adding a search bar to filter projects.',
      task: task3,
      author: adminUser,
    });

    console.log('Comments seeded.');
  }
}
```