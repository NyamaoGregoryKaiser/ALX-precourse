import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { UsersModule } from '../users/users.module'; // Required to link projects to users
import { AuthModule } from '../auth/auth.module'; // Required for JWT authentication

/**
 * ProjectsModule manages all operations related to project entities.
 * It registers the Project entity with TypeORM and provides the ProjectsService and ProjectsController.
 * It depends on UsersModule (for project owners) and AuthModule (for authentication/authorization).
 */
@Module({
  imports: [
    // Register the Project entity with TypeORM, making the ProjectRepository available
    TypeOrmModule.forFeature([Project]),
    UsersModule, // Needed to validate project owners or assignees
    AuthModule, // Needed for JWT authentication guards
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService], // Export ProjectsService if other modules need to interact with projects
})
export class ProjectsModule {}