import express from 'express';
import authRoute from './auth.route';
import userRoute from './user.route';
import projectRoute from './project.route';
import taskRoute from './task.route';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/projects',
    route: projectRoute,
  },
  {
    path: '/tasks',
    route: taskRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
```

#### `backend/src/app.ts` (Express app setup)
```typescript