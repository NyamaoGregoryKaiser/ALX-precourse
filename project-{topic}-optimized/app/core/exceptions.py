from fastapi import HTTPException, status

class ServiceNotFoundException(HTTPException):
    def __init__(self, detail: str = "Service not found."):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class MetricTypeNotFoundException(HTTPException):
    def __init__(self, detail: str = "Metric type not found."):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class InvalidConditionException(HTTPException):
    def __init__(self, detail: str = "Invalid condition string provided."):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

class UnauthorizedException(HTTPException):
    def __init__(self, detail: str = "Not authenticated or unauthorized."):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

class ForbiddenException(HTTPException):
    def __init__(self, detail: str = "You do not have permission to perform this action."):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

class UserNotFoundException(HTTPException):
    def __init__(self, detail: str = "User not found."):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

```

#### `app/middleware/error_handler.py`
```python