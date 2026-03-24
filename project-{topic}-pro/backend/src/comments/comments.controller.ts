```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { Comment } from './entities/comment.entity';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiBearerAuth('access-token')
@ApiTags('comments')
@Controller('tasks/:taskId/comments') // Nested resource: comments belong to a task
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @Roles(UserRole.USER, UserRole.ADMIN) // Any authenticated user with task access can add comments
  @ApiOperation({ summary: 'Add a new comment to a specific task' })
  @ApiResponse({ status: 201, description: 'The comment has been successfully added.', type: Comment })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not authorized to access task).' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async create(
    @Param('taskId') taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: Request,
  ): Promise<Comment> {
    const author = req.user as User;
    return this.commentsService.create(taskId, createCommentDto, author);
  }

  @Get()
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.VIEWER) // Any authenticated user with task access can view comments
  @ApiOperation({ summary: 'Retrieve all comments for a specific task' })
  @ApiResponse({ status: 200, description: 'List of comments for the task.', type: [Comment] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not authorized to access task).' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async findAllByTask(
    @Param('taskId') taskId: string,
    @Req() req: Request,
  ): Promise<Comment[]> {
    const userId = (req.user as User).id;
    return this.commentsService.findAllByTask(taskId, userId);
  }

  @Patch(':id')
  @Roles(UserRole.USER, UserRole.ADMIN) // Only comment author or admin can update
  @ApiOperation({ summary: 'Update a comment by ID' })
  @ApiResponse({ status: 200, description: 'The comment has been successfully updated.', type: Comment })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not comment author or admin, or not authorized to task).' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req: Request,
  ): Promise<Comment> {
    const userId = (req.user as User).id;
    return this.commentsService.update(id, updateCommentDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.USER, UserRole.ADMIN) // Only comment author or project owner/admin can delete
  @ApiOperation({ summary: 'Delete a comment by ID' })
  @ApiResponse({ status: 204, description: 'The comment has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not comment author/project owner/admin, or not authorized to task).' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  async remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = (req.user as User).id;
    await this.commentsService.remove(id, userId);
  }
}
```