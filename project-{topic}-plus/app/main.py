```python
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi_limiter import FastAPILimiter
import uvicorn
import redis.asyncio as redis

from app.api.v1.endpoints import users, items, orders
from app.core.config import settings
from app.core.exceptions import CustomException, UnauthorizedException, ForbiddenException, NotFoundException
from app.core.middleware import (
    exception_handling_middleware, logging_middleware, rate_limit_middleware,
    AUTH_HEADER_KEY, get_request_id
)
from app.core.cache import get_redis_client

# Configure basic logging
logging.basicConfig(level=settings.LOG_LEVEL,
                    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events for the application.
    Initializes FastAPILimiter and Redis client on startup.
    """
    logger.info("Application startup event triggered.")
    try:
        # Initialize Redis for caching and rate limiting
        # Ensure that the redis client can connect, if not, log and proceed without it
        try:
            redis_client = await get_redis_client()
            await FastAPILimiter.init(redis_client)
            app.state.redis = redis_client # Store redis client in app state
            logger.info("FastAPILimiter and Redis client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Redis or FastAPILimiter: {e}. Caching and rate limiting will be disabled.")
            app.state.redis = None # Set to None if initialization fails

        # You can add other startup logic here, e.g., connecting to other services
        yield # Application runs
    finally:
        logger.info("Application shutdown event triggered.")
        # Clean up resources
        if app.state.redis:
            await app.state.redis.close()
            logger.info("Redis client closed.")
        # FastAPILimiter does not have an explicit shutdown method, relies on redis client closing


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    description="Mobile App Backend System with FastAPI, PostgreSQL, and Docker.",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# --- Global Middleware ---
# Order of middleware matters: logging -> exception handling -> rate limiting -> actual request processing
app.middleware("http")(logging_middleware)
app.middleware("http")(exception_handling_middleware) # Custom exception handling
app.middleware("http")(rate_limit_middleware) # Rate limiting


# --- Global Exception Handlers ---
@app.exception_handler(CustomException)
async def custom_exception_handler(request: Request, exc: CustomException):
    request_id = get_request_id(request)
    logger.error(f"Request ID: {request_id} - Custom exception caught: {exc.name} - {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "name": exc.name},
        headers={AUTH_HEADER_KEY: request_id}
    )

@app.exception_handler(UnauthorizedException)
async def unauthorized_exception_handler(request: Request, exc: UnauthorizedException):
    request_id = get_request_id(request)
    logger.warning(f"Request ID: {request_id} - Unauthorized access attempt: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
        headers={AUTH_HEADER_KEY: request_id, "WWW-Authenticate": "Bearer"}
    )

@app.exception_handler(ForbiddenException)
async def forbidden_exception_handler(request: Request, exc: ForbiddenException):
    request_id = get_request_id(request)
    logger.warning(f"Request ID: {request_id} - Forbidden access attempt: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
        headers={AUTH_HEADER_KEY: request_id}
    )

@app.exception_handler(NotFoundException)
async def not_found_exception_handler(request: Request, exc: NotFoundException):
    request_id = get_request_id(request)
    logger.info(f"Request ID: {request_id} - Resource not found: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
        headers={AUTH_HEADER_KEY: request_id}
    )

# --- API Routers ---
app.include_router(users.router, prefix=settings.API_V1_STR, tags=["users"])
app.include_router(items.router, prefix=settings.API_V1_STR, tags=["items"])
app.include_router(orders.router, prefix=settings.API_V1_STR, tags=["orders"])


@app.get("/", summary="Root endpoint for API status check", include_in_schema=False)
async def root():
    return {"message": "Mobile App Backend is running!"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
```