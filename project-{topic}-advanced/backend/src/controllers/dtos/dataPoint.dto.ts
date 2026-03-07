```typescript
import { IsUUID, IsNumber, IsISO8601, IsObject, IsOptional, IsNotEmpty } from 'class-validator';

export class SubmitDataPointDto {
  @IsUUID('4', { message: 'Service ID must be a valid UUID' })
  serviceId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Metric name cannot be empty' })
  metricName!: string;

  @IsNumber({}, { message: 'Value must be a number' })
  value!: number;

  @IsISO8601({ strict: true }, { message: 'Timestamp must be a valid ISO 8601 date string' })
  timestamp!: string; // Will be converted to Date object in service

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GetMetricDataQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'Metric Definition ID must be a valid UUID' })
  metricDefinitionId?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Start date must be a valid ISO 8601 date string' })
  startDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'End date must be a valid ISO 8601 date string' })
  endDate?: string;

  @IsOptional()
  @IsString()
  interval?: '1h' | '1d' | '7d' | '30d';

  @IsOptional()
  @IsString()
  aggregateFunction?: 'avg' | 'min' | 'max' | 'sum' | 'count';
}
```