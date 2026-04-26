```python
class NotFoundException(Exception):
    """Custom exception for resources not found."""
    def __init__(self, message: str = "Resource not found."):
        self.message = message
        super().__init__(self.message)

class ConflictException(Exception):
    """Custom exception for conflicting resource states (e.g., duplicate unique field)."""
    def __init__(self, message: str = "Resource conflict."):
        self.message = message
        super().__init__(self.message)

class ForbiddenException(Exception):
    """Custom exception for unauthorized access (permission denied)."""
    def __init__(self, message: str = "Access forbidden."):
        self.message = message
        super().__init__(self.message)

class UnauthorizedException(Exception):
    """Custom exception for unauthenticated access."""
    def __init__(self, message: str = "Not authenticated."):
        self.message = message
        super().__init__(self.message)

class ServiceUnavailableException(Exception):
    """Custom exception for when an external service is unavailable."""
    def __init__(self, message: str = "Service unavailable, please try again later."):
        self.message = message
        super().__init__(self.message)

```

**Caching Layer**
*   `backend/main.py`: `FastAPICache.init` and `invalidate_cache_for_pattern` example.
*   `backend/app/utils/caching.py`: Utility for cache management.
*   API endpoints can use `@cache()` decorator from `fastapi_cache.decorator`.