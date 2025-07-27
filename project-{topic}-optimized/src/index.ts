```typescript
import express, { Request, Response } from 'express';
import { connectDb } from './database';
import { userRouter } from './routes/users'; // Example route
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/users', userRouter); // Example route

// ... other middleware (error handling, logging, authentication)

app.listen(port, async () => {
  await connectDb();
  console.log(`Server listening on port ${port}`);
});
```