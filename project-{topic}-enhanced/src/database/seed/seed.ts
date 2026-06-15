```typescript
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Task } from '../../tasks/entities/task.entity';
import { TaskStatus } from '../../tasks/enum/task-status.enum';
import { TaskPriority } from '../../tasks/enum/task-priority.enum';
import dataSource from '../data-source'; // Import the configured DataSource

async function seed() {
  await dataSource.initialize();
  console.log('Database connection initialized for seeding.');

  const userRepository = dataSource.getRepository(User);
  const categoryRepository = dataSource.getRepository(Category);
  const taskRepository = dataSource.getRepository(Task);

  try {
    // 1. Create Users
    const hashedPassword1 = await bcrypt.hash('password123', 10);
    const hashedPassword2 = await bcrypt.hash('securepass', 10);

    const user1 = userRepository.create({
      username: 'user1',
      password: hashedPassword1,
    });
    const user2 = userRepository.create({
      username: 'user2',
      password: hashedPassword2,
    });

    await userRepository.save([user1, user2]);
    console.log('Users created.');

    // 2. Create Categories for User 1
    const category1User1 = categoryRepository.create({
      name: 'Work',
      description: 'Professional tasks',
      user: user1,
    });
    const category2User1 = categoryRepository.create({
      name: 'Personal',
      description: 'Private tasks and hobbies',
      user: user1,
    });
    const category3User1 = categoryRepository.create({
      name: 'Shopping',
      description: 'Grocery and other shopping lists',
      user: user1,
    });
    await categoryRepository.save([category1User1, category2User1, category3User1]);
    console.log('Categories for user1 created.');

    // 3. Create Categories for User 2
    const category1User2 = categoryRepository.create({
      name: 'Projects',
      description: 'Coding projects',
      user: user2,
    });
    await categoryRepository.save([category1User2]);
    console.log('Categories for user2 created.');

    // 4. Create Tasks for User 1
    const task1User1 = taskRepository.create({
      title: 'Finish API documentation',
      description: 'Complete the Swagger documentation for all endpoints.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 3)), // 3 days from now
      user: user1,
      category: category1User1, // Link to Work category
    });

    const task2User1 = taskRepository.create({
      title: 'Buy groceries',
      description: 'Milk, bread, eggs, vegetables.',
      status: TaskStatus.OPEN,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
      user: user1,
      category: category3User1, // Link to Shopping category
    });

    const task3User1 = taskRepository.create({
      title: 'Read a book',
      description: 'Continue reading "Clean Code".',
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      user: user1,
      category: category2User1, // Link to Personal category
    });

    const task4User1 = taskRepository.create({
      title: 'Call mom',
      description: 'Check in with mom.',
      status: TaskStatus.OPEN,
      priority: TaskPriority.HIGH,
      user: user1,
      category: category2User1,
    });

    const task5User1 = taskRepository.create({
      title: 'Refactor Auth Module',
      description: 'Improve error handling and logging in authentication.',
      status: TaskStatus.OPEN,
      priority: TaskPriority.MEDIUM,
      user: user1,
      category: category1User1,
    });

    await taskRepository.save([
      task1User1,
      task2User1,
      task3User1,
      task4User1,
      task5User1,
    ]);
    console.log('Tasks for user1 created.');

    // 5. Create Tasks for User 2
    const task1User2 = taskRepository.create({
      title: 'Learn NestJS basics',
      description: 'Go through official NestJS documentation and tutorials.',
      status: TaskStatus.OPEN,
      priority: TaskPriority.HIGH,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 days from now
      user: user2,
      category: category1User2, // Link to Projects category
    });

    const task2User2 = taskRepository.create({
      title: 'Setup Docker for project',
      description: 'Containerize the NestJS app and PostgreSQL.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      user: user2,
      category: category1User2,
    });

    await taskRepository.save([task1User2, task2User2]);
    console.log('Tasks for user2 created.');

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed.');
  }
}

seed();
```