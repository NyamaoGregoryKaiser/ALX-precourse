import { hashPassword, comparePasswords } from '../../../src/utils/password';
import { AppError } from '../../../src/utils/appError';
import { StatusCodes } from 'http-status-codes';

describe('Password Utilities', () => {
  const plainPassword = 'MySecurePassword123!';

  // Mock bcrypt to control its behavior in tests if needed, but for utility functions,
  // it's often fine to let it run. However, for faster tests, mocking is useful.
  // For this example, we'll let it run.

  it('should hash a password successfully', async () => {
    const hashedPassword = await hashPassword(plainPassword);
    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toBe(plainPassword);
    expect(hashedPassword.length).toBeGreaterThan(50); // Hashed password is long
  });

  it('should correctly compare a plain password with its hash', async () => {
    const hashedPassword = await hashPassword(plainPassword);
    const isMatch = await comparePasswords(plainPassword, hashedPassword);
    expect(isMatch).toBe(true);
  });

  it('should return false for incorrect passwords', async () => {
    const hashedPassword = await hashPassword(plainPassword);
    const isMatch = await comparePasswords('WrongPassword123!', hashedPassword);
    expect(isMatch).toBe(false);
  });

  it('should throw an AppError if hashing fails (e.g., due to invalid salt rounds)', async () => {
    // Temporarily mock bcrypt.hash to throw an error
    const originalHash = jest.requireActual('bcrypt').hash;
    jest.spyOn(require('bcrypt'), 'hash').mockImplementation(() => {
      throw new Error('Bcrypt hashing error');
    });

    await expect(hashPassword(plainPassword)).rejects.toBeInstanceOf(AppError);
    await expect(hashPassword(plainPassword)).rejects.toHaveProperty('statusCode', StatusCodes.INTERNAL_SERVER_ERROR);

    // Restore original implementation
    jest.spyOn(require('bcrypt'), 'hash').mockImplementation(originalHash);
  });

  it('should throw an AppError if comparison fails (e.g., due to invalid hash)', async () => {
    // Temporarily mock bcrypt.compare to throw an error
    const originalCompare = jest.requireActual('bcrypt').compare;
    jest.spyOn(require('bcrypt'), 'compare').mockImplementation(() => {
      throw new Error('Bcrypt comparison error');
    });

    const hashedPassword = await hashPassword(plainPassword); // Generate a valid hash first
    await expect(comparePasswords(plainPassword, hashedPassword)).rejects.toBeInstanceOf(AppError);
    await expect(comparePasswords(plainPassword, hashedPassword)).rejects.toHaveProperty('statusCode', StatusCodes.INTERNAL_SERVER_ERROR);

    // Restore original implementation
    jest.spyOn(require('bcrypt'), 'compare').mockImplementation(originalCompare);
  });
});
```