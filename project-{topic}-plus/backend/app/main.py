```python
import logging
import time
from contextlib import asynccontextmanager
import redis.asyncio as aioredis
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi_limiter import FastAPILimiter

from app.core.config import get_settings
from app.core.db import init_db
from app.api import api_router
from app.core.middleware import custom_exception_handler, LoggingMiddleware

# Initialize settings and logger
settings = get_settings()
logging.basicConfig(level=settings.LOG_LEVEL.upper())
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Context manager for application startup and shutdown events.
    Handles database initialization, Redis connection, and FastAPILimiter setup.
    """
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Initialize database
    await init_db()

    # Initialize Redis for caching and rate limiting
    try:
        # Use aioredis from redis.asyncio
        redis_connection = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
        await FastAPILimiter.init(redis_connection)
        app.state.redis = redis_connection # Store Redis connection in app state
        logger.info("Redis connection and FastAPILimiter initialized.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}", exc_info=True)
        # Depending on criticality, you might want to raise and prevent startup or continue with degraded functionality
        # For now, we'll let it proceed but note the issue.

    yield # Application runs here

    # Shutdown events
    logger.info("Shutting down application...")
    if hasattr(app.state, 'redis') and app.state.redis:
        await app.state.redis.close()
        logger.info("Redis connection closed.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan # Integrate lifespan function
)

# --- Middleware ---

# Custom Logging Middleware
app.add_middleware(LoggingMiddleware)

# CORS Middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
app.add_exception_handler(StarletteHTTPException, custom_exception_handler)
app.add_exception_handler(RequestValidationError, custom_exception_handler)
app.add_exception_handler(Exception, custom_exception_handler) # Catch-all


# --- Routes ---

# Health check endpoint
@app.get("/health", response_class=JSONResponse, status_code=status.HTTP_200_OK, tags=["Monitoring"])
async def health_check():
    """
    Basic health check endpoint.
    """
    return {"status": "ok", "app_name": settings.APP_NAME, "version": settings.APP_VERSION}

# Include API router
app.include_router(api_router, prefix="/api")

# Optional: Root endpoint
@app.get("/", include_in_schema=False)
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API. See /docs for API documentation."}


# --- Example of using Redis (Beyond FastAPILimiter) for caching ---
@app.get("/cached_data", tags=["Caching"])
async def get_cached_data(request: Request):
    """
    Example endpoint demonstrating Redis caching.
    """
    redis = request.app.state.redis
    cache_key = "example_data"
    cached_value = await redis.get(cache_key)

    if cached_value:
        logger.info("Returning data from cache.")
        return {"source": "cache", "data": cached_value}
    else:
        logger.info("Fetching data and setting to cache.")
        # Simulate fetching data from a slow source
        await asyncio.sleep(1) # Simulate network delay or heavy computation
        data = {"message": "Hello from API!", "timestamp": time.time()}
        await redis.setex(cache_key, 60, str(data)) # Cache for 60 seconds
        return {"source": "api", "data": data}

```