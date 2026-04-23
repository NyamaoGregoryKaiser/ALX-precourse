```python
import logging
from typing import Callable, Any, TypeVar
from functools import wraps

from fastapi_cache.decorator import cache as fastapi_cache_decorator

logger = logging.getLogger(__name__)

# Type variable for the decorated function
F = TypeVar('F', bound=Callable[..., Any])

def cache_1_minute(func: F) -> F:
    """
    Decorator to cache the result of an async function for 1 minute.
    """
    @wraps(func)
    @fastapi_cache_decorator(expire=60)  # Cache for 60 seconds
    async def wrapper(*args, **kwargs) -> Any:
        logger.debug(f"Attempting to retrieve/store cache for {func.__name__}")
        return await func(*args, **kwargs)
    return wrapper # type: ignore

def cache_5_minutes(func: F) -> F:
    """
    Decorator to cache the result of an async function for 5 minutes.
    """
    @wraps(func)
    @fastapi_cache_decorator(expire=300)  # Cache for 300 seconds (5 minutes)
    async def wrapper(*args, **kwargs) -> Any:
        logger.debug(f"Attempting to retrieve/store cache for {func.__name__}")
        return await func(*args, **kwargs)
    return wrapper # type: ignore

# Add more caching decorators as needed (e.g., cache_1_hour, cache_no_expiration, etc.)
# For instance, a cache with a specific key generated from arguments:
# @fastapi_cache_decorator(key_builder=lambda f, *args, **kwargs: f"{f.__name__}:{kwargs.get('user_id')}")

# To invalidate cache manually:
# from fastapi_cache.decorator import Coder
# await Coder.clear_cache(namespace=func.__module__, key=cache_key)

```