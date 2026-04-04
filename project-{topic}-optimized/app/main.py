import time
from typing import Any
import json

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from redis.asyncio import Redis
from fastapi_limiter import FastAPILimiter

from app.api.v1 import auth, users, projects, tasks
from app.core.config import settings
from app.core.caching import connect_redis, disconnect_redis, get_redis_client
from app.db.session import engine
from app.db.base_class import Base # Ensure all models are imported implicitly by this
from app.core.errors import NotFoundException, ForbiddenException, UnauthorizedException, DuplicateEntryException, BadRequestException


def custom_generate_unique_id(route: APIRoute) -> str:
    """Generates unique IDs for API routes, used in OpenAPI docs."""
    return f"{route.tags[0]}-{route.name}"


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

# Set up logging
logger.add("logs/app.log", rotation="10 MB", level=settings.LOG_LEVEL)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting up application...")
    # Connect to Redis
    await connect_redis()

    # Initialize rate limiter with Redis
    if get_redis_client():
        redis_conn: Redis = get_redis_client()
        await FastAPILimiter.init(redis_conn)
        logger.info("FastAPILimiter initialized.")
    else:
        logger.warning("Redis not connected, rate limiting will be disabled.")

    # Create all database tables (if not existing) - for development convenience.
    # In production, use Alembic migrations instead.
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)
    # logger.info("Database tables ensured.")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application...")
    # Disconnect from Redis
    await disconnect_redis()
    await engine.dispose() # Close SQLAlchemy engine connections


# Middleware for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production for specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware for request logging and timing
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(
        f"Request: {request.method} {request.url} | "
        f"Status: {response.status_code} | Time: {process_time:.4f}s"
    )
    return response

# Global error handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handles Pydantic validation errors."""
    detail = exc.errors()
    logger.error(f"Validation Error for {request.url}: {json.dumps(detail)}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": detail},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handles custom and built-in HTTP exceptions."""
    logger.warning(f"HTTP Exception at {request.url} - Status: {exc.status_code}, Detail: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Handles all other unhandled exceptions."""
    logger.exception(f"Unhandled exception at {request.url}: {exc}") # Logs traceback
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred."},
    )


# API routes
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["Projects"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}/tasks", tags=["Tasks"])

# Health check endpoint
@app.get("/health", response_model=dict, tags=["Monitoring"])
async def health_check():
    """Returns a simple health status."""
    return {"status": "ok", "message": "Service is running"}
```