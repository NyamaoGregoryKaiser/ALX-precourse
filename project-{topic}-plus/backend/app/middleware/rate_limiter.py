```python
from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import redis.asyncio as redis
from backend.app.core.config import settings
from backend.app.core.logger import app_logger

# Initialize Redis client globally or per-request (per-request for simplicity here)
_redis_client: Optional[redis.Redis] = None

async def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    return _redis_client

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, limit: int = 100, period: int = 60):
        super().__init__(app)
        self.limit = limit # requests per period
        self.period = period # seconds
        app_logger.info(f"Rate Limiting enabled: {limit} requests per {period} seconds.")

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/v1/auth/token"): # Don't rate limit login too aggressively
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}:{request.url.path}"

        r = await get_redis_client()
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, self.period)

        if count > self.limit:
            app_logger.warning(f"Rate limit exceeded for IP: {client_ip} on path: {request.url.path}")
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again in {self.period} seconds."
            )
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.limit - count))
        return response
```