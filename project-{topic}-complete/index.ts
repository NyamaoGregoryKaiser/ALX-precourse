```typescript
import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { userRouter } from './routes/userRoutes';
import { errorHandler } from './middleware/errorHandler';
import connectDB from './config/db';

dotenv.config();

connectDB();

const app = express();
app.use(express.json());

app.use('/api/users', userRouter);


app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
```