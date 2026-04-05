```python
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.logger import logger

async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    start_time = time.time()
    
    logger.info(f"Incoming Request: {request.method} {request.url}", extra={
        "request_id": request_id,
        "client_ip": request.client.host if request.client else "N/A",
        "method": request.method,
        "url": str(request.url),
        "headers": {k:v for k,v in request.headers.items() if k.lower() not in ['authorization', 'cookie']} # Avoid logging sensitive headers
    })

    try:
        response = await call_next(request)
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Request processing failed: {e}", extra={
            "request_id": request_id,
            "process_time_ms": round(process_time * 1000, 2),
            "error_type": type(e).__name__
        }, exc_info=True)
        raise

    process_time = time.time() - start_time
    logger.info(f"Outgoing Response: {response.status_code}", extra={
        "request_id": request_id,
        "status_code": response.status_code,
        "process_time_ms": round(process_time * 1000, 2)
    })
    return response

```