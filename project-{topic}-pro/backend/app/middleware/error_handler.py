```python
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from app.exceptions import (
    ConflictException,
    NotFoundException,
    ForbiddenException,
    UnauthorizedException,
    ServiceUnavailableException
)
from app.utils.logging import get_logger

logger = get_logger(__name__)

async def custom_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for the FastAPI application.
    It catches various exceptions and returns standardized JSON error responses.
    """
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    detail: str = "An unexpected error occurred."
    error_type: str = "InternalServerError"

    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        detail = exc.detail
        error_type = exc.__class__.__name__
    elif isinstance(exc, ValidationError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        detail = exc.errors() # Pydantic provides a list of errors
        error_type = "ValidationError"
    elif isinstance(exc, NotFoundException):
        status_code = status.HTTP_404_NOT_FOUND
        detail = str(exc)
        error_type = "NotFound"
    elif isinstance(exc, ConflictException):
        status_code = status.HTTP_409_CONFLICT
        detail = str(exc)
        error_type = "Conflict"
    elif isinstance(exc, ForbiddenException):
        status_code = status.HTTP_403_FORBIDDEN
        detail = str(exc)
        error_type = "Forbidden"
    elif isinstance(exc, UnauthorizedException):
        status_code = status.HTTP_401_UNAUTHORIZED
        detail = str(exc)
        error_type = "Unauthorized"
    elif isinstance(exc, ServiceUnavailableException):
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        detail = str(exc)
        error_type = "ServiceUnavailable"
    else:
        # Log unexpected errors for debugging
        logger.exception(f"Unhandled exception caught by middleware: {exc}")
        # Optionally, send to Sentry or other monitoring tools here.

    return JSONResponse(
        status_code=status_code,
        content={"detail": detail, "error_type": error_type},
    )

```