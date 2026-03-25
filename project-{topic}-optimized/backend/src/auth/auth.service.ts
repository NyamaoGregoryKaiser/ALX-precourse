import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from '../users/entities/user.entity';
import { LoggerService } from '../utils/logger';

/**
 * Service responsible for user authentication and authorization logic.
 * This includes user registration, login, and JWT token generation.
 */
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private logger: LoggerService,
  ) {}

  /**
   * Registers a new user with the provided credentials.
   * Hashes the password before storing it in the database.
   * @param registerUserDto The DTO containing user registration details.
   * @returns {Promise<User>} The newly created user without their password.
   * @throws {BadRequestException} If a user with the given email or username already exists.
   */
  async register(registerUserDto: RegisterUserDto): Promise<User> {
    this.logger.log(`Attempting to register new user: ${registerUserDto.email}`);

    const existingUserByEmail = await this.usersService.findByEmail(
      registerUserDto.email,
    );
    if (existingUserByEmail) {
      throw new BadRequestException('User with this email already exists.');
    }

    const existingUserByUsername = await this.usersService.findByUsername(
      registerUserDto.username,
    );
    if (existingUserByUsername) {
      throw new BadRequestException('User with this username already exists.');
    }

    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);
    const user = await this.usersService.create({
      ...registerUserDto,
      password: hashedPassword,
    });

    this.logger.log(`User registered successfully: ${user.email}`);
    // Return user without password
    const { password, ...result } = user;
    return result as User;
  }

  /**
   * Validates user credentials for login.
   * Compares the provided password with the hashed password stored in the database.
   * @param username The username of the user attempting to log in.
   * @param pass The plain-text password.
   * @returns {Promise<any>} The user object if credentials are valid, otherwise null.
   */
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username, true); // Fetch with password
    if (user && (await bcrypt.compare(pass, user.password))) {
      // Remove password before returning
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Logs in a user by validating credentials and generating a JWT.
   * @param loginUserDto The DTO containing user login details.
   * @returns {Promise<{ access_token: string }>} An object containing the JWT access token.
   * @throws {UnauthorizedException} If credentials are invalid.
   */
  async login(loginUserDto: LoginUserDto): Promise<{ access_token: string }> {
    this.logger.log(`Attempting to log in user: ${loginUserDto.username}`);
    const user = await this.validateUser(
      loginUserDto.username,
      loginUserDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Generate JWT payload
    const payload = {
      username: user.username,
      sub: user.id, // Subject of the token (user ID)
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);
    this.logger.log(`User logged in successfully: ${user.username}`);

    return {
      access_token: accessToken,
    };
  }

  /**
   * Retrieves a user by their ID. Useful for JWT strategy validation.
   * @param userId The ID of the user to find.
   * @returns {Promise<User>} The user object.
   */
  async getProfile(userId: string): Promise<User> {
    return this.usersService.findOne(userId);
  }
}