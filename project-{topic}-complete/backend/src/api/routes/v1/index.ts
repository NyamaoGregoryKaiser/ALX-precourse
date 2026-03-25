```typescript
import { Router } from 'express';
import authRoute from './auth.route';
import userRoute from './user.route';
import roomRoute from './room.route';

const router = Router();

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
    path: '/rooms',
    route: roomRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
```