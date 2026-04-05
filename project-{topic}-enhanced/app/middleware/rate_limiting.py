```python
import redis.asyncio as redis
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from app.core.logger import logger
from app.core.config import settings

_rate_limiter_initialized = False

async def setup_rate_limiter(redis_client: redis.Redis):
    """Initializes FastAPI-Limiter with the Redis client."""
    global _rate_limiter_initialized
    if not _rate_limiter_initialized and redis_client:
        try:
            await FastAPILimiter.init(redis_client)
            _rate_limiter_initialized = True
            logger.info("FastAPI-Limiter initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize FastAPI-Limiter: {e}")
    elif not redis_client:
        logger.warning("Redis client not available, FastAPI-Limiter will not be initialized.")

async def rate_limit_middleware(request: Request, call_next):
    """
    Custom middleware to catch rate limit exceptions and return a consistent JSON response.
    This wraps the FastAPI-Limiter's internal exception handling.
    """
    if not _rate_limiter_initialized:
        return await call_next(request) # Skip if not initialized

    try:
        response = await call_next(request)
        return response
    except Exception as e:
        if "rate limit exceeded" in str(e).lower(): # Simple check for FastAPI-Limiter's exception message
            logger.warning(f"Rate limit exceeded for {request.url.path}", extra={"request_id": request.state.request_id})
            return JSONResponse(
                status_code=429,
                content={"detail": "Too Many Requests. Please try again later."},
                headers={"Retry-After": "60"} # Example
            )
        raise # Re-raise if not a rate limit error

# Dependency for applying rate limits to specific endpoints
# Example usage in an endpoint: Depends(rate_limiter_dependency)
rate_limiter_dependency = RateLimiter(times=5, seconds=60) # 5 requests per minute by default
```