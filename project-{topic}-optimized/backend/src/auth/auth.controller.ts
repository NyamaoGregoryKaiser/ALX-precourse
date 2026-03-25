import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';

/**
 * AuthController handles all API endpoints related to user authentication.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new user.
   * @param registerUserDto The DTO containing user registration details.
   * @returns {Promise<User>} The registered user details (without password).
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists.' })
  async register(@Body() registerUserDto: RegisterUserDto): Promise<User> {
    return this.authService.register(registerUserDto);
  }

  /**
   * Logs in an existing user and returns a JWT access token.
   * @param loginUserDto The DTO containing user login credentials.
   * @returns {Promise<{ access_token: string }>} An object with the JWT.
   */
  @Post('login')
  @ApiOperation({ summary: 'Log in an existing user' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1Ni...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() loginUserDto: LoginUserDto): Promise<{ access_token: string }> {
    return this.authService.login(loginUserDto);
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   * Requires a valid JWT token in the Authorization header.
   * @param req The request object, containing the user details from the JWT.
   * @returns {Promise<User>} The authenticated user's profile.
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth') // Specifies that this endpoint uses JWT authentication
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
    type: User,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@Request() req: any): Promise<User> {
    // The user object is attached to the request by JwtAuthGuard
    return this.authService.getProfile(req.user.userId);
  }
}