```python
import functools
from app.extensions import cache

def cached(timeout=None, key_prefix='view_'):
    """
    Decorator to cache the result of a function.
    Uses Flask-Caching extension.

    Args:
        timeout (int, optional): Cache expiration in seconds. Defaults to CACHE_DEFAULT_TIMEOUT.
        key_prefix (str, optional): Prefix for the cache key. Defaults to 'view_'.
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            # Generate a cache key based on function name, args, and kwargs
            # A more robust key generation might involve request path/query params for routes
            cache_key = f"{key_prefix}{f.__name__}_{hash(frozenset(kwargs.items()))}_{hash(args)}"

            # Try to get data from cache
            result = cache.get(cache_key)

            if result is not None:
                return result

            # If not in cache, call the original function
            result = f(*args, **kwargs)

            # Store the result in cache
            cache.set(cache_key, result, timeout=timeout)
            return result
        return decorated_function
    return decorator

# Example usage within a service layer:
# @cached(timeout=600, key_prefix='posts_')
# def get_all_posts_from_db():
#     # ... query database ...
#     return posts
```