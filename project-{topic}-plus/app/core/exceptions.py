```python
from fastapi import status

class CustomException(Exception):
    """Base class for custom application exceptions."""
    def __init__(self, status_code: int, message: str = "An unexpected error occurred", name: str = "ServerError"):
        self.status_code = status_code
        self.message = message
        self.name = name
        super().__init__(self.message)

class UnauthorizedException(CustomException):
    """Exception for unauthorized access (e.g., invalid or missing token)."""
    def __init__(self, message: str = "Not authenticated", name: str = "Unauthorized"):
        super().__init__(status.HTTP_401_UNAUTHORIZED, message, name)

class ForbiddenException(CustomException):
    """Exception for authorized but not permitted access (e.g., wrong role)."""
    def __init__(self, message: str = "Not authorized to perform this action", name: str = "Forbidden"):
        super().__init__(status.HTTP_403_FORBIDDEN, message, name)

class NotFoundException(CustomException):
    """Exception for resource not found."""
    def __init__(self, message: str = "Resource not found", name: str = "NotFound"):
        super().__init__(status.HTTP_404_NOT_FOUND, message, name)

class BadRequestException(CustomException):
    """Exception for invalid request payload or parameters."""
    def __init__(self, message: str = "Bad request", name: str = "BadRequest"):
        super().__init__(status.HTTP_400_BAD_REQUEST, message, name)

class ConflictException(CustomException):
    """Exception for conflicting resource creation (e.g., duplicate unique field)."""
    def __init__(self, message: str = "Resource already exists", name: str = "Conflict"):
        super().__init__(status.HTTP_409_CONFLICT, message, name)

class UnprocessableEntityException(CustomException):
    """Exception for unprocessable entity (e.g., semantic errors in request)."""
    def __init__(self, message: str = "Unprocessable entity", name: str = "UnprocessableEntity"):
        super().__init__(status.HTTP_422_UNPROCESSABLE_ENTITY, message, name)

class ServiceUnavailableException(CustomException):
    """Exception for when an external service is unavailable."""
    def __init__(self, message: str = "Service unavailable", name: str = "ServiceUnavailable"):
        super().__init__(status.HTTP_503_SERVICE_UNAVAILABLE, message, name)
```