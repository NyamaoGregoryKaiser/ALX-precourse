import AppDataSource from '../ormconfig';
import { AppError } from '../src/middlewares/errorHandler';
import logger from '../src/utils/logger';

// Mock logger to prevent spamming console during tests
jest.mock('../src/utils/logger');

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must be run in TEST environment!');
  }
  // Ensure the database connection is initialized for integration tests
  // We'll use a separate test database
  process.env.DB_NAME = process.env.DB_NAME + '_test';
  await AppDataSource.initialize();
  // Run migrations for the test database
  await AppDataSource.runMigrations();
});

beforeEach(async () => {
  // Clear the database before each test to ensure isolation
  const entities = AppDataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = AppDataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
  }
});

afterAll(async () => {
  // Close database connection after all tests
  await AppDataSource.destroy();
});

// Mock AppError constructor to simplify testing error instances
// This is optional but can make error checks cleaner
jest.mock('../src/middlewares/errorHandler', () => {
  const actual = jest.requireActual('../src/middlewares/errorHandler');
  return {
    ...actual,
    AppError: jest.fn((message, statusCode) => {
      const error = new Error(message) as actual.AppError;
      error.statusCode = statusCode;
      error.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      error.isOperational = true;
      return error;
    }),
  };
});