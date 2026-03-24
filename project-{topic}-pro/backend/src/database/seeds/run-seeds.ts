```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module'; // Adjust path to your AppModule
import { Connection } from 'typeorm';
import { InitialDatabaseSeed } from './initial.seed'; // Your seed file

async function runSeed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get(Connection);

  try {
    console.log('Running database seeds...');
    const seed = new InitialDatabaseSeed();
    await seed.run(null, connection); // Factory is null if not using typeorm-factory
    console.log('Database seeding complete.');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

runSeed();
```