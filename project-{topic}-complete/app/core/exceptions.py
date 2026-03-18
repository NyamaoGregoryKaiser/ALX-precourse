```python
from fastapi import HTTPException, status


class UnauthorizedException(HTTPException):
    """Custom exception for unauthorized access."""
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(HTTPException):
    """Custom exception for forbidden access (permission denied)."""
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


class NotFoundException(HTTPException):
    """Custom exception for resource not found."""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )


class DuplicateEntryException(HTTPException):
    """Custom exception for duplicate resource creation."""
    def __init__(self, detail: str = "Resource with this name already exists"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )


class BadRequestException(HTTPException):
    """Custom exception for bad request payload or parameters."""
    def __init__(self, detail: str = "Bad request"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

# Example of a custom exception handler that could be added in main.py
# from starlette.requests import Request
# from starlette.responses import JSONResponse
#
# async def custom_exception_handler(request: Request, exc: Exception):
#     # Log the exception for debugging
#     # logger.error(f"Unhandled exception: {exc}")
#     return JSONResponse(
#         status_code=500,
#         content={"detail": "An unexpected error occurred."},
#     )
```