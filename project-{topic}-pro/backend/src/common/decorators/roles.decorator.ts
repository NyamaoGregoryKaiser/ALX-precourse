```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/enums/user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Cache decorators
export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';
export const CacheManager = (key: string, ttl?: number) => SetMetadata(CACHE_KEY_METADATA, key) && SetMetadata(CACHE_TTL_METADATA, ttl);
```