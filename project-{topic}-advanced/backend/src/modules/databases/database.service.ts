```typescript
import { AppDataSource } from '../../config/database';
import { Database, DatabaseType } from '../../entities/Database';
import { User, UserRole } from '../../entities/User';
import { CustomError } from '../../utils/error';
import logger from '../../services/logger.service';
import _ from 'lodash';

/**
 * Creates a new database entry.
 * @param owner The user who owns this database entry.
 * @param databaseData Data for the new database.
 * @returns {Promise<Database>} The newly created database object.
 */
export const createDatabase = async (
  owner: User,
  databaseData: { name: string; type: DatabaseType; connectionString: string; description?: string }
): Promise<Database> => {
  const databaseRepository = AppDataSource.getRepository(Database);

  const database = new Database();
  Object.assign(database, databaseData);
  database.owner = owner;
  database.ownerId = owner.id; // Explicitly set ownerId

  await databaseRepository.save(database);
  logger.info(`Database created: ${database.name} by user ${owner.id}`);
  return database;
};

/**
 * Retrieves databases. If the user is an admin, retrieves all. Otherwise, retrieves databases owned by the user.
 * @param user The authenticated user.
 * @returns {Promise<Database[]>} An array of database objects.
 */
export const getDatabases = async (user: User): Promise<Database[]> => {
  const databaseRepository = AppDataSource.getRepository(Database);
  if (user.role === UserRole.ADMIN) {
    return databaseRepository.find({ relations: ['owner'] });
  }
  return databaseRepository.find({ where: { owner: { id: user.id } }, relations: ['owner'] });
};

/**
 * Retrieves a single database by ID, ensuring the user has permission to access it.
 * @param id The ID of the database.
 * @param user The authenticated user.
 * @returns {Promise<Database | null>} The database object or null if not found/unauthorized.
 */
export const getDatabaseById = async (id: string, user: User): Promise<Database | null> => {
  const databaseRepository = AppDataSource.getRepository(Database);
  const queryBuilder = databaseRepository.createQueryBuilder('database')
    .leftJoinAndSelect('database.owner', 'owner')
    .where('database.id = :id', { id });

  if (user.role !== UserRole.ADMIN) {
    queryBuilder.andWhere('database.ownerId = :ownerId', { ownerId: user.id });
  }

  return queryBuilder.getOne();
};

/**
 * Updates a database entry, ensuring the user has permission.
 * @param id The ID of the database to update.
 * @param user The authenticated user.
 * @param updateData Data to update.
 * @returns {Promise<Database>} The updated database object.
 * @throws {CustomError} If database not found or unauthorized.
 */
export const updateDatabase = async (
  id: string,
  user: User,
  updateData: { name?: string; type?: DatabaseType; connectionString?: string; description?: string }
): Promise<Database> => {
  const databaseRepository = AppDataSource.getRepository(Database);
  let database = await getDatabaseById(id, user); // Use getDatabaseById to ensure authorization

  if (!database) {
    logger.warn(`Attempted to update non-existent or unauthorized database with ID: ${id} by user ${user.id}`);
    throw new CustomError('Database not found or unauthorized.', 404);
  }

  _.merge(database, updateData); // Merge incoming data into the existing entity

  const updatedDatabase = await databaseRepository.save(database);
  logger.info(`Database updated: ID ${id} by user ${user.id}`);
  return updatedDatabase;
};

/**
 * Deletes a database entry, ensuring the user has permission.
 * @param id The ID of the database to delete.
 * @param user The authenticated user.
 * @throws {CustomError} If database not found or unauthorized.
 */
export const deleteDatabase = async (id: string, user: User): Promise<void> => {
  const databaseRepository = AppDataSource.getRepository(Database);
  const database = await getDatabaseById(id, user); // Use getDatabaseById to ensure authorization

  if (!database) {
    logger.warn(`Attempted to delete non-existent or unauthorized database with ID: ${id} by user ${user.id}`);
    throw new CustomError('Database not found or unauthorized.', 404);
  }

  await databaseRepository.remove(database); // Use remove to trigger cascade operations defined in entities
  logger.info(`Database deleted: ID ${id} by user ${user.id}`);
};
```

#### `backend/src/modules/queries/query.controller.ts`