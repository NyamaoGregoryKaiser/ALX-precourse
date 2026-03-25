import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

/**
 * UsersModule handles all operations related to user management.
 * It registers the User entity with TypeORM and provides the UsersService and UsersController.
 * This module is designed to be reusable and provides the core user-related functionalities.
 */
@Module({
  imports: [
    // Register the User entity with TypeORM, making the UserRepository available
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export UsersService so other modules (e.g., AuthModule) can use it
})
export class UsersModule {}