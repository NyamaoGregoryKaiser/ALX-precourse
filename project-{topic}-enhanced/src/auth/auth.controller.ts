```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { AccessTokenDto } from './dto/access-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered.',
    type: AccessTokenDto,
  })
  @ApiResponse({ status: 409, description: 'Username already exists.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  async signUp(
    @Body() authCredentialsDto: AuthCredentialsDto,
  ): Promise<AccessTokenDto> {
    const { accessToken } = await this.authService.signUp(authCredentialsDto);
    return { accessToken };
  }

  @Post('/signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login an existing user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in.',
    type: AccessTokenDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  async signIn(
    @Body() authCredentialsDto: AuthCredentialsDto,
  ): Promise<AccessTokenDto> {
    const { accessToken } = await this.authService.signIn(authCredentialsDto);
    return { accessToken };
  }
}
```