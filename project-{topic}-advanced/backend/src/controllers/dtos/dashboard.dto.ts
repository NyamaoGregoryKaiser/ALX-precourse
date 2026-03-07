```typescript
import { IsOptional, IsString } from 'class-validator';

export class GetServiceDashboardQueryDto {
  @IsOptional()
  @IsString()
  timeRange?: '1h' | '24h' | '7d' | '30d' | '1y'; // e.g., '24h', '7d'

  @IsOptional()
  @IsString()
  interval?: '1h' | '1d' | '7d' | '30d'; // Aggregation interval

  @IsOptional()
  @IsString()
  aggregateFunction?: 'avg' | 'min' | 'max' | 'sum' | 'count';
}
```