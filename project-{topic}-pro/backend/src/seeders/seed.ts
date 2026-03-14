import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/user.entity';
import { Workspace } from '../entities/workspace.entity';
import { Project } from '../entities/project.entity';
import { Task, TaskPriority, TaskStatus } from '../entities/task.entity';
import { Comment } from '../entities/comment.entity';
import { Tag } from '../entities/tag.entity';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

const seed = async () => {
    try {
        await AppDataSource.initialize();
        logger.info('Database connected for seeding.');

        // Clear existing data (optional, use with caution in production)
        logger.info('Clearing existing data...');
        await AppDataSource.manager.clear(Comment);
        await AppDataSource.manager.clear(Task);
        await AppDataSource.manager.clear(Project);
        await AppDataSource.manager.clear(Workspace);
        await AppDataSource.manager.clear(Tag);
        await AppDataSource.manager.clear(User);
        logger.info('Existing data cleared.');

        // 1. Create Users
        logger.info('Creating users...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        const adminUser = AppDataSource.manager.create(User, {
            username: 'adminuser',
            email: 'admin@example.com',
            password: hashedPassword,
            role: UserRole.ADMIN,
        });
        await AppDataSource.manager.save(adminUser);

        const memberUser1 = AppDataSource.manager.create(User, {
            username: 'john_doe',
            email: 'john@example.com',
            password: hashedPassword,
            role: UserRole.MEMBER,
        });
        await AppDataSource.manager.save(memberUser1);

        const memberUser2 = AppDataSource.manager.create(User, {
            username: 'jane_smith',
            email: 'jane@example.com',
            password: hashedPassword,
            role: UserRole.MEMBER,
        });
        await AppDataSource.manager.save(memberUser2);
        logger.info('Users created.');

        // 2. Create Workspaces
        logger.info('Creating workspaces...');
        const workspace1 = AppDataSource.manager.create(Workspace, {
            name: 'Development Team Workspace',
            description: 'Workspace for the core development team.',
            owner: adminUser,
        });
        await AppDataSource.manager.save(workspace1);

        const workspace2 = AppDataSource.manager.create(Workspace, {
            name: 'Marketing Campaigns',
            description: 'Managing various marketing initiatives.',
            owner: memberUser1,
        });
        await AppDataSource.manager.save(workspace2);
        logger.info('Workspaces created.');

        // 3. Create Projects
        logger.info('Creating projects...');
        const project1 = AppDataSource.manager.create(Project, {
            name: 'Frontend Rework',
            description: 'Rebuilding the user interface with React.',
            workspace: workspace1,
            owner: adminUser,
        });
        await AppDataSource.manager.save(project1);

        const project2 = AppDataSource.manager.create(Project, {
            name: 'Backend API Optimization',
            description: 'Improving API performance and adding new endpoints.',
            workspace: workspace1,
            owner: adminUser,
        });
        await AppDataSource.manager.save(project2);

        const project3 = AppDataSource.manager.create(Project, {
            name: 'Q3 Product Launch',
            description: 'Tasks related to the Q3 product launch campaign.',
            workspace: workspace2,
            owner: memberUser1,
        });
        await AppDataSource.manager.save(project3);
        logger.info('Projects created.');

        // 4. Create Tags
        logger.info('Creating tags...');
        const tag1 = AppDataSource.manager.create(Tag, { name: 'Bug', color: '#ff0000' });
        const tag2 = AppDataSource.manager.create(Tag, { name: 'Feature', color: '#00ff00' });
        const tag3 = AppDataSource.manager.create(Tag, { name: 'Urgent', color: '#ffcc00' });
        const tag4 = AppDataSource.manager.create(Tag, { name: 'UI/UX', color: '#00ffff' });
        await AppDataSource.manager.save([tag1, tag2, tag3, tag4]);
        logger.info('Tags created.');


        // 5. Create Tasks
        logger.info('Creating tasks...');
        const task1 = AppDataSource.manager.create(Task, {
            title: 'Implement User Authentication UI',
            description: 'Develop login, registration, and logout components.',
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.HIGH,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            project: project1,
            assignee: memberUser1,
            tags: [tag2, tag4]
        });
        await AppDataSource.manager.save(task1);

        const task2 = AppDataSource.manager.create(Task, {
            title: 'Fix database connection error',
            description: 'Investigate and resolve intermittent DB connection issues in staging.',
            status: TaskStatus.OPEN,
            priority: TaskPriority.CRITICAL,
            project: project2,
            assignee: adminUser,
            tags: [tag1, tag3]
        });
        await AppDataSource.manager.save(task2);

        const task3 = AppDataSource.manager.create(Task, {
            title: 'Design new landing page mockups',
            description: 'Create wireframes and high-fidelity mockups for the Q3 launch landing page.',
            status: TaskStatus.REVIEW,
            priority: TaskPriority.MEDIUM,
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            project: project3,
            assignee: memberUser2,
            tags: [tag4]
        });
        await AppDataSource.manager.save(task3);
        logger.info('Tasks created.');

        // 6. Create Comments
        logger.info('Creating comments...');
        const comment1 = AppDataSource.manager.create(Comment, {
            content: 'Started working on this task. Frontend components are almost done.',
            task: task1,
            author: memberUser1,
        });
        await AppDataSource.manager.save(comment1);

        const comment2 = AppDataSource.manager.create(Comment, {
            content: 'Need more details on the exact error logs.',
            task: task2,
            author: adminUser,
        });
        await AppDataSource.manager.save(comment2);
        logger.info('Comments created.');

        logger.info('Seeding complete!');

    } catch (error) {
        logger.error('Seeding failed:', error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
        logger.info('Database connection closed.');
    }
};

seed();