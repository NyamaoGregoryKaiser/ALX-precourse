```typescript
import express, { Request, Response } from 'express';
import { createConnection } from 'typeorm';
import { User } from './entity/User'; // Example entity
import { performanceRouter } from './routes/performance'; //Example router
import rateLimit from 'rate-limit';
import winston from 'winston';
import * as dotenv from 'dotenv'

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

//Error handling middleware
app.use((err:Error, req:Request, res:Response, next:any)=>{
    logger.error(err.message);
    res.status(500).send('Something broke!');
})


//Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  delayMs: 0 // disable delaying - less CPU intensive
});

app.use(limiter);

app.use(express.json());
app.use('/performance', performanceRouter);

createConnection()
  .then(async () => {
    console.log("Database connected");
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to database:", error);
    logger.error("Error connecting to database:", error);
  });

```