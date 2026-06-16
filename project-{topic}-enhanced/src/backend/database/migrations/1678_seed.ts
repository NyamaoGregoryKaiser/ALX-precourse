import { MigrationInterface, QueryRunner } from 'typeorm';
import { User } from '../../entities/User';
import { Project } from '../../entities/Project';
import { Task, TaskPriority, TaskStatus } from '../../entities/Task';
import { hashPassword } from '../../utils/hash';
import { v4 as uuidv4 } from 'uuid';

export class SeedInitialData1678... implements MigrationInterface { // Use a real timestamp
    name = 'SeedInitialData1678...'; // Use a real timestamp

    public async up(queryRunner: QueryRunner): Promise<void> {
        const usersRepository = queryRunner.manager.getRepository(User);
        const projectRepository = queryRunner.manager.getRepository(Project);
        const taskRepository = queryRunner.manager.getRepository(Task);

        // Seed Users
        const hashedPassword1 = await hashPassword('password123');
        const hashedPassword2 = await hashPassword('password456');

        const user1 = usersRepository.create({
            id: uuidv4(),
            username: 'alice_admin',
            email: 'alice@example.com',
            password: hashedPassword1,
            role: 'admin'
        });
        const user2 = usersRepository.create({
            id: uuidv4(),
            username: 'bob_dev',
            email: 'bob@example.com',
            password: hashedPassword2,
            role: 'user'
        });

        await usersRepository.save([user1, user2]);

        // Seed Projects
        const project1 = projectRepository.create({
            id: uuidv4(),
            name: 'Website Redesign',
            description: 'Redesign the company website with a modern look and feel.',
            owner: user1,
            ownerId: user1.id
        });
        const project2 = projectRepository.create({
            id: uuidv4(),
            name: 'API Development',
            description: 'Develop new REST APIs for the mobile application.',
            owner: user2,
            ownerId: user2.id
        });

        await projectRepository.save([project1, project2]);

        // Seed Tasks
        const task1 = taskRepository.create({
            id: uuidv4(),
            title: 'Design UI mockups',
            description: 'Create initial UI mockups for key pages.',
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.HIGH,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
            project: project1,
            projectId: project1.id,
            assignee: user1,
            assigneeId: user1.id
        });

        const task2 = taskRepository.create({
            id: uuidv4(),
            title: 'Implement User Auth',
            description: 'Implement JWT-based authentication for the API.',
            status: TaskStatus.OPEN,
            priority: TaskPriority.HIGH,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 14)),
            project: project2,
            projectId: project2.id,
            assignee: user2,
            assigneeId: user2.id
        });

        const task3 = taskRepository.create({
            id: uuidv4(),
            title: 'Database Schema Design',
            description: 'Design the database schema for projects and tasks.',
            status: TaskStatus.COMPLETED,
            priority: TaskPriority.MEDIUM,
            dueDate: new Date(new Date().setDate(new Date().getDate() - 3)),
            project: project2,
            projectId: project2.id,
            assignee: user2,
            assigneeId: user2.id
        });

        await taskRepository.save([task1, task2, task3]);

        console.log('Seed data inserted successfully.');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Clean up data in reverse order
        await queryRunner.query(`DELETE FROM task`);
        await queryRunner.query(`DELETE FROM project`);
        await queryRunner.query(`DELETE FROM "user" WHERE email IN ('alice@example.com', 'bob@example.com')`);
        console.log('Seed data removed.');
    }
}
```
*Note: Replace `1678...` with an actual timestamp.*

---

### 3. Configuration & Setup

**`package.json` (Backend)**
```json