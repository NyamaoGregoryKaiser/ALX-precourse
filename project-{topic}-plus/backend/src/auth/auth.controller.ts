```typescript
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterUserDto } from './dto/register-user.dto';
import { ApiBody, ApiTags, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public() // Mark as public, no JWT required
  @UseGuards(LocalAuthGuard) // Use LocalStrategy for authentication
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto, description: 'User login credentials' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User logged in successfully', schema: { example: { accessToken: 'eyJhbGciOiJIUzI1Ni...' } } })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Req() req) { // req.user is populated by LocalAuthGuard
    return this.authService.login(req.user);
  }

  @Public() // Mark as public, no JWT required
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User registered and logged in', schema: { example: { accessToken: 'eyJhbGciOiJIUzI1Ni...' } } })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Username already taken' })
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(
      registerUserDto.username,
      registerUserDto.email,
      registerUserDto.password,
    );
  }
}
```