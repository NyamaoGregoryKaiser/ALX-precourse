```python
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis

from app.core.config import settings
from app.core.exceptions import CustomException, custom_exception_handler
from app.core.middlewares import RequestLoggerMiddleware
from app.core.logger import setup_logging
from app.api.v1.api import api_router

# Setup logging before FastAPI app creation
setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events for the FastAPI application.
    """
    logger.info("Application startup...")

    # Initialize Redis for caching and rate limiting
    try:
        redis_client = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=settings.REDIS_DB)
        FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache")
        await FastAPILimiter.init(redis_client)
        logger.info("Redis for caching and rate limiting initialized.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        # Depending on criticality, you might want to raise an exception or
        # let the app start without caching/rate limiting.
        # For this example, we'll log and continue.

    yield  # The application will run here

    logger.info("Application shutdown...")
    # Close Redis connections if necessary (FastAPI-Cache and FastAPI-Limiter handle this implicitly)


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    version="1.0.0",
    description="A comprehensive Personal Finance Tracker API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
    docs_url=f"{settings.API_V1_STR}/docs" if settings.DEBUG else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS Middleware
# Adjust allowed_origins in a production environment for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Request Logger Middleware
app.add_middleware(RequestLoggerMiddleware)

# Custom Exception Handler
app.add_exception_handler(CustomException, custom_exception_handler)

# Include API routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", summary="Root API endpoint", tags=["Root"])
async def root():
    """
    Root endpoint to check if the API is running.
    """
    return {"message": "Welcome to the Personal Finance Tracker API! Visit /v1/docs for API documentation."}

if __name__ == "__main__":
    import uvicorn
    # This is for local development without Docker compose,
    # and assumes Redis and DB are running elsewhere or mocked.
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

```