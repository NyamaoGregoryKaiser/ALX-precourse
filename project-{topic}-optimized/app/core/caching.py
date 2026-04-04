from redis.asyncio import Redis
from app.core.config import settings

redis_client: Redis | None = None

async def connect_redis():
    """Establishes connection to Redis."""
    global redis_client
    redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=False) # Keep bytes for set/get
    try:
        await redis_client.ping()
        print("Connected to Redis successfully!")
    except Exception as e:
        print(f"Could not connect to Redis: {e}")
        redis_client = None # Ensure it's None if connection failed

async def disconnect_redis():
    """Closes connection to Redis."""
    global redis_client
    if redis_client:
        await redis_client.close()
        print("Disconnected from Redis.")
        redis_client = None

def get_redis_client() -> Redis:
    """Dependency for getting the Redis client."""
    if redis_client is None:
        raise ConnectionError("Redis client not initialized.")
    return redis_client
```