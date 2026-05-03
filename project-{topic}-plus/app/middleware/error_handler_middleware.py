from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.types import ASGIApp
from app.core.exceptions import ProjectAPIException, generic_exception_handler
from loguru import logger
from fastapi import status

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Middleware to catch and handle all exceptions, converting them into
    standard JSON responses.
    """
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request, call_next):
        try:
            response = await call_next(request)
            return response
        except ProjectAPIException as e:
            # Custom API exceptions are handled here
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
                headers=e.headers
            )
        except Exception as e:
            # Catch all other unhandled exceptions
            logger.exception(f"Unhandled exception during request processing for path: {request.url.path}")
            return await generic_exception_handler(request, e)
```