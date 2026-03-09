import functools
import json
from typing import Callable, Any, TypeVar, ParamSpec

import redis.asyncio as aioredis
from app.config import settings
from app.core.logging_config import logger

"""
Caching utility for FastAPI endpoints using Redis.
Provides a decorator to cache function results.
"""

# Initialize Redis client globally or per request, depending on need.
# For simplicity, we'll initialize it once.
redis_client: Optional[aioredis.Redis] = None

async def init_redis_client():
    """Initializes the asynchronous Redis client."""
    global redis_client
    if redis_client is None:
        try:
            redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await redis_client.ping()
            logger.info("Redis client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            redis_client = None # Ensure it's None if connection failed

async def close_redis_client():
    """Closes the Redis client connection."""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Redis client closed.")
        redis_client = None


P = ParamSpec("P")
R = TypeVar("R")

def cache_response(
    key_prefix: str = "cache",
    expiration: int = 60,  # seconds
    json_serialize: bool = True
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Decorator to cache the response of an async FastAPI endpoint or function in Redis.

    Args:
        key_prefix (str): Prefix for the Redis key.
        expiration (int): Cache expiration time in seconds.
        json_serialize (bool): If True, response will be JSON serialized/deserialized.
                                Set to False if the function returns a simple string/number.
    """
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            if not redis_client:
                logger.warning("Redis client not available, skipping cache for {func.__name__}.")
                return await func(*args, **kwargs)

            # Generate cache key based on function name and args/kwargs
            # Exclude 'db' session and 'current_user' from key generation if they are args
            relevant_kwargs = {k: v for k, v in kwargs.items() if k not in ['db', 'current_user']}
            cache_key = f"{key_prefix}:{func.__name__}:{json.dumps(args, sort_keys=True)}:{json.dumps(relevant_kwargs, sort_keys=True)}"

            try:
                # Try to get data from cache
                cached_data = await redis_client.get(cache_key)
                if cached_data:
                    logger.debug(f"Cache hit for key: {cache_key}")
                    return json.loads(cached_data) if json_serialize else cached_data
            except Exception as e:
                logger.error(f"Error getting from Redis cache for key {cache_key}: {e}")
                # Continue to function execution if cache read fails

            # If not in cache, execute the function
            result = await func(*args, **kwargs)

            try:
                # Store the result in cache
                data_to_cache = json.dumps(result) if json_serialize else str(result)
                await redis_client.setex(cache_key, expiration, data_to_cache)
                logger.debug(f"Cache set for key: {cache_key} with expiration {expiration}s")
            except Exception as e:
                logger.error(f"Error setting to Redis cache for key {cache_key}: {e}")

            return result
        return wrapper
    return decorator

async def invalidate_cache(key_pattern: str):
    """
    Invalidates cache entries matching a given pattern.
    Use with caution, `KEYS` command can be slow on large datasets.
    Consider `SCAN` in production or more specific invalidation.

    Args:
        key_pattern (str): A Redis key pattern (e.g., "cache:get_user_tasks:*").
    """
    if not redis_client:
        logger.warning("Redis client not available, skipping cache invalidation.")
        return

    try:
        keys_to_delete = []
        async for key in redis_client.scan_iter(match=key_pattern):
            keys_to_delete.append(key)

        if keys_to_delete:
            await redis_client.delete(*keys_to_delete)
            logger.info(f"Invalidated {len(keys_to_delete)} cache entries matching pattern: {key_pattern}")
        else:
            logger.debug(f"No cache entries found for invalidation pattern: {key_pattern}")
    except Exception as e:
        logger.error(f"Error during cache invalidation for pattern {key_pattern}: {e}")

```

```