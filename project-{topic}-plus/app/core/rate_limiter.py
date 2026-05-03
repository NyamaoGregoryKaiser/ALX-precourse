```python
"""
Rate Limiting configuration for the ALX-Shop application.

This module integrates `fastapi-limiter` to provide API rate limiting.
It defines global and per-endpoint rate limits using Redis as a backend.
"""

import logging
from typing import Optional, Union, Tuple, Callable

from fastapi import Depends, Request, Response
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter as BaseRateLimiter
from redis import asyncio as aioredis

from app.core.config import settings
from app.core.exceptions import CustomException
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

logger = logging.getLogger(__name__)

# Global limiter instance
limiter: Optional[FastAPILimiter] = None

async def setup_rate_limiter():
    """
    Initializes the FastAPI-Limiter with a Redis backend.
    This function should be called during application startup.
    """
    global limiter
    try:
        redis_connection = aioredis.from_url(
            settings.REDIS_URI,
            encoding="utf-8",
            decode_responses=True
        )
        limiter = await FastAPILimiter.init(redis_connection)
        logger.info(f"FastAPI-Limiter initialized with Redis at {settings.REDIS_URI}")
    except Exception as e:
        logger.error(f"Failed to connect to Redis for rate limiting: {e}")
        # In a production environment, you might want to raise this exception
        # or implement a fallback, e.g., a simple in-memory limiter (less robust).
        # For now, we'll let `limiter` remain None and handle it in the dependency.
        limiter = None
        logger.warning("Rate limiting will be disabled due to Redis connection failure.")


class RateLimit(BaseRateLimiter):
    """
    A custom RateLimit dependency that extends `fastapi_limiter.depends.RateLimiter`.

    It provides a more user-friendly decorator interface for setting rate limits
    on FastAPI endpoints and integrates with our custom exception handling.
    """
    def __init__(self, times: int, seconds: int, identifier: Optional[Callable[..., str]] = None):
        """
        Initializes the RateLimit.

        Args:
            times (int): The maximum number of requests allowed.
            seconds (int): The time window in seconds.
            identifier (Optional[Callable]): A function to generate a unique identifier
                                             for rate limiting. Defaults to IP address.
        """
        if limiter is None:
            # If limiter is not initialized (e.g., Redis failed), disable rate limiting.
            # This makes the dependency a no-op.
            async def no_op_rate_limiter(request: Request, response: Response) -> None:
                pass
            self.dependency = no_op_rate_limiter
            logger.warning(f"RateLimiter decorator called, but limiter is not initialized. Rate limiting is disabled.")
        else:
            # Call the parent's init method to set up the actual rate limiting logic
            super().__init__(times, seconds, identifier)
            self.dependency = super().__call__ # Store the actual dependency callable

    async def __call__(self, request: Request, response: Response):
        """
        Invokes the rate limiting logic.

        Args:
            request (Request): The incoming FastAPI request.
            response (Response): The outgoing FastAPI response.

        Raises:
            CustomException: If the rate limit is exceeded.
        """
        try:
            # If limiter is None, our `dependency` is `no_op_rate_limiter` which does nothing.
            await self.dependency(request, response)
        except CustomException as e:
            # `fastapi_limiter` raises a HTTPException (429) directly.
            # We catch it and re-raise as our custom exception for consistent handling.
            logger.warning(
                f"Rate limit exceeded for {request.client.host} on {request.url.path}. "
                f"Limit: {self.times} reqs / {self.seconds}s."
            )
            raise CustomException(
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Too many requests.",
                error_code="RATE_LIMIT_EXCEEDED",
                headers={
                    "Retry-After": str(e.headers.get("Retry-After", 0)) if e.headers else "0"
                }
            )

# Alias for simpler decorator usage
RateLimiter = RateLimit

```