import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Custom middleware for request logging.
    Logs incoming requests and outgoing responses, including processing time.
    """
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request, call_next):
        start_time = time.time()
        
        # Log request details
        logger.info(f"Request: {request.method} {request.url.path} from {request.client.host}")

        response = await call_next(request)

        process_time = time.time() - start_time
        # Log response details and processing time
        logger.info(f"Response: {request.method} {request.url.path} Status: {response.status_code} "
                    f"Process Time: {process_time:.4f}s")
        
        return response
```