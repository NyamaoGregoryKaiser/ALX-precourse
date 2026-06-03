```typescript
import { hashPassword, comparePassword } from '../../../src/utils/password-hasher';
import { AppError, HttpCode } from '../../../src/utils/app-error';

describe('Password Hasher', () => {
  it('should hash a password successfully', async () => {
    const password = 'mySecretPassword123';
    const hashedPassword = await hashPassword(password);
    expect(hashedPassword).toBeDefined();
    expect(typeof hashedPassword).toBe('string');
    expect(hashedPassword.length).toBeGreaterThan(0);
    expect(hashedPassword).not.toBe(password); // Should not be plain text
  });

  it('should compare a correct password successfully', async () => {
    const password = 'mySecretPassword123';
    const hashedPassword = await hashPassword(password);
    const isMatch = await comparePassword(password, hashedPassword);
    expect(isMatch).toBe(true);
  });

  it('should return false for an incorrect password', async () => {
    const password = 'mySecretPassword123';
    const incorrectPassword = 'wrongPassword';
    const hashedPassword = await hashPassword(password);
    const isMatch = await comparePassword(incorrectPassword, hashedPassword);
    expect(isMatch).toBe(false);
  });

  it('should throw an AppError if hashing fails (e.g., invalid salt rounds)', async () => {
    // This is hard to simulate directly without mocking bcrypt deeply or providing invalid config
    // For demonstration, we'd mock bcrypt.genSalt or bcrypt.hash to throw an error.
    // Example: jest.spyOn(bcrypt, 'genSalt').mockRejectedValueOnce(new Error('Salt error'));
    await expect(hashPassword('short')).rejects.toThrow(AppError);
    await expect(hashPassword('short')).rejects.toHaveProperty('httpCode', HttpCode.INTERNAL_SERVER_ERROR);
  });

  it('should throw an AppError if comparison fails (e.g., invalid hash)', async () => {
    // Similarly, mock bcrypt.compare
    // Example: jest.spyOn(bcrypt, 'compare').mockRejectedValueOnce(new Error('Compare error'));
    await expect(comparePassword('password', 'invalidhash')).rejects.toThrow(AppError);
    await expect(comparePassword('password', 'invalidhash')).rejects.toHaveProperty('httpCode', HttpCode.INTERNAL_SERVER_ERROR);
  });
});
```

**Integration Tests (Example: Category Repository)**