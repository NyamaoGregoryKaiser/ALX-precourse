import prisma from '../../config/prisma';
import { AppError } from '../../utils/appError';
import { StatusCodes } from 'http-status-codes';
import { hashPassword, comparePasswords } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import { User, Role } from '@prisma/client';

/**
 * Registers a new user with a default MEMBER role.
 * @param userData User registration data.
 * @returns An object containing the JWT token and user details.
 */
export async function registerUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ token: string; user: Omit<User, 'password'> }> {
  const existingUser = await prisma.user.findUnique({ where: { email: userData.email } });
  if (existingUser) {
    throw new AppError('User with this email already exists', StatusCodes.CONFLICT);
  }

  const hashedPassword = await hashPassword(userData.password);

  const newUser = await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword,
      role: Role.MEMBER, // Default role for new registrations
    },
  });

  const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });

  // Return user without password
  const { password, ...userWithoutPassword } = newUser;
  return { token, user: userWithoutPassword };
}

/**
 * Authenticates a user and generates a JWT token upon successful login.
 * @param email User's email.
 * @param password User's password.
 * @returns An object containing the JWT token and user details.
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: Omit<User, 'password'> }> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await comparePasswords(password, user.password))) {
    throw new AppError('Incorrect email or password', StatusCodes.UNAUTHORIZED);
  }

  const token = generateToken({ id: user.id, email: user.email, role: user.role });

  // Return user without password
  const { password: userPassword, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
}
```