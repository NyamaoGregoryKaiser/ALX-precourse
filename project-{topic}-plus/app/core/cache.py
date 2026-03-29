```python
import redis.asyncio as redis
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[redis.Redis] = None

async def get_redis_client() -> redis.Redis:
    """
    Initializes and returns a singleton Redis client.
    """
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True # Decodes responses to Python strings automatically
            )
            await _redis_client.ping() # Test connection
            logger.info("Redis client connected successfully.")
        except Exception as e:
            logger.error(f"Could not connect to Redis at {settings.REDIS_URL}: {e}")
            _redis_client = None # Reset to None if connection fails
            raise # Re-raise to indicate failure
    return _redis_client

async def close_redis_client() -> None:
    """
    Closes the Redis client connection.
    """
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis client closed.")

async def get_from_cache(key: str) -> Optional[str]:
    """Retrieves data from Redis cache."""
    try:
        client = await get_redis_client()
        if client:
            return await client.get(key)
        return None
    except Exception as e:
        logger.error(f"Error getting key '{key}' from cache: {e}")
        return None

async def set_to_cache(key: str, value: str, ttl: int = 300) -> None:
    """Sets data to Redis cache with an optional time-to-live (TTL)."""
    try:
        client = await get_redis_client()
        if client:
            await client.setex(key, ttl, value)
            logger.debug(f"Key '{key}' set in cache with TTL {ttl}.")
    except Exception as e:
        logger.error(f"Error setting key '{key}' to cache: {e}")

async def delete_from_cache(key: str) -> None:
    """Deletes data from Redis cache."""
    try:
        client = await get_redis_client()
        if client:
            await client.delete(key)
            logger.debug(f"Key '{key}' deleted from cache.")
    except Exception as e:
        logger.error(f"Error deleting key '{key}' from cache: {e}")
```