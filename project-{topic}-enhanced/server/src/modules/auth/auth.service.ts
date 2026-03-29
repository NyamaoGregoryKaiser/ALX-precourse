import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { Role } from '@/entities/Role';
import { RefreshToken } from '@/entities/RefreshToken';
import { UserRole } from '@/entities/UserRole';
import { ICreateUserPayload } from '@/interfaces/user.interface';
import { ITokenPair, IJwtPayload } from '@/interfaces/auth.interface';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '@/utils/jwt';
import { config } from '@/config';
import { getRedisClient } from '@/config/redis';
import crypto from 'crypto';
import logger from '@/utils/logger';

const userRepository = AppDataSource.getRepository(User);
const roleRepository = AppDataSource.getRepository(Role);
const userRoleRepository = AppDataSource.getRepository(UserRole);
const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
const redisClient = getRedisClient();

/**
 * Register a new user
 * @param userData - User data for registration
 * @returns Registered user
 */
export const registerUser = async (userData: ICreateUserPayload): Promise<User> => {
  if (await userRepository.findOneBy({ email: userData.email })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (await userRepository.findOneBy({ username: userData.username })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
  }

  const user = userRepository.create(userData);
  await userRepository.save(user);

  // Assign default 'user' role if no roles specified, or specified roles
  let targetRoles: Role[] = [];
  if (userData.roleIds && userData.roleIds.length > 0) {
    targetRoles = await roleRepository.findBy({ id: userData.roleIds });
    if (targetRoles.length !== userData.roleIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'One or more specified roles do not exist.');
    }
  } else {
    // Assign default 'user' role
    const defaultRole = await roleRepository.findOneBy({ name: 'user' });
    if (defaultRole) {
      targetRoles.push(defaultRole);
    } else {
      logger.warn('Default "user" role not found. User created without roles.');
    }
  }

  if (targetRoles.length > 0) {
    const userRoles = targetRoles.map(role => userRoleRepository.create({ user, role }));
    await userRoleRepository.save(userRoles);
    user.userRoles = userRoles; // Update user object with assigned roles
  }

  return user;
};

/**
 * Login with username and password
 * @param email - User's email
 * @param password - User's password
 * @returns Object containing user and tokens
 */
export const loginUserWithEmailAndPassword = async (email: string, password: string): Promise<{ user: User; tokens: ITokenPair }> => {
  const user = await userRepository
    .createQueryBuilder('user')
    .addSelect('user.password') // Explicitly select password
    .where('user.email = :email', { email })
    .leftJoinAndSelect('user.userRoles', 'userRoles')
    .leftJoinAndSelect('userRoles.role', 'role')
    .leftJoinAndSelect('role.rolePermissions', 'rolePermissions')
    .leftJoinAndSelect('rolePermissions.permission', 'permission')
    .getOne();

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }

  if (!user.isEmailVerified) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email not verified. Please check your inbox.');
  }

  const tokens = await generateAuthTokens(user);
  return { user, tokens };
};

/**
 * Generate Access and Refresh Tokens for a user.
 * @param user - The user object.
 * @returns An object containing the access token and refresh token.
 */
export const generateAuthTokens = async (user: User): Promise<ITokenPair> => {
  const roles = user.userRoles ? user.userRoles.map(ur => ur.role.name) : [];
  const permissions = Array.from(new Set(user.userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.name))));

  const accessToken = generateAccessToken(user.id, user.username, roles, permissions);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token in DB and Redis
  const expiresAt = new Date(Date.now() + require('ms')(config.jwt.refreshTokenExpiration));
  const newRefreshToken = refreshTokenRepository.create({
    token: refreshToken,
    user: user,
    expiresAt: expiresAt,
  });
  await refreshTokenRepository.save(newRefreshToken);

  // Store refresh token in Redis for quick revocation checks (optional, can just rely on DB)
  await redisClient.set(`refreshToken:${refreshToken}`, user.id, { EXAT: expiresAt.getTime() / 1000 }); // Store with expiration

  return { accessToken, refreshToken };
};

/**
 * Refresh Access and Refresh Tokens.
 * @param oldRefreshToken - The refresh token provided by the client.
 * @returns New access token and refresh token.
 */
export const refreshAuthTokens = async (oldRefreshToken: string): Promise<{ user: User; tokens: ITokenPair }> => {
  let decoded: IJwtPayload;
  try {
    decoded = jwt.verify(oldRefreshToken, config.jwt.refreshSecret) as IJwtPayload;
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token.');
  }

  const storedRefreshToken = await refreshTokenRepository.findOne({
    where: { token: oldRefreshToken, userId: decoded.userId, isRevoked: false },
    relations: ['user', 'user.userRoles.role.rolePermissions.permission'],
  });

  if (!storedRefreshToken || storedRefreshToken.expiresAt < new Date()) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token invalid or expired.');
  }

  // Revoke the old refresh token
  storedRefreshToken.isRevoked = true;
  await refreshTokenRepository.save(storedRefreshToken);
  await redisClient.del(`refreshToken:${oldRefreshToken}`); // Remove from Redis

  const user = storedRefreshToken.user;
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User associated with refresh token not found.');
  }

  const tokens = await generateAuthTokens(user); // Generate new pair
  return { user, tokens };
};

/**
 * Logout a user by revoking their refresh token.
 * @param refreshToken - The refresh token to revoke.
 */
export const logout = async (refreshToken: string): Promise<void> => {
  const storedRefreshToken = await refreshTokenRepository.findOneBy({ token: refreshToken, isRevoked: false });

  if (!storedRefreshToken) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Refresh token not found or already revoked.');
  }

  storedRefreshToken.isRevoked = true;
  await refreshTokenRepository.save(storedRefreshToken);
  await redisClient.del(`refreshToken:${refreshToken}`); // Remove from Redis
  logger.info(`Refresh token revoked: ${refreshToken}`);
};

/**
 * Generate a password reset token for a user.
 * @param email - User's email.
 * @returns Password reset token.
 */
export const generatePasswordResetToken = async (email: string): Promise<string> => {
  const user = await userRepository.findOneBy({ email });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No user found with that email address.');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour expiration
  await userRepository.save(user);

  // In a real application, you would send this token via email
  // For now, it's logged for development purposes.
  return resetToken;
};

/**
 * Reset user's password using a reset token.
 * @param token - Password reset token.
 * @param newPassword - New password for the user.
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const user = await userRepository.findOneBy({
    passwordResetToken: token,
    passwordResetExpires: new Date(Date.now() > 0), // Token must not be expired
  });

  if (!user || user.passwordResetExpires! < new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired password reset token.');
  }

  user.password = newPassword; // Subscriber will hash this
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await userRepository.save(user);
};