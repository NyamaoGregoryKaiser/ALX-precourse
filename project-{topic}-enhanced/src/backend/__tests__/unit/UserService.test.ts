import { UserService } from '../../services/UserService';
import { User } from '../../entities/User';
import { AppDataSource } from '../../database/data-source';
import { Repository } from 'typeorm';
import { hashPassword } from '../../utils/hash';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../../utils/hash'); // Mock hashPassword for unit tests

describe('UserService Unit Tests', () => {
    let userService: UserService;
    let userRepository: Repository<User>;

    beforeAll(async () => {
        // Mock AppDataSource.getRepository for unit tests
        userRepository = {
            findOneBy: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            // Add other methods that UserService uses
        } as unknown as Repository<User>;
        
        jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(userRepository);
        userService = new UserService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new user successfully', async () => {
        const userData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
        };
        const hashedPassword = 'hashedpassword123';
        (hashPassword as jest.Mock).mockResolvedValue(hashedPassword);

        const newUser = { id: uuidv4(), ...userData, password: hashedPassword, role: 'user', createdAt: new Date(), updatedAt: new Date() };

        (userRepository.create as jest.Mock).mockReturnValue(newUser);
        (userRepository.save as jest.Mock).mockResolvedValue(newUser);

        const result = await userService.createUser(userData);

        expect(hashPassword).toHaveBeenCalledWith(userData.password);
        expect(userRepository.create).toHaveBeenCalledWith({ ...userData, password: hashedPassword });
        expect(userRepository.save).toHaveBeenCalledWith(newUser);
        expect(result).toEqual(newUser);
    });

    it('should find a user by email', async () => {
        const user = { id: uuidv4(), username: 'testuser', email: 'test@example.com', password: 'hashedpassword' } as User;
        (userRepository.findOneBy as jest.Mock).mockResolvedValue(user);

        const result = await userService.findUserByEmail('test@example.com');

        expect(userRepository.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
        expect(result).toEqual(user);
    });

    it('should return null if user not found by email', async () => {
        (userRepository.findOneBy as jest.Mock).mockResolvedValue(null);

        const result = await userService.findUserByEmail('nonexistent@example.com');

        expect(userRepository.findOneBy).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
        expect(result).toBeNull();
    });

    it('should find a user by ID', async () => {
        const userId = uuidv4();
        const user = { id: userId, username: 'testuser', email: 'test@example.com', password: 'hashedpassword' } as User;
        (userRepository.findOneBy as jest.Mock).mockResolvedValue(user);

        const result = await userService.findUserById(userId);

        expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
        expect(result).toEqual(user);
    });

    it('should update a user', async () => {
        const userId = uuidv4();
        const updateData = { username: 'updateduser' };
        const existingUser = { id: userId, username: 'olduser', email: 'test@example.com', password: 'hashedpassword' } as User;
        const updatedUser = { ...existingUser, ...updateData } as User;

        (userRepository.findOneBy as jest.Mock).mockResolvedValue(existingUser);
        (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

        const result = await userService.updateUser(userId, updateData);

        expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
        expect(userRepository.save).toHaveBeenCalledWith({ ...existingUser, ...updateData });
        expect(result).toEqual(updatedUser);
    });
});
```

**Integration Test Example: `src/backend/__tests__/integration/AuthIntegration.test.ts`**
```typescript