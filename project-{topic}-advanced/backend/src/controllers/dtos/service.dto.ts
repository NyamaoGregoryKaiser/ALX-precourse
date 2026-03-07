```typescript
import { IsString, Length, IsOptional, IsUUID } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @Length(3, 100, { message: 'Service name must be between 3 and 100 characters' })
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @Length(3, 100, { message: 'Service name must be between 3 and 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```