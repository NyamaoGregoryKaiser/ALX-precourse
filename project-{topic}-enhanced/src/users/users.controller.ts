```typescript
import {
  Controller,
  Get,
  UseGuards,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token') // Applies JWT Bearer Auth to all endpoints in this controller
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve the authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'The authenticated user profile.',
    type: User,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@GetUser() user: User): User {
    // In a real app, you might want to return a DTO instead of the full User entity
    // to omit sensitive information like password hash.
    const { password, ...result } = user; // Destructure to exclude password
    return result as User;
  }

  @Patch('/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'The updated user profile.',
    type: User,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Username already exists.' })
  updateProfile(
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: User,
  ): Promise<User> {
    return this.usersService.updateUser(user.id, updateUserDto);
  }
}
```