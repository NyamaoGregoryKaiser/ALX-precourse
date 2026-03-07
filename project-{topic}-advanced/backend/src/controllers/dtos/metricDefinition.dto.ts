```typescript
import { IsString, Length, IsEnum, IsOptional, IsJSON, IsObject, Matches } from 'class-validator';
import { MetricType } from '../../entities/MetricDefinition';

export class CreateMetricDefinitionDto {
  @IsString()
  @Length(3, 100, { message: 'Metric name must be between 3 and 100 characters' })
  // Regex to ensure metric names are valid for Prometheus style (snake_case, alphanumeric + underscores)
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: 'Metric name must be alphanumeric and underscores, starting with a letter or underscore' })
  name!: string;

  @IsEnum(MetricType, { message: 'Invalid metric type' })
  type!: MetricType;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsObject()
  // @IsJSON() // If expecting a JSON string, otherwise use @IsObject() for parsed object
  thresholds?: {
    warning?: number;
    critical?: number;
    [key: string]: any;
  };
}

export class UpdateMetricDefinitionDto {
  @IsOptional()
  @IsString()
  @Length(3, 100, { message: 'Metric name must be between 3 and 100 characters' })
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: 'Metric name must be alphanumeric and underscores, starting with a letter or underscore' })
  name?: string;

  @IsOptional()
  @IsEnum(MetricType, { message: 'Invalid metric type' })
  type?: MetricType;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsObject()
  thresholds?: {
    warning?: number;
    critical?: number;
    [key: string]: any;
  };
}
```