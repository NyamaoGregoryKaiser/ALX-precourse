```typescript
import { Request, Response, NextFunction } from 'express';
import * as queryService from './query.service';
import { CustomError } from '../../utils/error';
import { QuerySuggestion, SuggestionStatus } from '../../entities/QuerySuggestion';

/**
 * Report a new slow query.
 * @route POST /api/v1/queries/slow
 */
export const reportSlowQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, executionTimeMs, clientApplication, clientHostname, databaseId, reporterId } = req.body;
    // Reporter can be optionally provided or inferred from authenticated user if reporting directly.
    // For simplicity, we allow external apps to report without necessarily being a full user of SQLInsight Pro.
    const slowQuery = await queryService.reportSlowQuery({
      query,
      executionTimeMs,
      clientApplication,
      clientHostname,
      databaseId,
      reporterId: reporterId || req.user?.id, // If authenticated user reports, use their ID
    });
    res.status(201).json({ success: true, message: 'Slow query reported successfully.', data: slowQuery });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all slow queries (filtered and paginated).
 * @route GET /api/v1/queries/slow
 */
export const getSlowQueries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, databaseId, minExecutionTimeMs, sortBy, sortOrder } = req.query;
    if (!req.user) {
      throw new CustomError('User not authenticated.', 401);
    }

    const options = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      databaseId: databaseId as string,
      minExecutionTimeMs: minExecutionTimeMs ? parseFloat(minExecutionTimeMs as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC',
    };

    const { queries, total } = await queryService.getSlowQueries(req.user, options);
    res.status(200).json({
      success: true,
      data: queries,
      meta: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single slow query by ID with its plans and suggestions.
 * @route GET /api/v1/queries/slow/:id
 */
export const getSlowQueryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      throw new CustomError('User not authenticated.', 401);
    }
    const slowQuery = await queryService.getSlowQueryById(id, req.user);
    if (!slowQuery) {
      throw new CustomError('Slow query not found or you do not have permission to view it.', 404);
    }
    res.status(200).json({ success: true, data: slowQuery });
  } catch (error) {
    next(error);
  }
};

/**
 * Update the status of a query suggestion.
 * @route PATCH /api/v1/queries/slow/:queryId/suggestions/:suggestionId
 */
export const updateQuerySuggestionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { queryId, suggestionId } = req.params;
    const { status, feedback } = req.body; // status: 'applied' | 'dismissed'
    if (!req.user) {
      throw new CustomError('User not authenticated.', 401);
    }
    if (!Object.values(SuggestionStatus).includes(status)) {
        throw new CustomError('Invalid suggestion status provided.', 400);
    }

    const updatedSuggestion = await queryService.updateQuerySuggestionStatus(
      queryId,
      suggestionId,
      req.user,
      status,
      feedback
    );
    res.status(200).json({ success: true, message: 'Suggestion status updated.', data: updatedSuggestion });
  } catch (error) {
    next(error);
  }
};
```

#### `backend/src/modules/queries/query.service.ts`