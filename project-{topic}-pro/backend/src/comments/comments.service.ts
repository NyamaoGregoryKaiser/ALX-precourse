```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { TasksService } from '../tasks/tasks.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    private tasksService: TasksService,
  ) {}

  async create(taskId: string, createCommentDto: CreateCommentDto, author: User): Promise<Comment> {
    // Validate that the task exists and the user has access to it
    // The taskService.findOne handles the authorization for the task itself
    const task = await this.tasksService.findOne(taskId, author.id);

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      task: task,
      author: author,
    });
    return this.commentsRepository.save(comment);
  }

  async findAllByTask(taskId: string, userId: string): Promise<Comment[]> {
    // Ensure user has access to the task first
    await this.tasksService.findOne(taskId, userId);

    return this.commentsRepository.find({
      where: { task: { id: taskId } },
      relations: ['author'], // Eager load author
      order: { createdAt: 'ASC' }, // Order comments chronologically
    });
  }

  async findOne(id: string, userId: string): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['task', 'task.project', 'task.project.owner', 'task.creator', 'task.assignee', 'author'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${id}" not found`);
    }

    // Authorization check: User must have access to the parent task to view its comments
    // (This check is partially redundant if findOne on task is used first, but good for direct comment access)
    const task = comment.task;
    if (task.project.owner.id !== userId && task.creator.id !== userId && (task.assignee?.id !== userId)) {
      throw new ForbiddenException('You do not have permission to view this comment as you cannot access the associated task');
    }

    return comment;
  }

  async update(id: string, updateCommentDto: UpdateCommentDto, userId: string): Promise<Comment> {
    const comment = await this.findOne(id, userId); // findOne already includes parent task authorization

    // Authorization: Only the original author can update their comment
    if (comment.author.id !== userId) {
      throw new ForbiddenException('You do not have permission to update this comment');
    }

    Object.assign(comment, updateCommentDto);
    return this.commentsRepository.save(comment);
  }

  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['author', 'task', 'task.project', 'task.project.owner'], // Need author and project owner for authorization
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${id}" not found`);
    }

    // Authorization: Only the original author or project owner can delete a comment
    if (comment.author.id !== userId && comment.task.project.owner.id !== userId) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    const result = await this.commentsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Comment with ID "${id}" not found`); // Should not happen
    }
  }
}
```