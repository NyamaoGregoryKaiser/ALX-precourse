import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { HttpCacheInterceptor } from '../common/interceptors/cache.interceptor';
import { UseInterceptors } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * UsersController handles all API endpoints for managing users.
 * Access to these endpoints is restricted based on user roles and authentication status.
 */
@ApiTags('Users')
@ApiBearerAuth('JWT-auth') // All endpoints in this controller require JWT authentication
@UseGuards(JwtAuthGuard, ThrottlerGuard) // Apply JWT Auth and Rate Limiting globally for this controller
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Creates a new user. Only accessible by ADMINs.
   * Note: User registration for normal users is handled in AuthController.
   * This endpoint is for administrative user creation.
   * @param createUserDto The DTO containing the new user's data.
   * @returns {Promise<User>} The created user.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Create a new user (Admin access only)',
    description: 'Creates a new user with specified roles. Password will be hashed.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully.',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required.' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  /**
   * Retrieves a list of all users. Only accessible by ADMINs.
   * Results are cached for 60 seconds to improve performance on repeated requests.
   * @returns {Promise<User[]>} A list of users.
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @UseInterceptors(HttpCacheInterceptor) // Use custom cache interceptor
  @CacheKey('all_users') // Define a specific cache key for this endpoint
  @CacheTTL(60) // Cache results for 60 seconds
  @ApiOperation({
    summary: 'Get all users (Admin access only)',
    description: 'Retrieves a list of all registered users. Results are cached.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully.',
    type: [User],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required.' })
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  /**
   * Retrieves a single user by ID. Only accessible by ADMINs.
   * @param id The ID of the user to retrieve.
   * @returns {Promise<User>} The user details.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get a user by ID (Admin access only)',
    description: 'Retrieves details of a specific user by their ID.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the user', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully.',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required.' })
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  /**
   * Updates an existing user's details. Only accessible by ADMINs.
   * @param id The ID of the user to update.
   * @param updateUserDto The DTO containing the updated user data.
   * @returns {Promise<User>} The updated user.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Update a user (Admin access only)',
    description: 'Updates details of an existing user by their ID.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the user', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully.',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or user/email already exists.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required.' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Deletes a user. Only accessible by ADMINs.
   * @param id The ID of the user to delete.
   * @returns {Promise<void>}
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Delete a user (Admin access only)',
    description: 'Deletes a user by their ID.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the user', type: 'string' })
  @ApiResponse({ status: 204, description: 'User deleted successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}