import { Body, Controller, Post, HttpCode, HttpStatus, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from '../users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.', type: User })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'Email or username already exists.' })
  async register(@Body() registerUserDto: RegisterUserDto): Promise<User> {
    return this.authService.register(registerUserDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login user and get JWT token' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.', type: Object, schema: { example: { access_token: 'jwt.token.here' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body() loginUserDto: LoginUserDto): Promise<{ access_token: string }> {
    return this.authService.login(loginUserDto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Post('profile')
  @ApiOperation({ summary: 'Get current user profile (requires authentication)' })
  @ApiResponse({ status: 200, description: 'User profile.', type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@Request() req): Omit<User, 'password'> {
    // Exclude password from the returned user object
    const { password, ...result } = req.user;
    return result;
  }
}