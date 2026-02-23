```javascript
// This file demonstrates unit tests for a theoretical `userService.js`.
// In our current structure, business logic is directly in controllers.
// If we had a dedicated `services` directory with more complex logic, this is where it would be tested.
// For this example, we'll test a hypothetical function that might reside in a service.

const User = require('../../src/models/User');
const { CustomError } = require('../../src/utils/error');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Mock the User model for isolated unit testing
// In a true unit test, we'd mock all external dependencies.
// For the sake of demonstration, we'll use an in-memory DB setup
// which blurs the line between unit and integration slightly for simplicity,
// but allows for actual data interactions without a real Mongo instance.

// Hypothetical userService function
// If we had a service layer, this might be in src/services/userService.js
const getUserById = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new CustomError('User not found', 404);
  }
  return user;
};

const getAllUsers = async () => {
  return await User.find().select('-password');
}

const updateUserRole = async (userId, newRole) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new CustomError('User not found', 404);
  }
  user.role = newRole;
  await user.save();
  return user;
}


describe('User Service Unit Tests (with in-memory DB)', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    // Seed with basic users for each test
    await User.create([
      { username: 'testuser1', email: 'test1@example.com', password: 'password123', role: 'developer' },
      { username: 'testuser2', email: 'test2@example.com', password: 'password123', role: 'manager' },
    ]);
  });

  describe('getUserById', () => {
    test('should return a user if a valid ID is provided', async () => {
      const user = await User.findOne({ email: 'test1@example.com' });
      const foundUser = await getUserById(user._id);
      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe('test1@example.com');
      expect(foundUser.password).toBeUndefined(); // password should be excluded
    });

    test('should throw CustomError (404) if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      await expect(getUserById(nonExistentId)).rejects.toThrow(CustomError);
      await expect(getUserById(nonExistentId)).rejects.toHaveProperty('statusCode', 404);
    });

    test('should throw CastError for invalid ID format', async () => {
      await expect(getUserById('invalidId')).rejects.toThrow(mongoose.Error.CastError);
    });
  });

  describe('getAllUsers', () => {
    test('should return all users', async () => {
      const users = await getAllUsers();
      expect(users).toBeDefined();
      expect(users.length).toBe(2);
      expect(users[0].password).toBeUndefined();
    });

    test('should return an empty array if no users exist', async () => {
      await User.deleteMany({}); // Clear users
      const users = await getAllUsers();
      expect(users).toEqual([]);
    });
  });

  describe('updateUserRole', () => {
    test('should update a user\'s role', async () => {
      const user = await User.findOne({ email: 'test1@example.com' });
      const updatedUser = await updateUserRole(user._id, 'admin');
      expect(updatedUser.role).toBe('admin');

      const checkUser = await User.findById(user._id);
      expect(checkUser.role).toBe('admin');
    });

    test('should throw CustomError (404) if user not found for update', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      await expect(updateUserRole(nonExistentId, 'admin')).rejects.toThrow(CustomError);
      await expect(updateUserRole(nonExistentId, 'admin')).rejects.toHaveProperty('statusCode', 404);
    });
  });
});
```