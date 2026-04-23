```python
import time
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log incoming requests and their processing time.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log incoming request
        logger.info(f"Incoming Request: {request.method} {request.url} from {request.client.host}")
        
        try:
            response = await call_next(request)
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(f"Request failed: {request.method} {request.url} - Error: {e} - Processed in: {process_time:.4f}s")
            raise # Re-raise the exception after logging
        
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        # Log outgoing response
        logger.info(f"Outgoing Response: {request.method} {request.url} - Status: {response.status_code} - Processed in: {process_time:.4f}s")
        
        return response

```