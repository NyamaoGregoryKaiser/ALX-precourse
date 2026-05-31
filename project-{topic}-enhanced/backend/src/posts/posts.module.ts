```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post } from './entities/post.entity';
import { UsersModule } from '../users/users.module'; // Import UsersModule to use UsersService
import { CategoriesModule } from '../categories/categories.module'; // Import CategoriesModule to use CategoriesService

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    UsersModule, // This gives PostsService access to UsersService
    CategoriesModule, // This gives PostsService access to CategoriesService
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
```