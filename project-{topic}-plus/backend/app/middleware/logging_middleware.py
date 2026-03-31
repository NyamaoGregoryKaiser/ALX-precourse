```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
from backend.app.core.logger import app_logger

class LoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        app_logger.info(f"Request: {request.method} {request.url.path} - "
                        f"Status: {response.status_code} - "
                        f"Time: {process_time:.4f}s")
        return response
```