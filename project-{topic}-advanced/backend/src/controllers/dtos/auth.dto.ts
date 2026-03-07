```typescript
import { IsString, Length, IsEmail, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 50, { message: 'Username must be between 3 and 50 characters' })
  username!: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @IsString()
  @Length(6, 100, { message: 'Password must be at least 6 characters long' })
  password!: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email or username cannot be empty' })
  emailOrUsername!: string;

  @IsString()
  @Length(6, 100, { message: 'Password must be at least 6 characters long' })
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token cannot be empty' })
  refreshToken!: string; // This would typically come from an HTTP-only cookie, not body
}
```