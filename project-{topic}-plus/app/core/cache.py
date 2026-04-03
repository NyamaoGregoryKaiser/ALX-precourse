from typing import Optional
from redis.asyncio import Redis, ConnectionPool
from redis.exceptions import ConnectionError as RedisConnectionError
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[Redis] = None
_redis_pool: Optional[ConnectionPool] = None

async def init_redis_cache():
    """
    Initializes the Redis connection pool and client.
    """
    global _redis_pool, _redis_client
    try:
        _redis_pool = ConnectionPool(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            encoding="utf-8",
            decode_responses=True,
        )
        _redis_client = Redis(connection_pool=_redis_pool)
        # Ping to check connection
        await _redis_client.ping()
        logger.info(f"Redis connected at {settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}")
    except RedisConnectionError as e:
        logger.error(f"Failed to connect to Redis: {e}")
        _redis_client = None # Ensure client is None if connection fails
    except Exception as e:
        logger.error(f"An unexpected error occurred during Redis initialization: {e}")
        _redis_client = None

async def close_redis_cache():
    """
    Closes the Redis connection pool.
    """
    global _redis_client, _redis_pool
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
    if _redis_pool:
        await _redis_pool.disconnect()
        _redis_pool = None
    logger.info("Redis connection closed.")

async def get_redis_client() -> Optional[Redis]:
    """
    Returns the initialized Redis client.
    """
    if _redis_client is None:
        logger.warning("Redis client not initialized. Call init_redis_cache() first.")
    return _redis_client

async def invalidate_cache(key: str):
    """
    Invalidates a specific key in the Redis cache.
    """
    redis = await get_redis_client()
    if redis:
        await redis.delete(key)
        logger.debug(f"Cache key '{key}' invalidated.")

async def set_cache(key: str, value: str, ttl: int = 300):
    """
    Sets a value in the Redis cache with a time-to-live (TTL).
    """
    redis = await get_redis_client()
    if redis:
        await redis.set(key, value, ex=ttl)
        logger.debug(f"Cache key '{key}' set with TTL {ttl}s.")

async def get_cache(key: str) -> Optional[str]:
    """
    Retrieves a value from the Redis cache.
    """
    redis = await get_redis_client()
    if redis:
        value = await redis.get(key)
        if value:
            logger.debug(f"Cache key '{key}' hit.")
            return value
        logger.debug(f"Cache key '{key}' miss.")
    return None