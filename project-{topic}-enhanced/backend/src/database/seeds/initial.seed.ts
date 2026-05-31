```typescript
import { DataSource } from 'typeorm';
import { runSeeder, Seeder } from 'typeorm-extension';
import { User, UserRole } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Post, PostStatus } from '../../posts/entities/post.entity';
import * as bcrypt from 'bcrypt';

export default class InitialSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const categoryRepository = dataSource.getRepository(Category);
    const postRepository = dataSource.getRepository(Post);

    console.log('Running initial seeder...');

    // 1. Create Users
    const hashedPassword = await bcrypt.hash('password123', 10); // Common password for all seeded users

    const adminUser = userRepository.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await userRepository.save(adminUser);

    const editorUser = userRepository.create({
      username: 'editor',
      email: 'editor@example.com',
      password: hashedPassword,
      role: UserRole.EDITOR,
    });
    await userRepository.save(editorUser);

    const authorUser1 = userRepository.create({
      username: 'john_doe',
      email: 'john.doe@example.com',
      password: hashedPassword,
      role: UserRole.AUTHOR,
    });
    await userRepository.save(authorUser1);

    const authorUser2 = userRepository.create({
      username: 'jane_smith',
      email: 'jane.smith@example.com',
      password: hashedPassword,
      role: UserRole.AUTHOR,
    });
    await userRepository.save(authorUser2);

    console.log('Seeded Users.');

    // 2. Create Categories
    const techCategory = categoryRepository.create({
      name: 'Technology',
      description: 'Latest advancements in tech, software, and hardware.',
    });
    await categoryRepository.save(techCategory);

    const lifestyleCategory = categoryRepository.create({
      name: 'Lifestyle',
      description: 'Tips and insights for daily living, health, and wellness.',
    });
    await categoryRepository.save(lifestyleCategory);

    const travelCategory = categoryRepository.create({
      name: 'Travel',
      description: 'Guides, stories, and recommendations for globetrotters.',
    });
    await categoryRepository.save(travelCategory);

    console.log('Seeded Categories.');

    // 3. Create Posts
    const post1 = postRepository.create({
      title: 'The Future of AI in Content Creation',
      content: 'Exploring how artificial intelligence is revolutionizing the way we create and consume content, from writing assistants to personalized recommendations.',
      thumbnailUrl: 'https://via.placeholder.com/600x400/0000FF/FFFFFF?text=AI_Future',
      status: PostStatus.PUBLISHED,
      author: authorUser1,
      category: techCategory,
      publishedAt: new Date(),
    });
    await postRepository.save(post1);

    const post2 = postRepository.create({
      title: '10 Tips for a Productive Remote Work Setup',
      content: 'A comprehensive guide to setting up an efficient and healthy remote workspace, covering ergonomics, tools, and daily routines.',
      thumbnailUrl: 'https://via.placeholder.com/600x400/FF0000/FFFFFF?text=Remote_Work',
      status: PostStatus.PUBLISHED,
      author: authorUser2,
      category: lifestyleCategory,
      publishedAt: new Date(),
    });
    await postRepository.save(post2);

    const post3 = postRepository.create({
      title: 'Hidden Gems of Southeast Asia',
      content: 'Uncover lesser-known destinations and experiences across Southeast Asia that promise unforgettable adventures away from the crowds.',
      thumbnailUrl: 'https://via.placeholder.com/600x400/00FF00/FFFFFF?text=SE_Asia',
      status: PostStatus.DRAFT, // This post is a draft
      author: authorUser1,
      category: travelCategory,
    });
    await postRepository.save(post3);

    const post4 = postRepository.create({
      title: 'Review: Latest Smartphone Innovations',
      content: 'An in-depth look at the cutting-edge features and design philosophies behind the newest smartphone releases.',
      thumbnailUrl: 'https://via.placeholder.com/600x400/FFFF00/000000?text=Smartphone_Review',
      status: PostStatus.PENDING_REVIEW, // This post is pending review
      author: authorUser2,
      category: techCategory,
    });
    await postRepository.save(post4);

    console.log('Seeded Posts.');
    console.log('Initial seeding complete!');
  }
}
```