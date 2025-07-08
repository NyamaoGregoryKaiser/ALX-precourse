```typescript
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import {router as productRouter} from './routes/products';
import {router as userRouter} from './routes/users';


const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/products', productRouter);
app.use('/users', userRouter);

app.get('/', (req: Request, res: Response) => {
  res.send('Ecommerce API');
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
```