```python
from fastapi import Request, status, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from backend.app.core.logger import app_logger

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except HTTPException as exc:
            app_logger.error(f"HTTPException: {exc.detail} (Status: {exc.status_code})")
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail}
            )
        except Exception as e:
            app_logger.exception(f"Unhandled exception: {e}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error"}
            )
```