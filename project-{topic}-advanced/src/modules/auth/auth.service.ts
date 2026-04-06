```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../utils/prisma';
import { ApiError } from '../../utils/apiError';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../config/jwt';
import { UserRole } from '@prisma/client';

export class AuthService {
  /**
   * Registers a new user.
   * @param userData User registration data.
   * @returns JWT token and user details.
   */
  async register(userData: { email: string; password: string; firstName: string; lastName: string }) {
    const existingUser = await prisma.user.findUnique({ where: { email: userData.email } });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: UserRole.USER, // Default role
        // Automatically create a default account for the user
        accounts: {
          create: {
            balance: 0,
            currency: 'USD', // Default currency
            accountNumber: this.generateAccountNumber(),
          },
        },
      },
      include: { accounts: true }, // Include accounts in the response
    });

    const token = this.generateToken(user.id, user.role);
    return { token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, accounts: user.accounts } };
  }

  /**
   * Logs in a user.
   * @param email User email.
   * @param password User password.
   * @returns JWT token and user details.
   */
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const token = this.generateToken(user.id, user.role);
    return { token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } };
  }

  /**
   * Generates a JWT token for a user.
   * @param userId User ID.
   * @param role User role.
   * @returns JWT token string.
   */
  private generateToken(userId: string, role: UserRole): string {
    return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Generates a simple 10-digit account number.
   * In a real system, this would involve more robust collision checks and perhaps a dedicated service.
   */
  private generateAccountNumber(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }
}
```