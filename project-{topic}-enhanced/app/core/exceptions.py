```python
import logging
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

class CustomException(HTTPException):
    """
    Base custom exception class for the application.
    """
    def __init__(self, status_code: int, detail: Any = None, headers: Optional[Dict[str, str]] = None):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        logger.error(f"CustomException raised: {self.status_code} - {self.detail}")

class HTTPException400(CustomException):
    def __init__(self, detail: Any = "Bad Request", headers: Optional[Dict[str, str]] = None):
        super().__init__(status.HTTP_400_BAD_REQUEST, detail, headers)

class HTTPException401(CustomException):
    def __init__(self, detail: Any = "Unauthorized", headers: Optional[Dict[str, str]] = None):
        super().__init__(status.HTTP_401_UNAUTHORIZED, detail, {"WWW-Authenticate": "Bearer", **(headers or {})})

class HTTPException403(CustomException):
    def __init__(self, detail: Any = "Forbidden", headers: Optional[Dict[str, str]] = None):
        super().__init__(status.HTTP_403_FORBIDDEN, detail, headers)

class HTTPException404(CustomException):
    def __init__(self, detail: Any = "Not Found", headers: Optional[Dict[str, str]] = None):
        super().__init__(status.HTTP_404_NOT_FOUND, detail, headers)

class HTTPException409(CustomException):
    def __init__(self, detail: Any = "Conflict", headers: Optional[Dict[str, str]] = None):
        super().__init__(status.HTTP_409_CONFLICT, detail, headers)

class HTTPException500(CustomException):
    def __init__(self, detail: Any = "Internal Server Error", headers: Optional[Dict[str, str]] = None):
        super().__init__(status.HTTP_500_INTERNAL_SERVER_ERROR, detail, headers)

async def custom_exception_handler(request, exc: CustomException):
    """
    Global exception handler for CustomException.
    """
    # For more detailed logging, you might want to log request details as well
    logger.error(f"Error processing request for {request.url}: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )

# You can also add handlers for default FastAPI HTTPException
# @app.exception_handler(HTTPException)
# async def http_exception_handler(request, exc: HTTPException):
#     logger.error(f"HTTPException: {exc.status_code} - {exc.detail}")
#     return JSONResponse(
#         status_code=exc.status_code,
#         content={"detail": exc.detail},
#         headers=exc.headers,
#     )

```