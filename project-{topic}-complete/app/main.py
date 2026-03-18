```python
import logging.config

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_limiter import FastAPILimiter
from redis import asyncio as aioredis # type: ignore

from app.api.v1 import api_router
from app.core.config import LOGGING_CONFIG, settings
from app.core.exceptions import (
    BadRequestException,
    DuplicateEntryException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
)
from app.db.base import Base # Import Base for SQLAlchemy metadata
from app.db.session import engine # Import engine for database connection


# Configure logging as defined in config.py
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)


def custom_generate_unique_id(route: APIRoute) -> str:
    """
    Generates unique operation IDs for OpenAPI (Swagger UI).
    Helps prevent conflicts for routes with the same path but different methods.
    """
    return f"{route.tags[0]}-{route.name}"


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version=settings.PROJECT_VERSION,
    description="Data Visualization Tools System API",
    generate_unique_id_function=custom_generate_unique_id,
)

# --- CORS Middleware ---
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# --- Exception Handlers ---
@app.exception_handler(UnauthorizedException)
async def unauthorized_exception_handler(request: Request, exc: UnauthorizedException):
    logger.warning(f"Unauthorized access: {exc.detail} for {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": "UNAUTHORIZED"},
        headers=exc.headers,
    )

@app.exception_handler(ForbiddenException)
async def forbidden_exception_handler(request: Request, exc: ForbiddenException):
    logger.warning(f"Forbidden access: {exc.detail} for {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": "FORBIDDEN"},
    )

@app.exception_handler(NotFoundException)
async def not_found_exception_handler(request: Request, exc: NotFoundException):
    logger.info(f"Resource not found: {exc.detail} for {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": "NOT_FOUND"},
    )

@app.exception_handler(DuplicateEntryException)
async def duplicate_entry_exception_handler(request: Request, exc: DuplicateEntryException):
    logger.warning(f"Duplicate entry attempt: {exc.detail} for {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": "DUPLICATE_ENTRY"},
    )

@app.exception_handler(BadRequestException)
async def bad_request_exception_handler(request: Request, exc: BadRequestException):
    logger.error(f"Bad Request: {exc.detail} for {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": "BAD_REQUEST"},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception during request to {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "code": "INTERNAL_SERVER_ERROR"},
    )


# --- Startup and Shutdown Events ---
@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up...")
    # Initialize Redis for caching and rate limiting
    try:
        redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
        await FastAPILimiter.init(redis)
        logger.info("Redis initialized for caching and rate limiting.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        # Depending on criticality, you might want to raise an exception or run without cache/rate limit
        # For production, this should ideally be fatal or trigger alerts.

    # Ensure database connection is tested if needed, and initial data seeded
    # We use Alembic for migrations, so no need for Base.metadata.create_all here
    # Check app/db/init_db.py for seeding logic, typically run *after* migrations.


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down...")
    # Close any open connections, etc.
    if engine:
        await engine.dispose()
        logger.info("Database engine disposed.")


# --- Include API Routers ---
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", summary="Root endpoint for health check")
async def root():
    """Root endpoint to check if the API is running."""
    return {"message": f"{settings.PROJECT_NAME} API is running!"}
```