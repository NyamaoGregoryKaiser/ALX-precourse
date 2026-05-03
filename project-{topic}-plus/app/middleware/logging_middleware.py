from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp
import time
from loguru import logger

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log details about incoming requests and outgoing responses.
    """
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        request_id = request.headers.get("X-Request-ID", "N/A")

        # Log request details
        logger.info(
            f"[{request_id}] Incoming Request: {request.method} {request.url.path} "
            f"from {request.client.host}:{request.client.port}"
        )

        try:
            response = await call_next(request)
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"[{request_id}] Request Error: {request.method} {request.url.path} "
                f"took {process_time:.4f}s - Exception: {e}"
            )
            raise e # Re-raise to be caught by other error handling middleware

        process_time = time.time() - start_time

        # Log response details
        logger.info(
            f"[{request_id}] Outgoing Response: {request.method} {request.url.path} "
            f"Status: {response.status_code} took {process_time:.4f}s"
        )
        return response
```