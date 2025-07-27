```typescript
import express, { Request, Response, NextFunction } from 'express';
import { sequelize } from './database';
import userRoutes from './routes/userRoutes';
import { errorHandler } from './middleware/errorHandler';


const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false })); //for form data

app.use('/api/users', userRoutes);


// Error Handling Middleware
app.use(errorHandler);

sequelize.sync()
  .then(() => {
    console.log('Database synchronized');
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
  });
```