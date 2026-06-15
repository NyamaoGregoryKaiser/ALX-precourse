```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { AuthModule } from '../auth/auth.module';
import { CustomLogger } from '../common/logger/custom-logger';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), AuthModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CustomLogger],
  exports: [CategoriesService], // Export if other modules need to use CategoriesService
})
export class CategoriesModule {}
```