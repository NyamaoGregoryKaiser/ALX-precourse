import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/User';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthPayload, RegisterPayload } from './auth.types';
import { CustomError } from '../utils/error';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  async register(payload: RegisterPayload): Promise<User> {
    const { username, email, password } = payload;

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new CustomError('Username already taken', 409);
      }
      if (existingUser.email === email) {
        throw new CustomError('Email already registered', 409);
      }
    }

    const newUser = this.userRepository.create({ username, email, password });
    await this.userRepository.save(newUser);
    return newUser;
  }

  async login(payload: AuthPayload): Promise<string> {
    const { email, password } = payload;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !(await user.validatePassword(password))) {
      throw new CustomError('Invalid credentials', 401);
    }

    const token = jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    return token;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }
}