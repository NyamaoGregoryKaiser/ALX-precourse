```typescript
import { CreateUserDto } from '../../users/dto/create-user.dto';

// RegisterDto is essentially CreateUserDto for now
export class RegisterDto extends CreateUserDto {}
```