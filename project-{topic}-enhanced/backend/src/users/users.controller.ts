```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(ThrottlerGuard) // Apply rate limiting to all user endpoints
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN) // Only admins can create users (or specific roles)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiCreatedResponse({ description: 'The user has been successfully created.' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR) // Admins and editors can view all users
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOkResponse({ description: 'List of all users.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR) // Authors can view their own profile, others can view if permitted
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOkResponse({ description: 'A single user by ID.' })
  findOne(@Param('id') id: string) {
    // In a real app, ensure an author can only view their own ID unless they are admin/editor
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR) // Only admins/editors can update users. Users can update themselves (handled by business logic/guard)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOkResponse({ description: 'The user has been successfully updated.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    // In a real app, combine with @Req() to ensure user can only update self, or admin can update anyone
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN) // Only admins can delete users
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOkResponse({ description: 'The user has been successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```