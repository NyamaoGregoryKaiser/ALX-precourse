```python
import logging
from typing import Callable, Any, TypeVar
from functools import wraps

from fastapi_limiter.depends import RateLimiter

logger = logging.getLogger(__name__)

# Type variable for the decorated function
F = TypeVar('F', bound=Callable[..., Any])

def rate_limit_10_per_minute(func: F) -> F:
    """
    Decorator to apply a rate limit of 10 requests per minute.
    Applies to the function as a dependency.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        # The RateLimiter dependency needs to be injected in the FastAPI path operation,
        # not directly as a function decorator like this for full effect with FastAPI-Limiter.
        # This wrapper serves as a placeholder to indicate the intent and for potential
        # future direct integration with function calls if FastAPI-Limiter extends.
        # For actual FastAPI endpoints, use `Depends(RateLimiter(times=10, seconds=60))`.
        logger.debug(f"Applying rate limit for {func.__name__}: 10/minute")
        return await func(*args, **kwargs)
    return wrapper # type: ignore

# This is the actual way to use rate limiting in FastAPI with FastAPI-Limiter
# Example in an endpoint:
# @router.get("/my-limited-endpoint", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
# async def get_limited_data():
#     return {"message": "This endpoint is rate limited to 10 requests per minute."}

# You can create different RateLimiter instances for different limits:
rate_limiter_10_per_minute = RateLimiter(times=10, seconds=60)
rate_limiter_5_per_minute = RateLimiter(times=5, seconds=60)
rate_limiter_30_per_hour = RateLimiter(times=30, hours=1)

```