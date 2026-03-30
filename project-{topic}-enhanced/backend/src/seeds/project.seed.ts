import { DataSource } from 'typeorm';
import { Project } from '../entities/Project';
import { User, UserRole } from '../entities/User';

export class ProjectSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const projectRepository = dataSource.getRepository(Project);
    const userRepository = dataSource.getRepository(User);

    const existingProjects = await projectRepository.count();
    if (existingProjects > 0) {
      console.log('Projects already exist, skipping project seed.');
      return;
    }

    const adminUser = await userRepository.findOne({ where: { email: 'admin@example.com' } });
    const johnDoe = await userRepository.findOne({ where: { email: 'john.doe@example.com' } });
    const janeSmith = await userRepository.findOne({ where: { email: 'jane.smith@example.com' } });

    if (!adminUser || !johnDoe || !janeSmith) {
      console.error('Could not find necessary users for project seeding. Run UserSeed first.');
      return;
    }

    const projectsData = [
      {
        name: 'Website Redesign',
        description: 'Redesign the company website for better UX/UI and modern aesthetics.',
        owner: adminUser,
      },
      {
        name: 'Mobile App Development',
        description: 'Develop a new mobile application for iOS and Android platforms.',
        owner: johnDoe,
      },
      {
        name: 'Marketing Campaign Q2',
        description: 'Plan and execute marketing campaigns for the second quarter.',
        owner: janeSmith,
      },
      {
        name: 'Internal Tool Automation',
        description: 'Automate internal workflows and tools to improve efficiency.',
        owner: adminUser,
      },
    ];

    await projectRepository.save(projectsData);
    console.log('Projects seeded successfully!');
  }
}