import logging
import time

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis_backend import RedisBackend
from fastapi_limiter import FastAPILimiter
import redis.asyncio as aioredis

from app.api.v1.router import api_router
from app.core.config import settings
from app.middleware.error_handler import http_exception_handler, validation_exception_handler
from app.middleware.logging_middleware import LoggingMiddleware
from app.utils.logger import setup_logging

# Setup logging before FastAPI app creation
setup_logging(settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    openapi_url=f"/openapi.json" if settings.DEBUG else None,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# --- Middleware ---
app.add_middleware(LoggingMiddleware)

# --- Exception Handlers ---
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(status.HTTPException, http_exception_handler)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """
    Middleware to add X-Process-Time header to responses.
    This helps in performance monitoring.
    """
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.debug(f"Request to {request.url.path} processed in {process_time:.4f} seconds")
    return response

# --- Routers ---
app.include_router(api_router, prefix="/api/v1")

# --- Event Handlers (Startup/Shutdown) ---
@app.on_event("startup")
async def startup_event():
    """
    Actions to perform on application startup.
    Initializes Redis for caching and rate limiting.
    """
    logger.info("Application startup initiated.")
    try:
        redis_instance = aioredis.from_url(
            f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
            encoding="utf8",
            decode_responses=True
        )
        await FastAPILimiter.init(redis_instance)
        FastAPICache.init(RedisBackend(redis_instance), prefix="fastapi-cache")
        logger.info("Redis connection established and caching/rate limiting initialized.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        # Depending on criticality, you might want to exit or disable features.
        # For now, we'll let the app start but features relying on Redis will fail.

    logger.info("Application startup complete.")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Actions to perform on application shutdown.
    Cleans up resources.
    """
    logger.info("Application shutdown initiated.")
    # Add any cleanup logic here, e.g., closing database connections if not handled by ORM
    # For SQLAlchemy, connection pool handles this.
    logger.info("Application shutdown complete.")

# --- Root Endpoint (Health Check) ---
@app.get("/", summary="Health Check", description="Returns a simple message to indicate the API is running.")
async def root():
    """
    Root endpoint for health checks.
    """
    return {"message": "Mobile Backend API is running!"}

```