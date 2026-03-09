```typescript
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User, UserRole } from '../backend/src/users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Post, PostStatus } from '../backend/src/posts/entities/post.entity';

export class MainSeeder implements Seeder {
    async run(
        dataSource: DataSource,
        factoryManager: SeederFactoryManager
    ): Promise<void> {
        const userRepository = dataSource.getRepository(User);
        const postRepository = dataSource.getRepository(Post);

        // Check if admin user already exists
        let adminUser = await userRepository.findOneBy({ email: 'admin@example.com' });

        if (!adminUser) {
            console.log('Seeding admin user...');
            const hashedPassword = await bcrypt.hash('adminpassword', 10);
            adminUser = userRepository.create({
                email: 'admin@example.com',
                firstName: 'Super',
                lastName: 'Admin',
                passwordHash: hashedPassword,
                role: UserRole.ADMIN,
            });
            await userRepository.save(adminUser);
            console.log('Admin user created.');
        } else {
            console.log('Admin user already exists. Skipping seed.');
        }

        // Seed some posts if none exist
        const postCount = await postRepository.count();
        if (postCount === 0) {
            console.log('Seeding initial posts...');
            const posts = [
                {
                    title: 'Welcome to ALX CMS',
                    content: 'This is your first post in the comprehensive CMS. Explore its features!',
                    slug: 'welcome-to-alx-cms',
                    status: PostStatus.PUBLISHED,
                    author: adminUser,
                },
                {
                    title: 'Getting Started with Content',
                    content: 'Learn how to create, edit, and publish content effectively.',
                    slug: 'getting-started-with-content',
                    status: PostStatus.PUBLISHED,
                    author: adminUser,
                },
                {
                    title: 'Draft Post Example',
                    content: 'This post is currently in draft status and not visible publicly.',
                    slug: 'draft-post-example',
                    status: PostStatus.DRAFT,
                    author: adminUser,
                },
            ];

            await postRepository.save(posts);
            console.log('Initial posts seeded.');
        } else {
            console.log('Posts already exist. Skipping seed.');
        }
    }
}
```