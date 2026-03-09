from fastapi_limiter import FastAPILimiter
import redis.asyncio as aioredis
from app.config import settings
from app.core.logging_config import logger

"""
Rate limiting utility for FastAPI endpoints using fastapi-limiter and Redis.
"""

async def init_rate_limiter():
    """Initializes the FastAPI-Limiter with a Redis backend."""
    try:
        # Use aioredis from the caching module or create a new one
        # Here we create a new dedicated client for fastapi-limiter
        redis_connection = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        await FastAPILimiter.init(redis_connection)
        logger.info("FastAPI-Limiter initialized successfully with Redis.")
    except Exception as e:
        logger.error(f"Failed to initialize FastAPI-Limiter: {e}")

async def close_rate_limiter():
    """Closes the FastAPI-Limiter resources."""
    if FastAPILimiter.redis:
        await FastAPILimiter.redis.close()
        logger.info("FastAPI-Limiter Redis connection closed.")
```

```