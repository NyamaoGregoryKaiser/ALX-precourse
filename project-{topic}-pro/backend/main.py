```python
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis

from app.api.v1 import auth, users, teams, projects, tasks, comments
from app.database import engine, Base, get_db
from app.middleware.error_handler import custom_exception_handler
from app.utils.logging import get_logger
from app.utils.caching import invalidate_cache_for_pattern
from config import settings

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Context manager for application startup and shutdown events.
    Handles database initialization, caching, and rate limiting.
    """
    logger.info("Application startup begins...")

    # Database initialization (ensure tables are created if not using Alembic for initial setup)
    # In a production setup, Alembic migrations handle table creation.
    # This is useful for quick local testing/development without migrations.
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)
    # logger.info("Database tables ensured.")

    # Initialize Redis for caching and rate limiting
    try:
        redis_connection = redis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
        FastAPICache.init(RedisBackend(redis_connection), prefix="fastapi-cache")
        await FastAPILimiter.init(redis_connection)
        logger.info("Redis for caching and rate limiting initialized.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        # Depending on criticality, you might want to raise an exception or run without caching/rate limiting
        # For production, this should be critical.
        raise RuntimeError("Failed to connect to Redis for caching/rate limiting") from e

    logger.info("Application startup complete.")
    yield
    logger.info("Application shutdown begins...")
    # Clean up resources if necessary
    await FastAPILimiter.close()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title="Enterprise Task Management System API",
    description="API for managing users, teams, projects, and tasks.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Error Handling Middleware
app.add_exception_handler(HTTPException, custom_exception_handler)

# Request Logging Middleware (optional, can be integrated with more advanced APM)
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"Request: {request.method} {request.url} - Status: {response.status_code} - Time: {process_time:.4f}s")
    return response

# Include API routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(teams.router, prefix="/api/v1/teams", tags=["Teams"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(comments.router, prefix="/api/v1/comments", tags=["Comments"])

@app.get("/api/v1/healthcheck", summary="Health Check", description="Checks the health of the API.")
async def healthcheck():
    """
    API health check endpoint.
    """
    return {"status": "ok", "message": "API is running smoothly!"}

# Example of cache invalidation on relevant endpoints
# This could be handled by a service layer or explicit calls after mutations
@app.post("/api/v1/projects_and_invalidate_cache", summary="Create project and invalidate cache (example)")
async def create_project_and_invalidate_cache_example(
    project_create: projects.schemas.ProjectCreate,
    db_session: AsyncGenerator = Depends(get_db),
    current_user: users.models.User = Depends(users.dependencies.get_current_active_user)
):
    """
    Example endpoint to demonstrate cache invalidation after a create operation.
    """
    new_project = await projects.crud.create_project(db_session, project_create, current_user.id)
    # Invalidate cache for all project listings and potentially specific project details
    await invalidate_cache_for_pattern("fastapi-cache:/api/v1/projects*")
    return new_project
```