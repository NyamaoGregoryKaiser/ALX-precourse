```typescript
import { Router } from 'express';
const routes = Router();

//Example route
routes.get('/', (req,res) => {
    res.send('Routes working')
})

export { routes }
```