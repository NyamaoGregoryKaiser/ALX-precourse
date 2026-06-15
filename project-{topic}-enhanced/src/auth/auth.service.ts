```typescript
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './jwt-payload.interface';
import { CustomLogger } from '../common/logger/custom-logger';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly logger: CustomLogger,
  ) {}

  /**
   * Registers a new user with the provided credentials.
   * Hashes the password before saving.
   * Throws a ConflictException if the username already exists.
   *
   * @param authCredentialsDto DTO containing username and password.
   * @returns An object containing an access token for the newly registered user.
   */
  async signUp(authCredentialsDto: AuthCredentialsDto): Promise<{ accessToken: string }> {
    const { username, password } = authCredentialsDto;

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.usersRepository.create({
      username,
      password: hashedPassword,
    });

    try {
      await this.usersRepository.save(user);
      this.logger.log(`User registered: ${username}`, AuthService.name);
      return this.signIn(authCredentialsDto); // Automatically sign in the user after registration
    } catch (error) {
      if (error.code === '23505') {
        // duplicate username error code for PostgreSQL
        throw new ConflictException('Username already exists');
      }
      this.logger.error(`Error during user registration: ${error.message}`, error.stack, AuthService.name);
      throw error; // Re-throw other errors
    }
  }

  /**
   * Authenticates a user with the provided credentials.
   * Compares the provided password with the stored hashed password.
   *
   * @param authCredentialsDto DTO containing username and password.
   * @returns An object containing an access token upon successful authentication.
   * @throws UnauthorizedException if credentials are invalid.
   */
  async signIn(authCredentialsDto: AuthCredentialsDto): Promise<{ accessToken: string }> {
    const { username, password } = authCredentialsDto;
    const user = await this.usersRepository.findOne({ where: { username } });

    if (user && (await bcrypt.compare(password, user.password))) {
      const payload: JwtPayload = { username };
      const accessToken: string = await this.jwtService.sign(payload);
      this.logger.log(`User logged in: ${username}`, AuthService.name);
      return { accessToken };
    } else {
      this.logger.warn(`Failed login attempt for user: ${username}`, AuthService.name);
      throw new UnauthorizedException('Please check your login credentials');
    }
  }
}
```