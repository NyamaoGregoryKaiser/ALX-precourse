import { Application, Request, Response } from 'express';
import { config } from '../config/env.config';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import userRoutes from './user.routes';
import orderRoutes from './order.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../config/swagger.config';

export const setupRoutes = (app: Application) => {
  const apiBase = config.apiVersion;

  app.use(`${apiBase}/auth`, authRoutes);
  app.use(`${apiBase}/products`, productRoutes);
  app.use(`${apiBase}/categories`, categoryRoutes);
  app.use(`${apiBase}/users`, userRoutes);
  app.use(`${apiBase}/orders`, orderRoutes);

  // Swagger Docs Route
  app.use(`${apiBase}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

  // Fallback for unknown routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl} - Route Not Found` });
  });
};