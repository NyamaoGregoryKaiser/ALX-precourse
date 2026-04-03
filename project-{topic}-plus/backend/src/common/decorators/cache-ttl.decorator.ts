```typescript
import { SetMetadata } from '@nestjs/common';

export const CACHE_TTL_METADATA = 'cache_ttl';

/**
 * Sets the Time To Live (TTL) for caching a specific route's response.
 * @param ttlSeconds The TTL in seconds.
 */
export const CacheTTL = (ttlSeconds: number) => SetMetadata(CACHE_TTL_METADATA, ttlSeconds);
```