import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.exceptions import CustomHTTPException # Assuming you have a custom exception class

logger = logging.getLogger(__name__)

async def http_exception_handler(request: Request, exc: status.HTTPException):
    """
    Handles custom HTTP exceptions, returning a structured JSON response.
    """
    logger.error(f"HTTP Error: {exc.status_code} - {exc.detail} for URL: {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handles Pydantic validation errors from incoming requests,
    returning a structured JSON response with detailed error messages.
    """
    errors = []
    for error in exc.errors():
        # Customize the error format as needed
        errors.append({
            "loc": [str(loc) for loc in error["loc"]],
            "msg": error["msg"],
            "type": error["type"],
        })
    logger.error(f"Validation Error: {errors} for URL: {request.url}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": errors},
    )

# You can add more specific exception handlers here if needed
# For example, for SQLAlchemy errors, JWT errors, etc.
# For now, generic HTTP and validation handlers cover most cases.
```