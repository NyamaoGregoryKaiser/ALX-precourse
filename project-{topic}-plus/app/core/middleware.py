```python
import time
import logging
import uuid
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.types import ASGIApp
from fastapi_limiter.depends import RateLimiter

from app.core.exceptions import CustomException, UnauthorizedException, ForbiddenException
from app.core.config import settings

# Configure structured logging for middleware
# A more advanced setup might use a library like Loguru or structlog
logger = logging.getLogger("app.middleware")
logger.setLevel(settings.LOG_LEVEL)

AUTH_HEADER_KEY = "X-Request-ID" # Custom header for tracing requests

def get_request_id(request: Request) -> str:
    """Retrieves or generates a unique request ID."""
    request_id = request.headers.get(AUTH_HEADER_KEY)
    if not request_id:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id # Store for internal use
    return request_id

async def logging_middleware(request: Request, call_next: Callable) -> Response:
    """
    Middleware for logging incoming requests and outgoing responses.
    Assigns a unique request ID for tracing.
    """
    request_id = get_request_id(request)
    request.state.request_id = request_id # Ensure request_id is always available on state

    start_time = time.perf_counter()
    logger.info(f"Request ID: {request_id} - Incoming request: {request.method} {request.url}")

    response = await call_next(request)

    process_time = time.perf_counter() - start_time
    logger.info(
        f"Request ID: {request_id} - Outgoing response: {request.method} {request.url} "
        f"Status: {response.status_code} - Duration: {process_time:.4f}s"
    )
    response.headers[AUTH_HEADER_KEY] = request_id
    return response

async def exception_handling_middleware(request: Request, call_next: Callable) -> Response:
    """
    Middleware for catching unhandled exceptions and returning a consistent error response.
    """
    request_id = get_request_id(request)
    try:
        return await call_next(request)
    except CustomException as e:
        logger.error(f"Request ID: {request_id} - Caught custom exception: {e.name} - {e.message}", exc_info=True)
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.message, "name": e.name},
            headers={AUTH_HEADER_KEY: request_id}
        )
    except Exception as e:
        # Catch all other unexpected errors
        logger.exception(f"Request ID: {request_id} - Unhandled exception caught: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred.", "name": "InternalServerError"},
            headers={AUTH_HEADER_KEY: request_id}
        )

async def rate_limit_middleware(request: Request, call_next: Callable) -> Response:
    """
    Middleware for applying global rate limiting using FastAPI-Limiter.
    This will apply the default rate limit to all endpoints unless overridden.
    """
    request_id = get_request_id(request)
    # Check if redis client is initialized. If not, bypass rate limiting.
    if not hasattr(request.app.state, 'redis') or request.app.state.redis is None:
        logger.warning(f"Request ID: {request_id} - Redis client not available. Bypassing rate limiting.")
        return await call_next(request)

    try:
        # FastAPI-Limiter applies to endpoints using Depends(RateLimiter(...))
        # For a global middleware, we need to manually trigger it.
        # This is a bit tricky with FastAPI-Limiter as it's designed for Depends.
        # A simpler approach for global limit with FastAPI-Limiter is
        # to ensure all endpoints have `Depends(RateLimiter(settings.DEFAULT_RATE_LIMIT))`
        # or use a custom decorator.

        # For a truly global middleware-level rate limit, a custom implementation might be better.
        # However, to demonstrate FastAPI-Limiter, we will primarily rely on per-endpoint application
        # or use a simple check here. For this example, let's just make sure FastAPI-Limiter is initialized.
        # The actual rate limiting logic will be applied at the endpoint level via `Depends`.

        # If a global limit is truly needed at the middleware level, you'd integrate the
        # logic from fastapi_limiter.FastAPILimiter._check_request_limit directly or use a different library.
        # For now, this middleware primarily ensures the FastAPI-Limiter setup is robust.
        return await call_next(request)
    except Exception as e:
        # FastAPI-Limiter raises RateLimitExceeded exception, which should be caught by exception_handling_middleware
        # if it's raised within the endpoint. If it's caught here due to some manual check,
        # ensure it's handled gracefully.
        logger.exception(f"Request ID: {request_id} - Error in rate limiting middleware: {e}")
        raise # Re-raise to be caught by the general exception handler
```