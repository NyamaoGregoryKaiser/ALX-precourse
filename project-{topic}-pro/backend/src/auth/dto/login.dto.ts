```typescript
import { PickType } from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/create-user.dto';

// Inherits email and password validation from CreateUserDto
export class LoginDto extends PickType(CreateUserDto, ['email', 'password'] as const) {}
```