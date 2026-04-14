import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../utils/jwt';
import { CustomError } from '../../middlewares/error.middleware';

const prisma = new PrismaClient();

export const registerUser = async (email: string, password: string, firstName: string, lastName: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new CustomError('User with this email already exists.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: UserRole.MEMBER, // Default role
    },
  });

  // Exclude password from the returned user object
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new CustomError('Invalid credentials.', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new CustomError('Invalid credentials.', 401);
  }

  const token = generateToken({ userId: user.id, email: user.email, role: user.role });

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
};