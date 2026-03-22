```typescript
import { Router } from 'express';
import { createDatabase, getAllDatabases, getDatabaseById, updateDatabase, deleteDatabase } from './database.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { UserRole } from '../../entities/User';
import { validate, createDatabaseSchema } from '../../utils/validation';
import * as yup from 'yup';
import _ from 'lodash';

const router = Router();

// Schema for database ID parameter
const databaseIdParamSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid('Invalid database ID format').required('Database ID is required'),
  }).required(),
});

// Schema for updating database (allow partial updates)
const updateDatabaseBodySchema = createDatabaseSchema.pick(['body']).shape({
  body: yup.object({
    name: yup.string().min(3).optional(),
    type: yup.string().oneOf(['postgresql', 'mysql', 'sqlserver', 'oracle']).optional(),
    connectionString: yup.string().url('Invalid connection string format').optional(),
    description: yup.string().optional(),
  }).required(),
});

router.route('/')
  .post(authenticate, validate(createDatabaseSchema, 'body'), createDatabase)
  .get(authenticate, getAllDatabases); // Users get their own, Admins get all

router.route('/:id')
  .get(authenticate, validate(databaseIdParamSchema, 'params'), getDatabaseById)
  .put(authenticate, validate(databaseIdParamSchema, 'params'), validate(updateDatabaseBodySchema, 'body'), updateDatabase)
  .delete(authenticate, validate(databaseIdParamSchema, 'params'), deleteDatabase);

export default router;
```

#### `backend/src/modules/queries/query.routes.ts`