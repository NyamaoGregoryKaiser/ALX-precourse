```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/data-source';
import { User } from '../../src/database/entities/User';
import { hashPassword } from '../../src/utils/passwordUtils';
import { generateToken } from '../../src/utils/jwtUtils';

describe('User API Integration Tests', () => {
    let userRepository: any;
    let testUser: User;
    let authToken: string;

    beforeAll(async () => {
        userRepository = AppDataSource.getRepository(User);
        testUser = userRepository.create({
            username: 'usertestuser',
            email: 'user@example.com',
            password: await hashPassword('password123'),
        });
        await userRepository.save(testUser);
        authToken = generateToken(testUser.id);
    });

    describe('GET /api/v1/users/me', () => {
        it('should return 401 if no token is provided', async () => {
            const res = await request(app).get('/api/v1/users/me');
            expect(res.statusCode).toEqual(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('No token provided.');
        });

        it('should return 401 if an invalid token is provided', async () => {
            const res = await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer invalidtoken');
            expect(res.statusCode).toEqual(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid token.');
        });

        it('should return the authenticated user\'s profile', async () => {
            const res = await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.id).toBe(testUser.id);
            expect(res.body.user.username).toBe(testUser.username);
            expect(res.body.user.email).toBe(testUser.email);
            expect(res.body.user).not.toHaveProperty('password');
        });
    });

    describe('PUT /api/v1/users/me', () => {
        it('should update the authenticated user\'s profile successfully', async () => {
            const updateData = {
                username: 'updated_user_name',
                email: 'updated_email@example.com',
            };

            const res = await request(app)
                .put('/api/v1/users/me')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Profile updated successfully.');
            expect(res.body.user.username).toBe(updateData.username);
            expect(res.body.user.email).toBe(updateData.email);

            const updatedUserInDb = await userRepository.findOneBy({ id: testUser.id });
            expect(updatedUserInDb!.username).toBe(updateData.username);
            expect(updatedUserInDb!.email).toBe(updateData.email);

            // Revert changes for other tests
            await userRepository.update(testUser.id, { username: 'usertestuser', email: 'user@example.com' });
        });

        it('should return 400 for invalid update data (e.g., invalid email format)', async () => {
            const updateData = {
                email: 'invalid-email',
            };

            const res = await request(app)
                .put('/api/v1/users/me')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Validation failed.');
            expect(res.body.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ field: 'email', message: 'Invalid email' })])
            );
        });

        it('should return 401 if no token is provided', async () => {
            const res = await request(app).put('/api/v1/users/me').send({ username: 'newname' });
            expect(res.statusCode).toEqual(401);
        });
    });
});
```