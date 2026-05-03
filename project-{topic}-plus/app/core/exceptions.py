```python
"""
Custom exception definitions and handlers for the ALX-Shop application.

This module provides:
- `CustomException`: A base class for application-specific HTTP exceptions.
- `custom_exception_handler`: A global FastAPI exception handler that
  converts `CustomException`, `HTTPException`, and `RequestValidationError`
  into standardized JSON error responses.
"""

import logging
from typing import Dict, Any, Optional

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

class CustomException(HTTPException):
    """
    Base class for custom application-specific HTTP exceptions.

    Inherits from FastAPI's HTTPException to allow direct raising
    in API endpoints and automatic handling by FastAPI, but also
    provides a consistent structure for custom error responses.
    """
    def __init__(
        self,
        status_code: int,
        detail: Any = None,
        headers: Optional[Dict[str, str]] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code if error_code else f"ERR-{status_code}"


async def custom_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for the FastAPI application.

    This handler catches various types of exceptions (CustomException, HTTPException,
    RequestValidationError) and formats them into a consistent JSON error response.
    It also logs the exceptions appropriately.

    Args:
        request (Request): The incoming FastAPI request.
        exc (Exception): The exception that was raised.

    Returns:
        JSONResponse: A standardized JSON error response.
    """
    error_detail = "An unexpected error occurred."
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "ERR-500"
    headers: Optional[Dict[str, str]] = None

    if isinstance(exc, CustomException):
        status_code = exc.status_code
        error_detail = exc.detail
        error_code = exc.error_code
        headers = exc.headers
        log_func = logger.warning if status_code < 500 else logger.error
        log_func(f"CustomException handled: {exc.error_code} - {exc.detail} (Status: {exc.status_code}) for {request.url}")

    elif isinstance(exc, StarletteHTTPException):
        status_code = exc.status_code
        error_detail = exc.detail
        error_code = f"HTTP-ERR-{status_code}"
        headers = exc.headers
        log_func = logger.warning if status_code < 500 else logger.error
        log_func(f"HTTPException handled: {exc.detail} (Status: {exc.status_code}) for {request.url}")

    elif isinstance(exc, RequestValidationError) or isinstance(exc, ValidationError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = exc.errors() # Pydantic's error messages
        error_code = "VALIDATION-ERROR"
        logger.warning(f"RequestValidationError handled: {error_detail} for {request.url}")

    else:
        # Catch-all for any other unhandled exceptions
        logger.exception(f"Unhandled exception: {exc} for {request.url}") # Use exception for full traceback

    response_content = {
        "error_code": error_code,
        "message": error_detail,
        "timestamp": request.state.start_time.isoformat() if hasattr(request.state, 'start_time') else datetime.now().isoformat()
    }
    return JSONResponse(
        status_code=status_code,
        content=response_content,
        headers=headers
    )

```