```javascript
const User = require('../../../src/models/user.model');
const db = require('../../../src/db');
const bcrypt = require('bcryptjs');
const config = require('../../../src/config'); // Import config for admin credentials

describe('User Model Integration Tests', () => {
    beforeAll(async () => {
        // Run migrations and seeds before all tests
        await db.migrate.latest();
        // Clear all user data before seeding
        await db('users').del();
        await db.seed.run(); // Seed initial data including admin
    });

    afterAll(async () => {
        await db.migrate.rollback(); // Rollback migrations after all tests
        await db.destroy(); // Close DB connection
    });

    describe('create', () => {
        test('should create a new user with hashed password', async () => {
            const username = 'testuser1';
            const email = 'test1@example.com';
            const password = 'password123';
            const role = 'user';

            const user = await User.create(username, email, password, role);

            expect(user).toBeDefined();
            expect(user.id).toBeDefined();
            expect(user.username).toBe(username);
            expect(user.email).toBe(email);
            expect(user.role).toBe(role);

            const storedUser = await db('users').where({ id: user.id }).first();
            expect(storedUser).toBeDefined();
            expect(storedUser.email).toBe(email);
            expect(await bcrypt.compare(password, storedUser.password_hash)).toBe(true);
        });

        test('should throw error for duplicate email', async () => {
            const username = 'dupuser';
            const email = config.adminEmail; // Use the seeded admin email
            const password = 'password123';

            await expect(User.create(username, email, password)).rejects.toThrow();
        });
    });

    describe('findById', () => {
        test('should find a user by ID', async () => {
            const existingUser = await db('users').where({ email: config.adminEmail }).first();
            const foundUser = await User.findById(existingUser.id);

            expect(foundUser).toBeDefined();
            expect(foundUser.id).toBe(existingUser.id);
            expect(foundUser.email).toBe(existingUser.email);
            expect(foundUser.password_hash).toBeUndefined(); // password_hash should not be returned
        });

        test('should return undefined if user not found', async () => {
            const foundUser = await User.findById(99999);
            expect(foundUser).toBeUndefined();
        });
    });

    describe('findByEmail', () => {
        test('should find a user by email', async () => {
            const existingUser = await db('users').where({ email: config.adminEmail }).first();
            const foundUser = await User.findByEmail(existingUser.email);

            expect(foundUser).toBeDefined();
            expect(foundUser.id).toBe(existingUser.id);
            expect(foundUser.email).toBe(existingUser.email);
            expect(foundUser.password_hash).toBeDefined(); // password_hash should be returned for auth
        });

        test('should return undefined if user not found by email', async () => {
            const foundUser = await User.findByEmail('nonexistent@example.com');
            expect(foundUser).toBeUndefined();
        });
    });

    describe('update', () => {
        test('should update user details including password', async () => {
            const newUser = await User.create('updateuser', 'update@example.com', 'oldpass');
            const newPassword = 'newstrongpassword';
            const updatedUser = await User.update(newUser.id, { username: 'updated_user', password: newPassword });

            expect(updatedUser).toBeDefined();
            expect(updatedUser.username).toBe('updated_user');
            expect(updatedUser.email).toBe('update@example.com');

            const storedUser = await db('users').where({ id: newUser.id }).first();
            expect(await bcrypt.compare(newPassword, storedUser.password_hash)).toBe(true);
        });

        test('should not update if user not found', async () => {
            const updatedUser = await User.update(99999, { username: 'nonexistent' });
            expect(updatedUser).toBeUndefined();
        });
    });

    describe('delete', () => {
        test('should delete a user', async () => {
            const userToDelete = await User.create('todelete', 'todelete@example.com', 'deletepass');
            const deletedCount = await User.delete(userToDelete.id);

            expect(deletedCount).toBe(1);
            const foundUser = await User.findById(userToDelete.id);
            expect(foundUser).toBeUndefined();
        });

        test('should return 0 if user not found for deletion', async () => {
            const deletedCount = await User.delete(99999);
            expect(deletedCount).toBe(0);
        });
    });

    describe('comparePassword', () => {
        test('should return true for correct password', async () => {
            const password = 'testpassword';
            const passwordHash = await bcrypt.hash(password, 10);
            expect(await User.comparePassword(password, passwordHash)).toBe(true);
        });

        test('should return false for incorrect password', async () => {
            const password = 'testpassword';
            const passwordHash = await bcrypt.hash(password, 10);
            expect(await User.comparePassword('wrongpassword', passwordHash)).toBe(false);
        });
    });
});
```