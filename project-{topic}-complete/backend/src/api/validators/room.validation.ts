```typescript
import { IsString, MinLength, MaxLength, IsOptional, IsUUID } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(3, { message: 'Room name must be at least 3 characters long' })
  @MaxLength(50, { message: 'Room name cannot be more than 50 characters long' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Room description cannot be more than 200 characters long' })
  description?: string;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Room name must be at least 3 characters long' })
  @MaxLength(50, { message: 'Room name cannot be more than 50 characters long' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Room description cannot be more than 200 characters long' })
  description?: string;
}

export class RoomIdParam {
  @IsUUID('4', { message: 'Invalid room ID format' })
  id!: string;
}
```