```typescript
import { AuthService } from '../../modules/auth/auth.service';
import { AppDataSource } from '../../database/data-source';
import { User } from '../../database/entities/User';
import * as bcrypt from 'bcryptjs';
import * as jwt from '../../utils/jwt';
import { Repository } from 'typeorm';

// Mock AppDataSource and Repository
const mockUserRepository: Partial<Repository<User>> = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
};

jest.mock('../../database/data-source', () => ({
    AppDataSource: {
        getRepository: jest.fn(() => mockUserRepository),
    },
}));

// Mock bcrypt and jwt utils
jest.mock('bcryptjs');
jest.mock('../../utils/jwt');

describe('AuthService (Unit)', () => {
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService();
        // Reset all mocks before each test
        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        it('should successfully register a new user', async () => {
            const email = 'newuser@example.com';
            const password = 'password123';
            const hashedPassword = 'hashedPassword123';
            const newUser = { id: 'uuid-1', email, password: hashedPassword, role: 'user' } as User;

            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
            (mockUserRepository.create as jest.Mock).mockReturnValue(newUser);
            (mockUserRepository.save as jest.Mock).mockResolvedValue(newUser);

            const result = await authService.registerUser(email, password);

            expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
            expect(mockUserRepository.create).toHaveBeenCalledWith({ email, password: hashedPassword, role: 'user' });
            expect(mockUserRepository.save).toHaveBeenCalledWith(newUser);
            expect(result).toEqual(newUser);
        });

        it('should throw an error if user already exists', async () => {
            const email = 'existing@example.com';
            const password = 'password123';

            (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ id: 'uuid-existing', email, password: 'hashed' } as User);

            await expect(authService.registerUser(email, password)).rejects.toThrow('User with this email already exists.');
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email } });
            expect(mockUserRepository.create).not.toHaveBeenCalled();
            expect(mockUserRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('loginUser', () => {
        it('should successfully log in an existing user and return a token', async () => {
            const email = 'test@example.com';
            const password = 'password123';
            const hashedPassword = 'hashedPassword123';
            const user = { id: 'uuid-1', email, password: hashedPassword, role: 'user' } as User;
            const token = 'jwt-token-string';

            (mockUserRepository.findOne as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.generateToken as jest.Mock).mockReturnValue(token);

            const result = await authService.loginUser(email, password);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email } });
            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
            expect(jwt.generateToken).toHaveBeenCalledWith(user);
            expect(result).toEqual({ user, token });
        });

        it('should throw an error for invalid credentials (user not found)', async () => {
            const email = 'nonexistent@example.com';
            const password = 'password123';

            (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

            await expect(authService.loginUser(email, password)).rejects.toThrow('Invalid credentials.');
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email } });
            expect(bcrypt.compare).not.toHaveBeenCalled();
            expect(jwt.generateToken).not.toHaveBeenCalled();
        });

        it('should throw an error for invalid credentials (wrong password)', async () => {
            const email = 'test@example.com';
            const password = 'wrongpassword';
            const hashedPassword = 'hashedPassword123';
            const user = { id: 'uuid-1', email, password: hashedPassword, role: 'user' } as User;

            (mockUserRepository.findOne as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(authService.loginUser(email, password)).rejects.toThrow('Invalid credentials.');
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email } });
            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
            expect(jwt.generateToken).not.toHaveBeenCalled();
        });
    });
});
```