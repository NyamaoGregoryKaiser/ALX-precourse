```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';

@Module({
  imports: [
    // TypeOrmModule.forRootAsync({
    //   useFactory: () => dataSourceOptions,
    // }),
    // The forRoot is already in AppModule, this module just helps organize entities/migrations
  ],
})
export class DatabaseModule {}
```