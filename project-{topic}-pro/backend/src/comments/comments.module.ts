```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Comment } from './entities/comment.entity';
import { TasksModule } from '../tasks/tasks.module'; // To validate task existence
import { UsersModule } from '../users/users.module'; // For author information

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
    TasksModule, // To ensure comments are added to existing tasks
    UsersModule, // For author information (though user is from JWT)
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
```