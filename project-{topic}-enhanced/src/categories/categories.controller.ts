```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { Category } from './entities/category.entity';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ParseIntPipe } from '@nestjs/common';

@ApiTags('Categories')
@ApiBearerAuth('access-token') // Applies JWT Bearer Auth to all endpoints in this controller
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'The category has been successfully created.',
    type: Category,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'Category name already exists for this user.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @GetUser() user: User,
  ): Promise<Category> {
    return this.categoriesService.createCategory(createCategoryDto, user);
  }

  @Get()
  @UseInterceptors(CacheInterceptor) // Cache the response for this endpoint
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve all categories for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'A list of categories.',
    type: [Category],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(
    @GetUser() user: User,
    @Query('name') name?: string,
  ): Promise<Category[]> {
    return this.categoriesService.getCategories(user, name);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve a single category by ID for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'The category details.',
    type: Category,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ): Promise<Category> {
    return this.categoriesService.getCategoryById(id, user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing category by ID for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'The category has been successfully updated.',
    type: Category,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 409, description: 'Category name already exists for this user.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @GetUser() user: User,
  ): Promise<Category> {
    return this.categoriesService.updateCategory(id, updateCategoryDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content for successful deletion
  @ApiOperation({ summary: 'Delete a category by ID for the authenticated user' })
  @ApiResponse({
    status: 204,
    description: 'The category has been successfully deleted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ): Promise<void> {
    await this.categoriesService.deleteCategory(id, user);
  }
}
```