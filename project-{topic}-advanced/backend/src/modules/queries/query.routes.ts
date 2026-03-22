```typescript
import { Router } from 'express';
import { reportSlowQuery, getSlowQueries, getSlowQueryById, updateQuerySuggestionStatus } from './query.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { UserRole } from '../../entities/User';
import { validate, createSlowQuerySchema, getSlowQueriesSchema } from '../../utils/validation';
import * as yup from 'yup';

const router = Router();

// Schema for query ID parameter
const queryIdParamSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid('Invalid query ID format').required('Query ID is required'),
  }).required(),
});

// Schema for suggestion ID parameter
const suggestionIdParamSchema = yup.object({
    params: yup.object({
        queryId: yup.string().uuid('Invalid query ID format').required('Query ID is required'),
        suggestionId: yup.string().uuid('Invalid suggestion ID format').required('Suggestion ID is required'),
    }).required(),
});

// Schema for updating suggestion status
const updateSuggestionStatusBodySchema = yup.object({
    body: yup.object({
        status: yup.string().oneOf(['pending', 'applied', 'dismissed']).required('Suggestion status is required'),
        feedback: yup.string().optional().nullable(),
    }).required(),
});

router.post('/slow', validate(createSlowQuerySchema, 'body'), reportSlowQuery); // Allow unauthenticated reporting from client apps
router.get('/slow', authenticate, validate(getSlowQueriesSchema, 'query'), getSlowQueries); // Authenticated users/admins only
router.get('/slow/:id', authenticate, validate(queryIdParamSchema, 'params'), getSlowQueryById); // Authenticated users/admins only
router.patch(
    '/slow/:queryId/suggestions/:suggestionId',
    authenticate,
    validate(suggestionIdParamSchema, 'params'),
    validate(updateSuggestionStatusBodySchema, 'body'),
    updateQuerySuggestionStatus
);

export default router;
```

#### `backend/tests/unit/auth.service.test.ts`