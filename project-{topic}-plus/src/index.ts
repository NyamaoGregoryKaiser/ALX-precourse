```typescript
import "reflect-metadata";
import express, { Request, Response } from "express";
import { createConnection } from "typeorm";
import { User } from "./entity/User"; //Example Entity
import { routes } from './routes' //Example routes import

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(routes);

createConnection()
  .then(async (connection) => {
    console.log("Database connected");
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  })
  .catch((error) => console.error("Error connecting to database:", error));

//Example Route Handler. Would require significant expansion.
app.get("/", (req: Request, res: Response) => {
  res.send("Task Management API");
});

```