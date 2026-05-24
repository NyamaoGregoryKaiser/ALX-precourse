import { PrismaClient } from '@prisma/client';

let prisma;

// For development and testing, use globalThis to persist PrismaClient across hot reloads
// This prevents multiple instances of PrismaClient being created.
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;
```

```javascript