```python
"""
Main entry point for the ALX-Shop FastAPI application.

This file sets up the FastAPI application instance, includes all API routes,
configures global exception handlers, middleware, caching, and rate limiting.
It also manages startup and shutdown events for database connections, Redis, etc.
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import database_engine, close_db_connection
from app.core.exceptions import CustomException, custom_exception_handler
from app.core.middlewares import LoggingMiddleware
from app.core.logging_config import setup_logging
from app.api.v1 import auth, products, users, orders
from app.core.rate_limiter import setup_rate_limiter, limiter
from app.core.security import get_current_active_user
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis


# Initialize logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events for the application.

    - On startup:
        - Logs application start.
        - Initializes the rate limiter.
        - Connects to Redis for caching.
        - Sets up database connection (though SQLAlchemy engine handles pooling).
    - On shutdown:
        - Logs application shutdown.
        - Closes Redis connection.
        - Closes database connections.
    """
    logger.info("Application starting up...")

    # Initialize Rate Limiter
    await setup_rate_limiter()
    logger.info("Rate limiter initialized.")

    # Initialize Redis for caching
    try:
        redis = aioredis.from_url(
            settings.REDIS_URI,
            encoding="utf8",
            decode_responses=True
        )
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
        logger.info(f"FastAPI Cache initialized with Redis at {settings.REDIS_URI}")
    except Exception as e:
        logger.error(f"Failed to connect to Redis for caching: {e}")
        # Optionally, raise the exception or fallback to no caching

    # Database connection - SQLAlchemy engine manages connection pool
    # No explicit `connect()` call needed here, but good to ensure engine is set up
    logger.info(f"Database engine initialized for {settings.DATABASE_URL.split('@')[-1]}")

    yield  # Application runs here

    logger.info("Application shutting down...")
    # Close Redis connection if it was opened
    if FastAPICache.get_backend():
        await FastAPICache.get_backend().close()
        logger.info("FastAPI Cache Redis backend closed.")

    # Close database connections
    await close_db_connection(database_engine)
    logger.info("Database connection pool closed.")


# Create the FastAPI application instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="An enterprise-grade e-commerce backend with DevOps automation.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan, # Attach the lifespan context manager
)

# Apply rate limiting middleware globally
app.state.limiter = limiter
app.add_exception_handler(StarletteHTTPException, limiter.http_exception_handler)


# Add custom middlewares
app.add_middleware(LoggingMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS] if settings.BACKEND_CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom exception handlers
app.add_exception_handler(CustomException, custom_exception_handler)
app.add_exception_handler(RequestValidationError, custom_exception_handler)
app.add_exception_handler(StarletteHTTPException, custom_exception_handler)


# Include API routers
# All API endpoints are prefixed with /api/v1
app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1", tags=["Users"])
app.include_router(products.router, prefix="/api/v1", tags=["Products"])
app.include_router(orders.router, prefix="/api/v1", tags=["Orders"])


@app.get("/api/v1/healthcheck", summary="Health Check", description="Checks the health of the API.")
async def healthcheck():
    """
    Endpoint to check the health status of the API.
    Returns a simple success message if the application is running.
    """
    logger.info("Health check endpoint accessed.")
    return {"status": "ok", "message": "ALX-Shop API is running!"}

@app.get("/api/v1/protected-test", summary="Protected Test Endpoint", description="A test endpoint requiring authentication.")
async def protected_test(current_user: dict = Depends(get_current_active_user)):
    """
    A simple endpoint to demonstrate authentication and authorization.
    Only authenticated and active users can access this.
    """
    logger.info(f"Protected test endpoint accessed by user: {current_user['email']}")
    return {"message": f"Welcome, {current_user['email']}! You are authenticated."}

```