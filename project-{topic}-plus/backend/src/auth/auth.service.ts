```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByUsername(username);
    if (!user) {
      this.logger.warn(`Attempted login with non-existent username: ${username}`, 'AuthService');
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await argon2.verify(user.password, pass);
    if (!isMatch) {
      this.logger.warn(`Attempted login with incorrect password for user: ${username}`, 'AuthService');
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password, ...result } = user; // eslint-disable-line @typescript-eslint/no-unused-vars
    return result;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    this.logger.log(`User ${user.username} logged in successfully.`, 'AuthService');
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(username: string, email: string, password_raw: string) {
    const existingUser = await this.usersService.findOneByUsername(username);
    if (existingUser) {
      throw new UnauthorizedException('Username already taken');
    }
    const hashedPassword = await argon2.hash(password_raw);
    const newUser = await this.usersService.create({
      username,
      email,
      password: hashedPassword,
      role: 'user', // Default role for new registrations
    });
    this.logger.log(`New user registered: ${username}`, 'AuthService');
    const { password, ...result } = newUser; // eslint-disable-line @typescript-eslint/no-unused-vars
    return this.login(result);
  }
}
```