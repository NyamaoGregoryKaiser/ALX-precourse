```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule to use JwtAuthGuard
import { CategoriesModule } from '../categories/categories.module';
import { CustomLogger } from '../common/logger/custom-logger';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    AuthModule, // Enables JWT authentication for task endpoints
    CategoriesModule, // Enables linking tasks to categories via CategoriesService
  ],
  controllers: [TasksController],
  providers: [TasksService, CustomLogger],
})
export class TasksModule {}
```