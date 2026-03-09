from fastapi import HTTPException, status

"""
Custom exception classes for the application.
This centralizes common HTTP errors, making error handling consistent.
"""

class APIException(HTTPException):
    """
    Base custom API exception.
    Inherits from HTTPException to be compatible with FastAPI's exception handling.
    """
    def __init__(self, status_code: int, detail: str, headers: dict = None):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class NotFoundException(APIException):
    """
    Exception raised when a resource is not found.
    Corresponds to HTTP 404 Not Found.
    """
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ConflictException(APIException):
    """
    Exception raised when there's a conflict with the current state of the resource.
    Corresponds to HTTP 409 Conflict.
    Commonly used for unique constraint violations (e.g., email already exists).
    """
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class UnauthorizedException(APIException):
    """
    Exception raised when authentication fails or is required.
    Corresponds to HTTP 401 Unauthorized.
    """
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(APIException):
    """
    Exception raised when a user is authenticated but does not have
    the necessary permissions to perform an action.
    Corresponds to HTTP 403 Forbidden.
    """
    def __init__(self, detail: str = "Not authorized to perform this action"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class BadRequestException(APIException):
    """
    Exception raised when the request is malformed or invalid.
    Corresponds to HTTP 400 Bad Request.
    """
    def __init__(self, detail: str = "Bad request"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class InternalServerErrorException(APIException):
    """
    Exception raised for unexpected server errors.
    Corresponds to HTTP 500 Internal Server Error.
    """
    def __init__(self, detail: str = "An unexpected error occurred"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


# Add more custom exceptions as needed for specific business logic errors.
# Example:
class TaskStatusInvalidException(BadRequestException):
    def __init__(self, detail: str = "Invalid task status transition"):
        super().__init__(detail=detail)

```

```