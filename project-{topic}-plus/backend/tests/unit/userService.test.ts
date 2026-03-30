import { UserService } from '../../src/modules/users/user.service';
import { UserRepository } from '../../src/db/data-source';
import { User, UserRole } from '../../src/entities/User';
import * as bcrypt from 'bcryptjs';

// Mock the UserRepository
jest.mock('../../src/db/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      find: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      create: jest.fn(),
    })),
  },
  UserRepository: { // Mock UserRepository directly
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
  }
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password, hash) => Promise.resolve(hash === `hashed_${password}`))
}));

describe('UserService (Unit Tests)', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<typeof UserRepository>;

  beforeEach(() => {
    mockUserRepository = AppDataSource.getRepository('User') as any; // Cast for mock type safety
    userService = new UserService();
    jest.clearAllMocks();
  });

  it('should create a new user', async () => {
    const userData = { username: 'testuser', email: 'test@example.com', password: 'password123', role: UserRole.USER };
    const newUser = { id: 'uuid-1', ...userData, password_hash: 'hashed_password123' } as User;

    mockUserRepository.create.mockReturnValue(newUser);
    mockUserRepository.save.mockResolvedValue(newUser);

    const result = await userService.createUser(userData);

    expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      username: userData.username,
      email: userData.email,
      password_hash: 'hashed_password123',
      role: userData.role,
    }));
    expect(mockUserRepository.save).toHaveBeenCalledWith(newUser);
    expect(result).toEqual(expect.objectContaining({ username: newUser.username, email: newUser.email }));
    expect(result.password_hash).toBeUndefined(); // Should not return hash
  });

  it('should find a user by ID', async () => {
    const user = { id: 'uuid-1', username: 'testuser', email: 'test@example.com', role: UserRole.USER } as User;
    mockUserRepository.findOneBy.mockResolvedValue(user);

    const result = await userService.findById('uuid-1');

    expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' });
    expect(result).toEqual(user);
  });

  it('should return null if user not found by ID', async () => {
    mockUserRepository.findOneBy.mockResolvedValue(null);

    const result = await userService.findById('non-existent-id');

    expect(result).toBeNull();
  });

  it('should find a user by email', async () => {
    const user = { id: 'uuid-1', username: 'testuser', email: 'test@example.com', role: UserRole.USER } as User;
    mockUserRepository.findOneBy.mockResolvedValue(user);

    const result = await userService.findByEmail('test@example.com');

    expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(result).toEqual(user);
  });

  it('should update a user', async () => {
    const existingUser = { id: 'uuid-1', username: 'oldname', email: 'old@example.com', password_hash: 'hashed_oldpass', role: UserRole.USER } as User;
    const updateData = { username: 'newname' };
    const updatedUser = { ...existingUser, ...updateData };

    mockUserRepository.findOneBy.mockResolvedValue(existingUser);
    mockUserRepository.save.mockResolvedValue(updatedUser);

    const result = await userService.updateUser('uuid-1', updateData);

    expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' });
    expect(mockUserRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'uuid-1',
      username: 'newname',
      email: 'old@example.com',
    }));
    expect(result).toEqual(updatedUser);
  });

  it('should delete a user', async () => {
    const userToDelete = { id: 'uuid-1', username: 'testuser', email: 'test@example.com', role: UserRole.USER } as User;
    mockUserRepository.findOneBy.mockResolvedValue(userToDelete);
    mockUserRepository.remove.mockResolvedValue(undefined);

    await userService.deleteUser('uuid-1');

    expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' });
    expect(mockUserRepository.remove).toHaveBeenCalledWith(userToDelete);
  });

  it('should throw error if user to delete not found', async () => {
    mockUserRepository.findOneBy.mockResolvedValue(null);

    await expect(userService.deleteUser('non-existent-id')).rejects.toThrow('User not found');
    expect(mockUserRepository.remove).not.toHaveBeenCalled();
  });
});
```

#### `backend/tests/integration/authFlow.test.ts` (Example Integration Test)
```typescript