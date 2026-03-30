import { DataSource } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '../entities/Task';
import { Project } from '../entities/Project';
import { User } from '../entities/User';

export class TaskSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const taskRepository = dataSource.getRepository(Task);
    const projectRepository = dataSource.getRepository(Project);
    const userRepository = dataSource.getRepository(User);

    const existingTasks = await taskRepository.count();
    if (existingTasks > 0) {
      console.log('Tasks already exist, skipping task seed.');
      return;
    }

    const websiteRedesignProject = await projectRepository.findOne({ where: { name: 'Website Redesign' } });
    const mobileAppProject = await projectRepository.findOne({ where: { name: 'Mobile App Development' } });
    const marketingCampaignProject = await projectRepository.findOne({ where: { name: 'Marketing Campaign Q2' } });

    const adminUser = await userRepository.findOne({ where: { email: 'admin@example.com' } });
    const johnDoe = await userRepository.findOne({ where: { email: 'john.doe@example.com' } });
    const janeSmith = await userRepository.findOne({ where: { email: 'jane.smith@example.com' } });

    if (!websiteRedesignProject || !mobileAppProject || !marketingCampaignProject || !adminUser || !johnDoe || !janeSmith) {
      console.error('Could not find necessary projects or users for task seeding. Run ProjectSeed and UserSeed first.');
      return;
    }

    const tasksData = [
      {
        title: 'Design homepage mockups',
        description: 'Create initial design mockups for the new homepage.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        project: websiteRedesignProject,
        assignedTo: johnDoe,
      },
      {
        title: 'Develop user authentication module',
        description: 'Implement secure user registration and login functionality.',
        status: TaskStatus.OPEN,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        project: mobileAppProject,
        assignedTo: adminUser,
      },
      {
        title: 'Plan social media content',
        description: 'Outline content strategy and schedule posts for Q2 social media.',
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        project: marketingCampaignProject,
        assignedTo: janeSmith,
      },
      {
        title: 'Set up database schema',
        description: 'Define and implement the initial database schema for the mobile app.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        project: mobileAppProject,
        assignedTo: johnDoe,
      },
      {
        title: 'Write blog post for new feature',
        description: 'Draft a blog post announcing the upcoming website features.',
        status: TaskStatus.OPEN,
        priority: TaskPriority.LOW,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        project: websiteRedesignProject,
        assignedTo: janeSmith,
      },
    ];

    await taskRepository.save(tasksData);
    console.log('Tasks seeded successfully!');
  }
}