from fastapi import HTTPException, status

class ProjectAPIException(HTTPException):
    """Base custom exception for the Project Management API."""
    def __init__(self, status_code: int, detail: str, headers: dict = None):
        super().__init__(status_code=status_code, detail=detail, headers=headers)

class NotFoundException(ProjectAPIException):
    """Exception for resources not found."""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class UnauthorizedException(ProjectAPIException):
    """Exception for unauthorized access."""
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail,
                         headers={"WWW-Authenticate": "Bearer"})

class ForbiddenException(ProjectAPIException):
    """Exception for insufficient permissions."""
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

class BadRequestException(ProjectAPIException):
    """Exception for bad request input."""
    def __init__(self, detail: str = "Bad request"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

class ConflictException(ProjectAPIException):
    """Exception for conflicting resource creation/update."""
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)

class UnprocessableEntityException(ProjectAPIException):
    """Exception for valid but unprocessable entity."""
    def __init__(self, detail: str = "Unprocessable Entity"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

# Global Exception Handlers (to be registered in main.py)
# These convert custom exceptions into FastAPI HTTPExceptions
async def http_exception_handler(request, exc: HTTPException):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers
    )

async def validation_exception_handler(request, exc):
    from fastapi.responses import JSONResponse
    from pydantic import ValidationError
    if isinstance(exc, ValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()},
        )
    # Default to FastAPI's own handler for RequestValidationError
    from fastapi.exceptions import RequestValidationError
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()},
        )
    # Fallback for other unhandled exceptions
    return await http_exception_handler(request, HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred"))

async def generic_exception_handler(request, exc: Exception):
    from fastapi.responses import JSONResponse
    from loguru import logger
    logger.exception(f"Unhandled exception: {exc}") # Log the full traceback
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred."},
    )
```