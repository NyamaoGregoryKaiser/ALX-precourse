```python
import logging
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi import HTTPException, status
from fastapi.exceptions import RequestValidationError
from jose import JWTError
from sqlalchemy.exc import IntegrityError, NoResultFound

logger = logging.getLogger(__name__)

async def custom_exception_handler(request: Request, exc: Exception) -> Response:
    """
    Global exception handler for the application.
    Catches common exceptions and returns standardized JSON responses.
    """
    if isinstance(exc, StarletteHTTPException):
        # FastAPI/Starlette's own HTTPException
        logger.warning(f"HTTP Exception: {exc.status_code} - {exc.detail} for {request.url}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=exc.headers
        )
    elif isinstance(exc, RequestValidationError):
        # Pydantic validation errors
        detail = exc.errors()
        logger.warning(f"Validation Error: {detail} for {request.url}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": detail},
        )
    elif isinstance(exc, IntegrityError):
        # Database integrity errors (e.g., duplicate unique field)
        logger.error(f"Database Integrity Error: {exc} for {request.url}")
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT, # Conflict indicates resource already exists or conflict
            content={"detail": "A resource with this unique identifier already exists or conflicts with existing data."}
        )
    elif isinstance(exc, JWTError):
        # JWT validation errors (e.g., malformed token, signature mismatch)
        logger.warning(f"JWT Error: {exc} for {request.url}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Invalid authentication token"},
            headers={"WWW-Authenticate": "Bearer"}
        )
    elif isinstance(exc, NoResultFound):
        # SQLAlchemy error when scalar_one() fails to find a result
        logger.warning(f"No Result Found Error: {exc} for {request.url}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "Resource not found"}
        )
    else:
        # Catch-all for any other unhandled exceptions
        logger.exception(f"Unhandled Exception: {exc} for {request.url}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"}
        )

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging incoming requests and outgoing responses.
    """
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        logger.info(f"Request: {request.method} {request.url}")
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"Request failed with exception: {e}", exc_info=True)
            raise e # Re-raise to be caught by custom_exception_handler
        logger.info(f"Response: {request.method} {request.url} - Status {response.status_code}")
        return response

```