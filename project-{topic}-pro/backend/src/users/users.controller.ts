```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';
import { Request } from 'express';

@ApiBearerAuth('access-token')
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard) // Apply JWT authentication and role-based authorization to all user routes
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN) // Only admins can create users via this endpoint (registration is public)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.', type: User })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN) // Only admins can view all users
  @ApiOperation({ summary: 'Retrieve all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all users.', type: [User] })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get('profile')
  @Roles(UserRole.USER, UserRole.ADMIN) // Any authenticated user can view their own profile
  @ApiOperation({ summary: 'Retrieve the profile of the authenticated user' })
  @ApiResponse({ status: 200, description: 'Authenticated user profile.', type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(@Req() req: Request): Promise<User> {
    // req.user is populated by JwtStrategy
    const userId = (req.user as User).id;
    const user = await this.usersService.findById(userId);
    // Remove password before returning
    delete user.password;
    return user;
  }


  @Get(':id')
  @Roles(UserRole.ADMIN) // Only admins can view any user by ID
  @ApiOperation({ summary: 'Retrieve a user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'The found user.', type: User })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findById(id);
    // Remove password before returning
    delete user.password;
    return user;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN) // Only admins can update any user
  @ApiOperation({ summary: 'Update a user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'The user has been successfully updated.', type: User })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // Only admins can delete any user
  @ApiOperation({ summary: 'Delete a user by ID (Admin only)' })
  @ApiResponse({ status: 204, description: 'The user has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
```