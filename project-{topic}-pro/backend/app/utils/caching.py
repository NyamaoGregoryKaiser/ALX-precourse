```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
import redis.asyncio as redis
from config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

async def invalidate_cache_for_pattern(pattern: str):
    """
    Invalidates cache entries matching a given pattern.
    Useful after CUD operations to ensure data freshness.
    The pattern should match the key structure used by fastapi_cache.
    e.g., "fastapi-cache:/api/v1/projects*"
    """
    if not FastAPICache.get_dependency()._backend:
        logger.warning("Redis backend not initialized for cache invalidation.")
        return

    # Ensure the backend is a RedisBackend for this functionality
    backend = FastAPICache.get_dependency()._backend
    if not isinstance(backend, RedisBackend):
        logger.warning("Cache backend is not RedisBackend, pattern invalidation not supported.")
        return

    try:
        redis_client = backend.client
        if not redis_client:
            logger.error("Redis client not available for cache invalidation.")
            return

        # Find keys matching the pattern and delete them
        async for key in redis_client.scan_iter(match=pattern):
            await redis_client.delete(key)
            logger.debug(f"Invalidated cache key: {key}")
        logger.info(f"Successfully invalidated cache for pattern: {pattern}")
    except Exception as e:
        logger.error(f"Error invalidating cache for pattern '{pattern}': {e}")

```

**Rate Limiting**
*   `backend/main.py`: `FastAPILimiter.init`.
*   API endpoints use `@limiter.limit("5/minute")` decorator (requires `limiter = FastAPILimiter()`).

---

### 7. Frontend (React) - Core Structure

A basic React application structure for demonstration.