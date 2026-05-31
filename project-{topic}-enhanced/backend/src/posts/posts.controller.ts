```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus, Query, Request, UseInterceptors } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PostStatus } from './entities/post.entity';
import { CacheInterceptor } from '@nestjs/cache-manager';

@ApiTags('posts')
@ApiBearerAuth('access-token')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiCreatedResponse({ description: 'The post has been successfully created.' })
  create(@Body() createPostDto: CreatePostDto, @Request() req) {
    return this.postsService.create(createPostDto, req.user.userId);
  }

  @Get()
  @UseInterceptors(CacheInterceptor) // Cache for public listings of posts
  @ApiQuery({ name: 'status', enum: PostStatus, required: false, description: 'Filter posts by status (e.g., PUBLISHED, DRAFT)' })
  @ApiOkResponse({ description: 'List of posts. Can be filtered by status.' })
  findAll(@Query('status') status?: PostStatus) {
    // In a real app, public users only see PUBLISHED posts. Admins/editors/authors see more based on roles.
    // For simplicity, this example allows filtering for all roles that can access this endpoint.
    // A more granular approach would use a custom guard or separate endpoints.
    return this.postsService.findAll(status);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor) // Cache for individual posts
  @ApiOkResponse({ description: 'A single post by ID.' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR) // Authors can edit their own posts
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOkResponse({ description: 'The post has been successfully updated.' })
  async update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto, @Request() req) {
    // Add logic here to ensure authors can only update their own posts.
    // This could be done in a custom guard or service method.
    const post = await this.postsService.findOne(id);
    if (!post) throw new NotFoundException('Post not found.');

    const user = req.user;
    if (user.role === UserRole.AUTHOR && post.author.id !== user.userId) {
      throw new HttpStatus(HttpStatus.FORBIDDEN, 'You are not authorized to update this post.');
    }

    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.EDITOR) // Only admins/editors can delete posts
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOkResponse({ description: 'The post has been successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }
}
```