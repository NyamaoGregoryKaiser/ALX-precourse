```typescript
import "reflect-metadata";
import express, { Application, Request, Response } from "express";
import { AppDataSource } from "./ormconfig";
import { router } from './routes'; //Import your routes


const app: Application = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', router);


AppDataSource.initialize()
  .then(() => {
    console.log("Database connected");
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  })
  .catch((error) => console.log("Error during Database connection:", error));

```