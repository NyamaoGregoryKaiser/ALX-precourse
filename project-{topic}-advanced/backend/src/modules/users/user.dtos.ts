```typescript
import { UserRole } from "../../database/entities/User";

// DTO for updating user details
export interface UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole; // Only admin should be able to update role
}
```