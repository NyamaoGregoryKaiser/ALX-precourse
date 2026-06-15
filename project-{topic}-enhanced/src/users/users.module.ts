```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule to use JwtAuthGuard
import { CustomLogger } from '../common/logger/custom-logger';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule], // Import AuthModule for JwtAuthGuard
  controllers: [UsersController],
  providers: [UsersService, CustomLogger],
  exports: [UsersService], // Export UsersService if other modules need to interact with user data
})
export class UsersModule {}
```