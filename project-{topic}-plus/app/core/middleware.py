import time
import json
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.types import ASGIApp
from starlette import status
from redis.asyncio import Redis

from app.core.cache import get_redis_client
from app.core.config import settings
from app.core.errors import (
    NotFoundException,
    ForbiddenException,
    UnauthorizedException,
    DuplicateEntryException,
    InternalServerError,
)

logger = logging.getLogger(__name__)

async def add_process_time_header(request: Request, call_next):
    """
    Middleware to add X-Process-Time header to responses.
    """
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.debug(f"Request {request.url.path} processed in {process_time:.4f}s")
    return response

async def catch_exceptions_middleware(request: Request, call_next):
    """
    Middleware to catch and handle common exceptions, returning appropriate JSON responses.
    """
    try:
        return await call_next(request)
    except NotFoundException as exc:
        logger.warning(f"NotFoundException: {exc.detail} for {request.url}")
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    except ForbiddenException as exc:
        logger.warning(f"ForbiddenException: {exc.detail} for {request.url}")
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    except UnauthorizedException as exc:
        logger.warning(f"UnauthorizedException: {exc.detail} for {request.url}")
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)
    except DuplicateEntryException as exc:
        logger.warning(f"DuplicateEntryException: {exc.detail} for {request.url}")
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    except Exception as e:
        logger.error(f"Unhandled exception: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error occurred."},
        )

async def rate_limit_middleware(request: Request, call_next):
    """
    Middleware to enforce rate limiting using Redis.
    Limits requests based on IP address.
    """
    redis_client: Optional[Redis] = await get_redis_client()
    if not redis_client:
        logger.warning("Redis client not available for rate limiting. Skipping.")
        return await call_next(request)

    ip_address = request.client.host if request.client else "unknown"
    key = f"rate_limit:{ip_address}"
    max_requests = settings.RATE_LIMIT_PER_MINUTE # Per minute
    window = 60 # seconds

    try:
        current_requests = await redis_client.incr(key)
        if current_requests == 1:
            await redis_client.expire(key, window)
        
        if current_requests > max_requests:
            logger.warning(f"Rate limit exceeded for IP: {ip_address}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": f"Rate limit exceeded. Try again in {window} seconds."},
                headers={"Retry-After": str(window)},
            )
    except Exception as e:
        logger.error(f"Rate limiting failed due to Redis error: {e}", exc_info=True)
        # Fail open: if Redis is down, don't block requests
        pass

    response = await call_next(request)
    return response

# Basic logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ml_utilities_system")