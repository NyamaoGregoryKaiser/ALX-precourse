```typescript
import { AppDataSource } from '../../config/database';
import { SlowQuery } from '../../entities/SlowQuery';
import { Database } from '../../entities/Database';
import { User, UserRole } from '../../entities/User';
import { CustomError } from '../../utils/error';
import logger from '../../services/logger.service';
import { analyzeAndSuggestOptimizations } from './query.analyzer';
import { QuerySuggestion, SuggestionStatus } from '../../entities/QuerySuggestion';

/**
 * Reports a new slow query to the system.
 * It also triggers the query analysis and suggestion generation.
 * @param data Slow query data.
 * @returns {Promise<SlowQuery>} The saved slow query object.
 */
export const reportSlowQuery = async (data: {
  query: string;
  executionTimeMs: number;
  clientApplication?: string;
  clientHostname?: string;
  databaseId: string;
  reporterId?: string;
}): Promise<SlowQuery> => {
  const slowQueryRepository = AppDataSource.getRepository(SlowQuery);
  const databaseRepository = AppDataSource.getRepository(Database);
  const userRepository = AppDataSource.getRepository(User);

  const database = await databaseRepository.findOneBy({ id: data.databaseId });
  if (!database) {
    throw new CustomError('Target database not found.', 404);
  }

  let reporter: User | undefined;
  if (data.reporterId) {
    reporter = await userRepository.findOneBy({ id: data.reporterId });
    if (!reporter) {
      logger.warn(`Reporter with ID ${data.reporterId} not found for slow query report.`);
      // Optionally throw error or proceed without reporter
    }
  }

  const slowQuery = new SlowQuery();
  Object.assign(slowQuery, data);
  slowQuery.database = database;
  slowQuery.reporter = reporter;

  // Save the slow query first to get its ID
  const savedQuery = await slowQueryRepository.save(slowQuery);
  logger.info(`Slow query reported: ID ${savedQuery.id}, DB: ${database.name}, Time: ${savedQuery.executionTimeMs}ms`);

  // Trigger analysis and suggestion generation
  await analyzeAndSuggestOptimizations(savedQuery);

  return savedQuery;
};

/**
 * Retrieves a list of slow queries with pagination and filtering.
 * Ensures users only see queries from databases they own, unless they are an admin.
 * @param user The authenticated user.
 * @param options Query options.
 * @returns {Promise<{ queries: SlowQuery[]; total: number }>} Paginated list of slow queries and total count.
 */
export const getSlowQueries = async (
  user: User,
  options: {
    page: number;
    limit: number;
    databaseId?: string;
    minExecutionTimeMs?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }
): Promise<{ queries: SlowQuery[]; total: number }> => {
  const slowQueryRepository = AppDataSource.getRepository(SlowQuery);
  const { page, limit, databaseId, minExecutionTimeMs, sortBy = 'reportedAt', sortOrder = 'DESC' } = options;
  const skip = (page - 1) * limit;

  const queryBuilder = slowQueryRepository.createQueryBuilder('slowQuery')
    .leftJoinAndSelect('slowQuery.database', 'database')
    .leftJoinAndSelect('slowQuery.reporter', 'reporter')
    .orderBy(`slowQuery.${sortBy}`, sortOrder)
    .skip(skip)
    .take(limit);

  if (user.role !== UserRole.ADMIN) {
    // Only show queries from databases owned by the user
    queryBuilder.andWhere('database.ownerId = :ownerId', { ownerId: user.id });
  }

  if (databaseId) {
    queryBuilder.andWhere('slowQuery.databaseId = :databaseId', { databaseId });
  }

  if (minExecutionTimeMs !== undefined) {
    queryBuilder.andWhere('slowQuery.executionTimeMs >= :minExecutionTimeMs', { minExecutionTimeMs });
  }

  const [queries, total] = await queryBuilder.getManyAndCount();

  return { queries, total };
};

/**
 * Retrieves a single slow query by ID, including its query plans and suggestions.
 * Ensures the user has permission to view it.
 * @param id The ID of the slow query.
 * @param user The authenticated user.
 * @returns {Promise<SlowQuery | null>} The slow query object or null if not found/unauthorized.
 */
export const getSlowQueryById = async (id: string, user: User): Promise<SlowQuery | null> => {
  const slowQueryRepository = AppDataSource.getRepository(SlowQuery);

  const queryBuilder = slowQueryRepository.createQueryBuilder('slowQuery')
    .leftJoinAndSelect('slowQuery.database', 'database')
    .leftJoinAndSelect('slowQuery.reporter', 'reporter')
    .leftJoinAndSelect('slowQuery.queryPlans', 'queryPlans')
    .leftJoinAndSelect('slowQuery.querySuggestions', 'querySuggestions')
    .where('slowQuery.id = :id', { id });

  if (user.role !== UserRole.ADMIN) {
    queryBuilder.andWhere('database.ownerId = :ownerId', { ownerId: user.id });
  }

  return queryBuilder.getOne();
};

/**
 * Updates the status of a specific query suggestion.
 * Ensures the user has permission to modify the suggestion related to the query.
 * @param queryId The ID of the parent slow query.
 * @param suggestionId The ID of the suggestion to update.
 * @param user The authenticated user.
 * @param status The new status to set (e.g., 'applied', 'dismissed').
 * @param feedback Optional feedback text.
 * @returns {Promise<QuerySuggestion>} The updated query suggestion.
 * @throws {CustomError} If suggestion not found, or unauthorized.
 */
export const updateQuerySuggestionStatus = async (
  queryId: string,
  suggestionId: string,
  user: User,
  status: SuggestionStatus,
  feedback?: string
): Promise<QuerySuggestion> => {
  const querySuggestionRepository = AppDataSource.getRepository(QuerySuggestion);

  const suggestion = await querySuggestionRepository.createQueryBuilder('suggestion')
    .leftJoinAndSelect('suggestion.slowQuery', 'slowQuery')
    .leftJoinAndSelect('slowQuery.database', 'database')
    .where('suggestion.id = :suggestionId', { suggestionId })
    .andWhere('slowQuery.id = :queryId', { queryId })
    .getOne();

  if (!suggestion) {
    throw new CustomError('Query suggestion not found.', 404);
  }

  // Check user permissions for the associated database
  if (user.role !== UserRole.ADMIN && suggestion.slowQuery.database.ownerId !== user.id) {
    throw new CustomError('Unauthorized to update this query suggestion.', 403);
  }

  suggestion.status = status;
  if (status === SuggestionStatus.APPLIED) {
    suggestion.appliedAt = new Date();
    suggestion.dismissedAt = null;
  } else if (status === SuggestionStatus.DISMISSED) {
    suggestion.dismissedAt = new Date();
    suggestion.appliedAt = null;
  } else {
    // PENDING or other states
    suggestion.appliedAt = null;
    suggestion.dismissedAt = null;
  }
  suggestion.feedback = feedback;

  const updatedSuggestion = await querySuggestionRepository.save(suggestion);
  logger.info(`Query suggestion ${suggestionId} for query ${queryId} updated to status: ${status} by user ${user.id}`);
  return updatedSuggestion;
};
```

#### `backend/src/modules/queries/query.analyzer.ts`