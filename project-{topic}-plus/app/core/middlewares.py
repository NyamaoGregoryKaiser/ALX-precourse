```python
"""
Custom FastAPI middlewares for the ALX-Shop application.

This module defines middleware components that can process incoming requests
before they reach the routes and outgoing responses after they leave the routes.
Currently includes:
- `LoggingMiddleware`: Logs request and response details, including duration.
"""

import logging
import time
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging incoming requests and outgoing responses.

    This middleware logs:
    - The start of each request.
    - The HTTP method, URL path, and remote IP address.
    - The HTTP status code and response time for each request.
    - Any exceptions that occur during request processing.
    """
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        """
        Dispatches the request through the middleware chain.

        Args:
            request (Request): The incoming Starlette request object.
            call_next (Callable): The next middleware or the endpoint handler.

        Returns:
            Response: The Starlette response object.
        """
        start_time = time.monotonic()
        request.state.start_time = datetime.now() # Store datetime object for exceptions

        try:
            # Log incoming request
            logger.info(
                f"Request started: {request.method} {request.url.path} "
                f"from {request.client.host}:{request.client.port}"
            )

            # Process the request
            response = await call_next(request)

            # Log outgoing response
            process_time = time.monotonic() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            logger.info(
                f"Request finished: {request.method} {request.url.path} "
                f"Status: {response.status_code} - Duration: {process_time:.4f}s"
            )
            return response
        except Exception as e:
            process_time = time.monotonic() - start_time
            logger.error(
                f"Request failed: {request.method} {request.url.path} "
                f"Error: {e.__class__.__name__} - Duration: {process_time:.4f}s",
                exc_info=True # Log full traceback
            )
            raise # Re-raise the exception for FastAPI's exception handlers

```