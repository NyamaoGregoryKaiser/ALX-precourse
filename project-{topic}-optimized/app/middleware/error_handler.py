from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.requests import Request
from fastapi import HTTPException, status
from pydantic import ValidationError
from typing import Callable
from app.core.logger import logger
from app.core.exceptions import (
    ServiceNotFoundException, MetricTypeNotFoundException,
    InvalidConditionException, UnauthorizedException, ForbiddenException,
    UserNotFoundException
)

class CustomExceptionHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        try:
            response = await call_next(request)
            return response
        except ServiceNotFoundException as e:
            logger.warning(f"Service not found: {e.detail}")
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
            )
        except MetricTypeNotFoundException as e:
            logger.warning(f"Metric type not found: {e.detail}")
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
            )
        except InvalidConditionException as e:
            logger.warning(f"Invalid condition: {e.detail}")
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
            )
        except UnauthorizedException as e:
            logger.warning(f"Unauthorized access: {e.detail}")
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
                headers={"WWW-Authenticate": "Bearer"},
            )
        except ForbiddenException as e:
            logger.warning(f"Forbidden access: {e.detail}")
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
            )
        except UserNotFoundException as e:
            logger.warning(f"User not found: {e.detail}")
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
            )
        except HTTPException as e:
            logger.error(f"HTTPException caught: {e.detail} (Status: {e.status_code})")
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
            )
        except ValidationError as e:
            logger.error(f"Pydantic validation error: {e.errors()}")
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"detail": e.errors()},
            )
        except Exception as e:
            logger.exception(f"Unhandled exception: {e}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "An unexpected error occurred."},
            )

```

#### `app/models/base.py`
```python